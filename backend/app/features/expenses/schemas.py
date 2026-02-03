"""Schemas for expense management."""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class SplitDetails(BaseModel):
    """Details for split expenses."""
    user: float = Field(0, description="User's personal portion")
    flatmate: float = Field(0, description="Flatmate's personal portion")
    shared: float = Field(0, description="Shared portion (split 50/50)")


class ExpenseCreate(BaseModel):
    """Schema for creating a new expense."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    amount: float = Field(..., gt=0, description="Expense amount (must be positive)")
    amount_formula: Optional[str] = Field(None, description="Formula used to calculate amount")
    note: str = Field(..., description="Note or description of expense")
    category: str = Field(..., description="Expense category")
    paid_by: Literal["user", "flatmate"] = Field("user", description="Who paid for the expense")
    split_type: Literal["personal", "shared", "mix"] = Field("personal", description="How expense is split")
    splits: SplitDetails = Field(..., description="Split breakdown (user/flatmate/shared portions)")


class ExpenseUpdate(BaseModel):
    """Schema for updating an existing expense."""
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")
    amount: Optional[float] = Field(None, gt=0, description="Expense amount (must be positive)")
    amount_formula: Optional[str] = Field(None, description="Formula used to calculate amount")
    note: Optional[str] = Field(None, description="Note or description of expense")
    category: Optional[str] = Field(None, description="Expense category")
    paid_by: Optional[Literal["user", "flatmate"]] = Field(None, description="Who paid for the expense")
    split_type: Optional[Literal["personal", "shared", "mix"]] = Field(None, description="How expense is split")
    splits: Optional[SplitDetails] = Field(None, description="Split breakdown (user/flatmate/shared portions)")


class Expense(BaseModel):
    """Schema for an expense record."""
    id: str
    date: str
    amount: float
    amount_formula: Optional[str] = None
    note: str
    category: str
    paid_by: str = "user"
    split_type: Literal["personal", "shared", "mix"] = "personal"
    splits: SplitDetails


class ExpensesListResponse(BaseModel):
    """Response schema for listing all expenses."""
    expenses: List[Expense]


class DeleteResponse(BaseModel):
    """Response schema for delete operations."""
    message: str
    id: Optional[str] = None
