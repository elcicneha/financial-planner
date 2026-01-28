"""Pydantic schemas for payslip data."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class PayslipBreakdown(BaseModel):
    """Salary breakdown components"""
    monthly: Optional[Dict[str, Any]] = None  # e.g., {"basic": 50000, "house_rent_allowance": 25000}
    annual: Optional[Dict[str, Any]] = None


class PayslipPayPeriod(BaseModel):
    """Pay period information"""
    month: int
    year: int
    period_key: str  # e.g., "2024-01"


class PayslipData(BaseModel):
    """Data extracted from a single payslip PDF"""
    gross_pay: Optional[float] = None
    breakdown: Optional[PayslipBreakdown] = None
    pay_period: Optional[PayslipPayPeriod] = None
    company_name: Optional[str] = None
    tds: Optional[float] = None  # Tax Deducted at Source


class PayslipFileResult(BaseModel):
    """Result for a single payslip file in batch upload"""
    filename: str
    success: bool
    payslip: Optional[PayslipData] = None
    error: Optional[str] = None


class PayslipUploadResponse(BaseModel):
    """Response for payslip upload (batch)"""
    results: List[PayslipFileResult]


class PayslipRecord(BaseModel):
    """A persisted payslip record with metadata"""
    id: str  # Unique identifier (UUID)
    filename: str  # Original filename
    upload_date: str  # ISO timestamp
    payslip_data: PayslipData  # Extracted data


class PayslipsListResponse(BaseModel):
    """Response for listing all saved payslips"""
    payslips: List[PayslipRecord]
