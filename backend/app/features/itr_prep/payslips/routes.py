"""API routes for payslip management."""

from fastapi import APIRouter, UploadFile, File, Depends
from typing import List

from .schemas import PayslipUploadResponse, PayslipsListResponse
from .service import PayslipService
from app.dependencies import get_payslip_service


router = APIRouter()


@router.post("/upload-payslips", response_model=PayslipUploadResponse)
async def upload_payslips(
    files: List[UploadFile] = File(...),
    service: PayslipService = Depends(get_payslip_service)
):
    """
    Upload multiple payslip PDF files and extract salary data from each.

    Returns per-file results with extracted data including:
    - Gross pay
    - Salary breakdown (basic, allowances, etc.)
    - Pay period (month/year)
    - Company name
    - TDS (Tax Deducted at Source)
    """
    return await service.process_uploads(files)


@router.get("/payslips", response_model=PayslipsListResponse)
async def get_payslips(
    service: PayslipService = Depends(get_payslip_service)
):
    """
    Retrieve all saved payslips with their extracted data.

    Returns list of payslip records sorted by pay period (newest first).
    """
    payslips = service.get_all_payslips()
    return PayslipsListResponse(payslips=payslips)


@router.delete("/payslips/{payslip_id}")
async def delete_payslip(
    payslip_id: str,
    service: PayslipService = Depends(get_payslip_service)
):
    """
    Delete a specific payslip by ID.

    Removes the data record.
    """
    return service.delete_payslip(payslip_id)


@router.delete("/payslips")
async def delete_all_payslips(
    service: PayslipService = Depends(get_payslip_service)
):
    """
    Delete all payslips.

    Clears all payslip data records.
    """
    return service.delete_all_payslips()
