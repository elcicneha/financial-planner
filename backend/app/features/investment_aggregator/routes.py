from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List
import asyncio
import logging

from .schemas import UploadResponse, ProcessingResult, FileInfo, AvailableFinancialYear
from .service import PDFTransactionService
from app.dependencies import get_pdf_transaction_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Investment Aggregator"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """
    Upload and process a PDF mutual fund statement.

    The PDF is processed through a 5-step extraction pipeline:
    1. Convert PDF to text
    2. Extract fund details and transaction dates
    3. Process dates data
    4. Clean fund details using ISIN database
    5. Combine into final transaction JSON

    Returns the file ID and output path for the processed data.
    """
    return await service.process_upload(file)


@router.get("/results/{file_id}", response_model=ProcessingResult)
async def get_results(
    file_id: str,
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """Retrieve processing results for a given file ID."""
    return service.get_results(file_id)


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """Download the processed transaction JSON file."""
    file_path = service.get_download_path(file_id)
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/json"
    )


@router.get("/files")
async def list_files(
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """List all processed transaction files."""
    return service.list_files()


@router.get("/available-financial-years")
async def get_available_financial_years():
    """
    Get list of all unique financial years from FIFO gains data.

    NOTE: This endpoint uses FIFO calculator which will be refactored in Phase 4.
    This endpoint may be moved to capital_gains feature in a future phase.

    Returns:
        List of financial year strings sorted in descending order (e.g., ["2024-25", "2023-24"])
    """
    try:
        # Import here to avoid circular dependency (will be fixed in Phase 4)
        from app.services.fifo_calculator import get_cached_gains

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
