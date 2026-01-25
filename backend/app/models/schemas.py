from pydantic import BaseModel, Field
from typing import List, Literal


class UploadResponse(BaseModel):
    success: bool
    message: str
    file_id: str
    output_path: str


class ProcessingResult(BaseModel):
    file_id: str
    output_path: str
    transactions: List[dict]


class TransactionData(BaseModel):
    """Individual transaction record."""
    date: str
    ticker: str
    folio: str
    isin: str
    amount: str
    nav: str
    units: str
    balance: str
    fund_name: str = ""


class TransactionsFile(BaseModel):
    """Transaction file structure."""
    file_id: str
    created_at: str
    transactions: List[TransactionData]


class FundTypeOverrideRequest(BaseModel):
    """Request to override fund type classification."""
    ticker: str = Field(..., min_length=1, max_length=100, description="Fund ticker symbol")
    fund_type: Literal['equity', 'debt'] = Field(..., description="Fund classification")


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
    financial_year: str  # e.g., "2024-25"


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
    last_updated: str  # ISO format timestamp


class CASCategoryData(BaseModel):
    """Capital gains data for a single category"""
    sale_consideration: float
    acquisition_cost: float
    gain_loss: float


class CASTransaction(BaseModel):
    """Individual transaction from CAS statement"""
    fund_name: str
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


class CASUploadResponse(BaseModel):
    """Response for CAS file upload"""
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
