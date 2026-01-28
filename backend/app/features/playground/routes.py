"""Playground calculator routes."""

from typing import List
from fastapi import APIRouter, HTTPException

from app.shared.calculator_registry import list_calculators, get_calculator
from .schemas import (
    CalculatorListItem,
    CalculatorExecuteRequest,
    CalculatorExecuteResponse,
    BreakCalculatorInput,
    BreakCalculatorOutput,
)

# Import calculators to trigger registration
from . import calculators  # noqa: F401


router = APIRouter(prefix="/api/playground", tags=["Playground"])


@router.get("/calculators", response_model=List[CalculatorListItem])
async def get_available_calculators():
    """
    List all available playground calculators.

    Returns a list of calculator metadata for discovery by frontend/bots.
    Calculators are dynamically discovered via the @register_calculator decorator.
    """
    calculators_list = list_calculators()
    return calculators_list


@router.post("/calculate", response_model=CalculatorExecuteResponse)
async def execute_calculator(request: CalculatorExecuteRequest):
    """
    Execute a calculator by name with given parameters.

    This is a generic endpoint that works with any registered calculator.
    The frontend can discover available calculators via GET /calculators
    and then execute them via this endpoint.

    Args:
        request: Calculator name and parameters

    Returns:
        Calculator execution result

    Raises:
        HTTPException: If calculator not found or execution fails
    """
    try:
        calculator = get_calculator(request.calculator_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        result = calculator.calculate(**request.params)
        return CalculatorExecuteResponse(
            calculator_name=request.calculator_name,
            result=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Calculator execution failed: {str(e)}"
        )


@router.post("/break-calculator", response_model=BreakCalculatorOutput)
async def calculate_break(input_data: BreakCalculatorInput):
    """
    Calculate how long your savings will last during a career break.

    This is a convenience endpoint for the Break Calculator with typed inputs/outputs.
    Frontend can use this for better type safety, or use the generic /calculate endpoint.

    Phase 1 (Accumulation): Grows current savings with monthly contributions until break starts
    Phase 2 (Spending): Depletes corpus with monthly expenses (increasing yearly) until depletion

    Args:
        input_data: Break calculator input parameters

    Returns:
        Calculation results with corpus projections
    """
    try:
        calculator = get_calculator("break")
        result = calculator.calculate(**input_data.model_dump())
        return BreakCalculatorOutput(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Calculator execution failed: {str(e)}"
        )
