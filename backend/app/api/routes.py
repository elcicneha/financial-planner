import asyncio
import json
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.models.schemas import (
    ProcessingResult,
    UploadResponse,
    FIFOResponse,
    FIFOGainRow,
    FIFOSummary,
    CASCapitalGains,
    CASCategoryData,
)
from app.services.pdf_extractor import extract_transactions
from app.services.fifo_calculator import get_cached_gains, save_fund_type_override

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
OUTPUTS_DIR = DATA_DIR / "outputs"


def ensure_directories():
    """Create data directories if they don't exist."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and special characters."""
    # Remove path components
    filename = Path(filename).name
    # Remove special characters, keep only alphanumeric, dash, underscore, dot
    sanitized = re.sub(r'[^\w\-.]', '_', filename)
    # Ensure it ends with .pdf
    if not sanitized.lower().endswith('.pdf'):
        sanitized = sanitized + '.pdf'
    return sanitized


@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and process it to extract mutual fund transactions."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    ensure_directories()

    # Generate unique ID for this upload
    file_id = str(uuid.uuid4())[:8]
    date_folder = datetime.now().strftime("%Y-%m-%d")

    # Create date-based subdirectories
    upload_folder = UPLOADS_DIR / date_folder
    output_folder = OUTPUTS_DIR / date_folder
    upload_folder.mkdir(parents=True, exist_ok=True)
    output_folder.mkdir(parents=True, exist_ok=True)

    # Save uploaded PDF with sanitized filename
    safe_filename = sanitize_filename(file.filename)
    pdf_filename = f"{file_id}_{safe_filename}"
    pdf_path = upload_folder / pdf_filename

    contents = await file.read()
    with open(pdf_path, "wb") as f:
        f.write(contents)

    # Process PDF in thread pool to avoid blocking event loop
    try:
        csv_path = await asyncio.to_thread(
            extract_transactions, pdf_path, output_folder, file_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    return UploadResponse(
        success=True,
        message="File uploaded successfully",
        file_id=file_id,
        pdf_path=str(pdf_path.relative_to(BASE_DIR)),
        csv_path=str(csv_path.relative_to(BASE_DIR)),
    )


@router.get("/results/{file_id}", response_model=ProcessingResult)
async def get_results(file_id: str):
    """Retrieve processing results for a given file ID."""
    # Search for the CSV file across date folders
    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir():
            for csv_file in date_folder.glob(f"transactions_{file_id}.csv"):
                # Read CSV content
                with open(csv_file, "r") as f:
                    content = f.read()

                return ProcessingResult(
                    file_id=file_id,
                    csv_path=str(csv_file.relative_to(BASE_DIR)),
                    content=content,
                )

    raise HTTPException(status_code=404, detail=f"Results not found for file_id: {file_id}")


@router.get("/download/{file_id}")
async def download_csv(file_id: str):
    """Download the processed CSV file."""
    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir():
            for csv_file in date_folder.glob(f"transactions_{file_id}.csv"):
                return FileResponse(
                    path=csv_file,
                    filename=f"transactions_{file_id}.csv",
                    media_type="text/csv",
                )

    raise HTTPException(status_code=404, detail=f"CSV not found for file_id: {file_id}")


@router.get("/files")
async def list_files():
    """List all processed CSV files."""
    files = []

    if OUTPUTS_DIR.exists():
        for date_folder in sorted(OUTPUTS_DIR.iterdir(), reverse=True):
            if date_folder.is_dir():
                for csv_file in date_folder.glob("transactions_*.csv"):
                    file_id = csv_file.stem.replace("transactions_", "")
                    files.append({
                        "file_id": file_id,
                        "date": date_folder.name,
                        "csv_path": str(csv_file.relative_to(BASE_DIR)),
                    })

    return {"files": files}


@router.get("/capital-gains", response_model=FIFOResponse)
async def get_capital_gains():
    """
    Get FIFO capital gains calculations.

    This endpoint:
    1. Checks if cached results are valid
    2. If invalid: Recalculates FIFO gains from all transactions
    3. If valid: Returns cached results
    4. Returns all realized capital gains with summary statistics
    """
    try:
        # Get cached gains (will recalculate if cache is invalid)
        gains_data = await asyncio.to_thread(get_cached_gains)

        if not gains_data:
            # No transactions or gains yet
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

        # Convert to Pydantic models
        gains = [FIFOGainRow(**g) for g in gains_data]

        # Calculate summary statistics
        total_stcg = sum(g.gain for g in gains if g.term == "Short-term")
        total_ltcg = sum(g.gain for g in gains if g.term == "Long-term")
        total_gains = sum(g.gain for g in gains)

        # Get date range
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
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate capital gains: {str(e)}"
        )


@router.put("/fund-type-override")
async def update_fund_type_override(ticker: str, fund_type: str):
    """
    Update manual fund type override for a ticker.

    This allows users to manually classify a fund as 'equity' or 'debt',
    overriding the automatic classification. The override persists across
    FIFO recalculations and invalidates the FIFO cache.

    Args:
        ticker: Fund ticker symbol (e.g., "BAND_NIFT_50_1Y4SPBO")
        fund_type: Classification - must be 'equity' or 'debt'

    Returns:
        Success message with the updated classification
    """
    try:
        # Validate fund_type
        if fund_type not in ['equity', 'debt']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid fund_type: '{fund_type}'. Must be 'equity' or 'debt'"
            )

        # Save override (this also invalidates the FIFO cache)
        await asyncio.to_thread(save_fund_type_override, ticker, fund_type)

        return {
            "success": True,
            "message": f"Fund type updated for {ticker}",
            "ticker": ticker,
            "fund_type": fund_type
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update fund type override: {str(e)}"
        )


