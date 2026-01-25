"""
API Routes for the Financial Planner application.

Handles PDF upload, transaction extraction, and capital gains calculations.
"""

import asyncio
import json
import logging
import re
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile, Body
from fastapi.responses import FileResponse

from app.config import (
    BASE_DIR,
    UPLOADS_DIR,
    OUTPUTS_DIR,
    CAS_DIR,
    FILE_ID_LENGTH,
    ensure_directories,
)
from app.models.schemas import (
    ProcessingResult,
    UploadResponse,
    FIFOResponse,
    FIFOGainRow,
    FIFOSummary,
    CASCapitalGains,
    CASUploadResponse,
    CASFileInfo,
    CASFilesResponse,
    FundTypeOverrideRequest,
)
from app.services.pdf_extractor import extract_transactions
from app.services.fifo_calculator import (
    get_cached_gains,
    save_fund_type_override,
    invalidate_fifo_cache,
    recalculate_and_cache_fifo,
)
from app.services.cas_parser import (
    CASParserError,
    infer_financial_year_from_cas,
    load_and_parse_cas,
    validate_cas_json,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and special characters.

    Args:
        filename: Original filename from upload.

    Returns:
        Sanitized filename safe for filesystem use.
    """
    from pathlib import Path
    filename = Path(filename).name
    sanitized = re.sub(r'[^\w\-.]', '_', filename)
    if not sanitized.lower().endswith('.pdf'):
        sanitized = sanitized + '.pdf'
    return sanitized


def cleanup_upload(upload_folder) -> None:
    """
    Remove upload folder and its contents after processing.

    Args:
        upload_folder: Path to the upload folder to clean up.
    """
    try:
        if upload_folder.exists():
            shutil.rmtree(upload_folder)
            logger.info(f"Cleaned up upload folder: {upload_folder}")
    except Exception as e:
        logger.warning(f"Failed to cleanup upload folder {upload_folder}: {e}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and process it to extract mutual fund transactions.

    The uploaded PDF is processed to extract transactions, saved as JSON,
    and then the original PDF is cleaned up.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    ensure_directories()

    file_id = str(uuid.uuid4())[:FILE_ID_LENGTH]
    date_folder = datetime.now().strftime("%Y-%m-%d")

    upload_folder = UPLOADS_DIR / date_folder
    output_folder = OUTPUTS_DIR / date_folder
    upload_folder.mkdir(parents=True, exist_ok=True)
    output_folder.mkdir(parents=True, exist_ok=True)

    safe_filename = sanitize_filename(file.filename)
    pdf_filename = f"{file_id}_{safe_filename}"
    pdf_path = upload_folder / pdf_filename

    contents = await file.read()
    with open(pdf_path, "wb") as f:
        f.write(contents)

    try:
        output_path = await asyncio.to_thread(
            extract_transactions, pdf_path, output_folder, file_id
        )

        # Clean up the upload folder after successful processing
        cleanup_upload(upload_folder)

        return UploadResponse(
            success=True,
            message="File uploaded and processed successfully",
            file_id=file_id,
            output_path=str(output_path.relative_to(BASE_DIR)),
        )
    except Exception as e:
        logger.error(f"Failed to process PDF: {e}")
        # Clean up on failure too
        cleanup_upload(upload_folder)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@router.get("/results/{file_id}", response_model=ProcessingResult)
async def get_results(file_id: str):
    """Retrieve processing results for a given file ID."""
    if not OUTPUTS_DIR.exists():
        raise HTTPException(status_code=404, detail=f"Results not found for file_id: {file_id}")

    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir() and date_folder.name != 'fifo_cache':
            for json_file in date_folder.glob(f"transactions_{file_id}.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    return ProcessingResult(
                        file_id=file_id,
                        output_path=str(json_file.relative_to(BASE_DIR)),
                        transactions=data.get("transactions", []),
                    )
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in {json_file}: {e}")
                    raise HTTPException(status_code=500, detail="Failed to read transaction data")

    raise HTTPException(status_code=404, detail=f"Results not found for file_id: {file_id}")


@router.get("/download/{file_id}")
async def download_file(file_id: str):
    """Download the processed transaction file."""
    if not OUTPUTS_DIR.exists():
        raise HTTPException(status_code=404, detail=f"File not found for file_id: {file_id}")

    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir() and date_folder.name != 'fifo_cache':
            for json_file in date_folder.glob(f"transactions_{file_id}.json"):
                return FileResponse(
                    path=json_file,
                    filename=f"transactions_{file_id}.json",
                    media_type="application/json",
                )

    raise HTTPException(status_code=404, detail=f"File not found for file_id: {file_id}")


@router.get("/files")
async def list_files():
    """List all processed transaction files."""
    files = []

    if OUTPUTS_DIR.exists():
        for date_folder in sorted(OUTPUTS_DIR.iterdir(), reverse=True):
            if date_folder.is_dir() and date_folder.name != 'fifo_cache':
                for json_file in date_folder.glob("transactions_*.json"):
                    file_id = json_file.stem.replace("transactions_", "")
                    files.append({
                        "file_id": file_id,
                        "date": date_folder.name,
                        "path": str(json_file.relative_to(BASE_DIR)),
                    })

    return {"files": files}


@router.get("/available-financial-years")
async def get_available_financial_years():
    """
    Get list of all unique financial years from FIFO gains data.

    Returns:
        List of financial year strings sorted in descending order (e.g., ["2024-25", "2023-24"])
    """
    try:
        gains_data = await asyncio.to_thread(get_cached_gains)

        if not gains_data:
            return {"financial_years": []}

        # Extract unique financial years from gains
        fys = set()
        for g in gains_data:
            fys.add(g['financial_year'])

        sorted_fys = sorted(fys, reverse=True)
        return {"financial_years": sorted_fys}

    except Exception as e:
        logger.error(f"Failed to get financial years: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get financial years: {str(e)}"
        )


@router.get("/capital-gains", response_model=FIFOResponse)
async def get_capital_gains(fy: str = None):
    """
    Get FIFO capital gains calculations.

    Args:
        fy: Optional financial year filter in format "2024-25"

    Checks if cached results are valid, recalculates if needed,
    and returns all realized capital gains with summary statistics.
    """
    try:
        gains_data = await asyncio.to_thread(get_cached_gains)

        if not gains_data:
            return FIFOResponse(
                gains=[],
                summary=FIFOSummary(
                    total_stcg=0.0,
                    total_ltcg=0.0,
                    total_gains=0.0,
                    total_transactions=0,
                    date_range="N/A"
                )
            )

        try:
            # Try to parse cached data with current schema
            gains = [FIFOGainRow(**g) for g in gains_data]
        except Exception as validation_error:
            # If validation fails (e.g., schema mismatch), invalidate cache and recalculate
            logger.warning(f"Cache schema mismatch, recalculating: {validation_error}")
            await asyncio.to_thread(invalidate_fifo_cache)
            fresh_gains = await asyncio.to_thread(recalculate_and_cache_fifo)
            gains_data = [g.to_dict() for g in fresh_gains]
            gains = [FIFOGainRow(**g) for g in gains_data]

        # Filter by financial year if specified
        if fy:
            gains = [g for g in gains if g.financial_year == fy]

        total_stcg = sum(g.gain for g in gains if g.term == "Short-term")
        total_ltcg = sum(g.gain for g in gains if g.term == "Long-term")
        total_gains = sum(g.gain for g in gains)

        if gains:
            dates = sorted([g.sell_date for g in gains])
            date_range = f"{dates[0]} to {dates[-1]}"
        else:
            date_range = "N/A"

        summary = FIFOSummary(
            total_stcg=round(total_stcg, 2),
            total_ltcg=round(total_ltcg, 2),
            total_gains=round(total_gains, 2),
            total_transactions=len(gains),
            date_range=date_range
        )

        return FIFOResponse(gains=gains, summary=summary)

    except Exception as e:
        logger.error(f"Failed to calculate capital gains: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate capital gains: {str(e)}"
        )


@router.put("/fund-type-override")
async def update_fund_type_override(request: FundTypeOverrideRequest = Body(...)):
    """
    Update manual fund type override for a ticker.

    Allows users to manually classify a fund as 'equity' or 'debt',
    overriding the automatic classification. The override persists
    and invalidates the FIFO cache.
    """
    try:
        await asyncio.to_thread(save_fund_type_override, request.ticker, request.fund_type)

        return {
            "success": True,
            "message": f"Fund type updated for {request.ticker}",
            "ticker": request.ticker,
            "fund_type": request.fund_type
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update fund type override: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update fund type override: {str(e)}"
        )


@router.post("/upload-cas", response_model=CASUploadResponse)
async def upload_cas_json(file: UploadFile = File(...)):
    """
    Upload a CAS (Capital Account Statement) JSON file.

    The financial year is automatically inferred from transaction dates.
    If a file already exists for that FY, it will be replaced.
    """
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")

    ensure_directories()

    contents = await file.read()
    try:
        cas_data = json.loads(contents)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")

    try:
        validate_cas_json(cas_data)
    except CASParserError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        financial_year = infer_financial_year_from_cas(cas_data)
    except CASParserError as e:
        raise HTTPException(status_code=400, detail=f"Could not determine financial year: {str(e)}")

    cas_filename = f"FY{financial_year}.json"
    cas_path = CAS_DIR / cas_filename

    with open(cas_path, "w", encoding="utf-8") as f:
        json.dump(cas_data, f, indent=2)

    return CASUploadResponse(
        success=True,
        message=f"CAS file uploaded successfully for FY {financial_year}",
        financial_year=financial_year,
        file_path=str(cas_path.relative_to(BASE_DIR))
    )


@router.get("/cas-files", response_model=CASFilesResponse)
async def list_cas_files():
    """List all uploaded CAS files with metadata."""
    files = []

    if CAS_DIR.exists():
        for cas_file in sorted(CAS_DIR.glob("FY*.json"), reverse=True):
            fy = cas_file.stem.replace("FY", "")
            stat = cas_file.stat()

            files.append(
                CASFileInfo(
                    financial_year=fy,
                    file_path=str(cas_file.relative_to(BASE_DIR)),
                    upload_date=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    file_size=stat.st_size
                )
            )

    return CASFilesResponse(files=files)


@router.get("/capital-gains-cas", response_model=CASCapitalGains)
async def get_capital_gains_cas(fy: str = None):
    """
    Get CAS (Capital Account Statement) capital gains data.

    Args:
        fy: Financial year in format "2024-25" (optional, defaults to latest)

    Returns structured data with 4 categories:
    - Equity Short-term
    - Equity Long-term
    - Debt Short-term
    - Debt Long-term
    """
    try:
        return await asyncio.to_thread(load_and_parse_cas, fy)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CASParserError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to retrieve CAS capital gains: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve CAS capital gains: {str(e)}"
        )
