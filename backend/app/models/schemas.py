from pydantic import BaseModel
from typing import List, Literal


class UploadResponse(BaseModel):
    success: bool
    message: str
    file_id: str
    pdf_path: str
    csv_path: str


class ProcessingResult(BaseModel):
    file_id: str
    csv_path: str
    content: str


class FIFOGainRow(BaseModel):
    """Represents a single FIFO capital gain calculation"""
    sell_date: str
    ticker: str
    folio: str
    units: float
    sell_nav: float
    sale_consideration: float  # Proceeds (ITR terminology)
    buy_date: str
    buy_nav: float
    acquisition_cost: float  # Cost Basis (ITR terminology)
    gain: float
    holding_days: int
    fund_type: Literal['equity', 'debt', 'unknown']  # Fund classification
    term: str  # "Short-term" or "Long-term"


class FIFOSummary(BaseModel):
    """Summary statistics for FIFO capital gains"""
    total_stcg: float  # Short-term capital gains
    total_ltcg: float  # Long-term capital gains
    total_gains: float
    total_transactions: int
    date_range: str  # e.g., "2022-10-04 to 2026-01-16"


class FIFOResponse(BaseModel):
    """Response containing FIFO gains and summary"""
    gains: List[FIFOGainRow]
    summary: FIFOSummary


class CASCategoryData(BaseModel):
    """Capital gains data for a single category"""
    sale_consideration: float
    acquisition_cost: float
    gain_loss: float


class CASCapitalGains(BaseModel):
    """CAS statement capital gains organized by category"""
    equity_short_term: CASCategoryData
    equity_long_term: CASCategoryData
    debt_short_term: CASCategoryData
    debt_long_term: CASCategoryData


class CASUploadResponse(BaseModel):
    """Response for CAS JSON upload"""
    success: bool
    message: str
    financial_year: str  # e.g., "2024-25"
    file_path: str


class CASFileInfo(BaseModel):
    """Information about an uploaded CAS file"""
    financial_year: str  # e.g., "2024-25"
    file_path: str
    upload_date: str  # ISO format
    file_size: int  # bytes


class CASFilesResponse(BaseModel):
    """List of available CAS files"""
    files: List[CASFileInfo]