@router.get("/capital-gains-cas", response_model=CASCapitalGains)
async def get_capital_gains_cas():
    """
    Get CAS (Capital Account Statement) capital gains data.

    Reads the capital gain loss statement JSON file and extracts
    the 4 categories of capital gains:
    - Equity Short-term
    - Equity Long-term
    - Debt Short-term
    - Debt Long-term

    Returns structured data with sale consideration, acquisition cost,
    and gain/loss for each category.
    """
    try:
        # Path to the CAS JSON file
        cas_json_path = BASE_DIR / "backend" / "app" / "services" / "pdf_extractor" / "capital gain loss statement.json"

        if not cas_json_path.exists():
            raise HTTPException(
                status_code=404,
                detail="CAS capital gains JSON file not found"
            )

        # Read and parse JSON
        with open(cas_json_path, 'r') as f:
            cas_data = json.load(f)

        # Extract equity data from OVERALL_SUMMARY_EQUITY
        equity_summary = cas_data.get("OVERALL_SUMMARY_EQUITY", [])

        # Find equity short-term data
        equity_st_sale = 0.0
        equity_st_cost = 0.0
        equity_st_gain = 0.0

        equity_lt_sale = 0.0
        equity_lt_cost = 0.0
        equity_lt_gain = 0.0

        for row in equity_summary:
            summary_type = row.get("Summary Of Capital Gains", "")
            total_value = row.get("Total", 0.0)

            if summary_type == "Full Value Consideration":
                # This appears twice - once for ST, once for LT
                # We need to look at the context to determine which is which
                # The first occurrence is for ST (before "Short Term Capital Gain/Loss")
                # But simpler: we can track indices
                pass
            elif summary_type == "Short Term Capital Gain/Loss":
                equity_st_gain = total_value
            elif "LongTermWithOutIndex" in summary_type and "CapitalGain" in summary_type:
                equity_lt_gain = total_value

        # Parse equity summary by tracking occurrence counts
        # The pattern is: ST rows, then LT with index rows, then LT without index rows
        # Each section has: Fair Market Value (optional), Full Value Consideration, Cost of Acquisition, Gain/Loss

        fvc_count = 0  # Full Value Consideration counter
        coa_count = 0  # Cost of Acquisition counter

        for row in equity_summary:
            summary_type = row.get("Summary Of Capital Gains", "")
            total_value = row.get("Total", 0.0)

            if summary_type == "Full Value Consideration":
                fvc_count += 1
                if fvc_count == 1:  # First occurrence = Short-term
                    equity_st_sale = total_value
                elif fvc_count == 3:  # Third occurrence = Long-term without index
                    equity_lt_sale = total_value

            elif summary_type == "Cost of Acquisition":
                coa_count += 1
                if coa_count == 1:  # First occurrence = Short-term
                    equity_st_cost = total_value
                elif coa_count == 3:  # Third occurrence = Long-term without index
                    equity_lt_cost = total_value

            elif summary_type == "Short Term Capital Gain/Loss":
                equity_st_gain = total_value

            elif "LongTermWithOutIndex" in summary_type and "CapitalGain" in summary_type:
                equity_lt_gain = total_value

        # Extract debt (non-equity) data from OVERALL_SUMMARY_NONEQUITY
        debt_summary = cas_data.get("OVERALL_SUMMARY_NONEQUITY", [])

        debt_st_sale = 0.0
        debt_st_cost = 0.0
        debt_st_gain = 0.0

        debt_lt_sale = 0.0
        debt_lt_cost = 0.0
        debt_lt_gain = 0.0

        # Parse debt summary by tracking occurrence counts
        # Same pattern as equity: ST rows, then LT with index rows, then LT without index rows
        fvc_count = 0  # Full Value Consideration counter
        coa_count = 0  # Cost of Acquisition counter

        for row in debt_summary:
            summary_type = row.get("Summary Of Capital Gains", "")
            total_value = row.get("Total", 0.0)

            if summary_type == "Full Value Consideration":
                fvc_count += 1
                if fvc_count == 1:  # First occurrence = Short-term
                    debt_st_sale = total_value
                elif fvc_count == 3:  # Third occurrence = Long-term without index
                    debt_lt_sale = total_value

            elif summary_type == "Cost of Acquisition":
                coa_count += 1
                if coa_count == 1:  # First occurrence = Short-term
                    debt_st_cost = total_value
                elif coa_count == 3:  # Third occurrence = Long-term without index
                    debt_lt_cost = total_value

            elif summary_type == "Short Term Capital Gain/Loss":
                debt_st_gain = total_value

            elif "LongTermWithOutIndex" in summary_type and "CapitalGain" in summary_type:
                debt_lt_gain = total_value

        # Build response
        return CASCapitalGains(
            equity_short_term=CASCategoryData(
                sale_consideration=equity_st_sale,
                acquisition_cost=equity_st_cost,
                gain_loss=equity_st_gain
            ),
            equity_long_term=CASCategoryData(
                sale_consideration=equity_lt_sale,
                acquisition_cost=equity_lt_cost,
                gain_loss=equity_lt_gain
            ),
            debt_short_term=CASCategoryData(
                sale_consideration=debt_st_sale,
                acquisition_cost=debt_st_cost,
                gain_loss=debt_st_gain
            ),
            debt_long_term=CASCategoryData(
                sale_consideration=debt_lt_sale,
                acquisition_cost=debt_lt_cost,
                gain_loss=debt_lt_gain
            )
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="CAS capital gains JSON file not found"
        )
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse CAS JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve CAS capital gains: {str(e)}"
        )
