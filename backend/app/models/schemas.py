from pydantic import BaseModel
from typing import List


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
