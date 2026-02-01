"""Schemas for expense management."""

from pydantic import BaseModel, Field
from typing import List, Optional


class ExpenseCreate(BaseModel):
    """Schema for creating a new expense."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    amount: float = Field(..., gt=0, description="Expense amount (must be positive)")
    amount_formula: Optional[str] = Field(None, description="Formula used to calculate amount")
    note: str = Field(..., description="Note or description of expense")
    category: str = Field(..., description="Expense category")


class ExpenseUpdate(BaseModel):
    """Schema for updating an existing expense."""
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")
    amount: Optional[float] = Field(None, gt=0, description="Expense amount (must be positive)")
    amount_formula: Optional[str] = Field(None, description="Formula used to calculate amount")
    note: Optional[str] = Field(None, description="Note or description of expense")
    category: Optional[str] = Field(None, description="Expense category")


class Expense(BaseModel):
    """Schema for an expense record."""
    id: str
    date: str
    amount: float
    amount_formula: Optional[str] = None
    note: str
    category: str


class ExpensesListResponse(BaseModel):
    """Response schema for listing all expenses."""
    expenses: List[Expense]


class DeleteResponse(BaseModel):
    """Response schema for delete operations."""
    message: str
    id: Optional[str] = None
