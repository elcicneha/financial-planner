"""
Pydantic schemas for capital gains API.

Request and response models for FIFO capital gains endpoints.
"""

from typing import List, Literal
from pydantic import BaseModel, Field


class FundTypeOverrideRequest(BaseModel):
    """Request to override fund type classification for a single fund."""
    ticker: str = Field(..., min_length=1, max_length=100, description="Fund ticker symbol")
    fund_type: Literal['equity', 'debt'] = Field(..., description="Fund classification")


class FundTypeOverridesBatchRequest(BaseModel):
    """Request to override fund type classification for multiple funds."""
    overrides: dict = Field(..., description="Dictionary mapping ticker symbols to fund types (equity/debt)")


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
