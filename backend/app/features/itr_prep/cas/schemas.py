"""
CAS (Capital Account Statement) data models.
"""

from typing import List
from pydantic import BaseModel


class CASCategoryData(BaseModel):
    """Capital gains data for a single category"""
    sale_consideration: float
    acquisition_cost: float
    gain_loss: float


class CASTransaction(BaseModel):
    """Individual transaction from CAS statement"""
    fund_name: str
    asset_type: str  # "EQUITY" or "DEBT"
    term: str  # "short" or "long"
    folio: str
    buy_date: str
    sell_date: str
    units: float
    buy_nav: float
    sell_nav: float
    sale_consideration: float
    acquisition_cost: float
    gain_loss: float


class CASCapitalGains(BaseModel):
    """CAS statement capital gains organized by category"""
    equity_short_term: CASCategoryData
    equity_long_term: CASCategoryData
    debt_short_term: CASCategoryData
    debt_long_term: CASCategoryData
    transactions: List[CASTransaction] = []  # Raw transactions for source data view
    has_files: bool = True  # False when no CAS files uploaded yet
    last_updated: str  # ISO format timestamp


class CASFileResult(BaseModel):
    """Result for a single CAS file in batch upload"""
    filename: str
    success: bool
    financial_year: str | None = None
    password_required: bool = False
    error: str | None = None


class CASUploadResponse(BaseModel):
    """Response for CAS file upload (batch)"""
    results: list[CASFileResult]


class CASFileInfo(BaseModel):
    """Information about an uploaded CAS file"""
    financial_year: str  # e.g., "2024-25"
    file_path: str
    upload_date: str  # ISO format
    file_size: int  # bytes


class CASFilesResponse(BaseModel):
    """List of available CAS files"""
    files: List[CASFileInfo]
