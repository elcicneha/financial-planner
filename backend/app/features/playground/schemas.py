"""Playground calculator schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class BreakCalculatorInput(BaseModel):
    """Input schema for Break Calculator."""

    # Basic Info
    current_age: int = Field(..., ge=0, le=120, description="Current age in years")
    start_break_in: int = Field(..., ge=0, le=50, description="Years until break starts")
    current_savings: float = Field(..., ge=0, description="Current savings amount")

    # Monthly figures
    monthly_savings: float = Field(..., ge=0, description="Monthly savings contribution")
    monthly_expense: float = Field(..., ge=0, description="Monthly expense during break")

    # Assumptions (annual percentages)
    return_rate_accumulation: float = Field(
        default=12.0,
        ge=0,
        le=100,
        description="Annual return rate during accumulation phase (%)"
    )
    return_rate_spending: float = Field(
        default=8.0,
        ge=0,
        le=100,
        description="Annual return rate during spending phase (%)"
    )
    expense_increase_rate: float = Field(
        default=5.0,
        ge=0,
        le=100,
        description="Annual expense increase rate (%)"
    )

    # Calculation method options
    use_effective_rate: bool = Field(
        default=True,
        description="Use effective rate conversion (True) or nominal (False)"
    )
    invest_at_month_end: bool = Field(
        default=False,
        description="Invest at month end (True) or month start (False)"
    )


class BreakCalculatorOutput(BaseModel):
    """Output schema for Break Calculator."""

    current_amount: float = Field(..., description="Current savings amount")
    amount_at_break: float = Field(..., description="Projected amount when break starts")
    age_at_break: float = Field(..., description="Age when break starts")
    corpus_runs_out_age: float = Field(..., description="Age when corpus depletes (1 decimal)")
    remaining_amount: float = Field(..., description="Amount remaining when corpus can't cover full month")


class CalculatorListItem(BaseModel):
    """Schema for calculator metadata in list endpoint."""

    name: str = Field(..., description="Unique calculator identifier")
    description: str = Field(..., description="Human-readable description")


class CalculatorExecuteRequest(BaseModel):
    """Generic calculator execution request."""

    calculator_name: str = Field(..., description="Name of the calculator to execute")
    params: dict = Field(..., description="Calculator-specific parameters")


class CalculatorExecuteResponse(BaseModel):
    """Generic calculator execution response."""

    calculator_name: str = Field(..., description="Name of the executed calculator")
    result: dict = Field(..., description="Calculator-specific result")
