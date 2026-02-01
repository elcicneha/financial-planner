"""API routes for expense management."""

from fastapi import APIRouter, Depends

from .schemas import (
    Expense,
    ExpenseCreate,
    ExpenseUpdate,
    ExpensesListResponse,
    DeleteResponse,
)
from .service import ExpenseService
from app.dependencies import get_expense_service


router = APIRouter()


@router.get("/expenses", response_model=ExpensesListResponse)
async def get_expenses(
    service: ExpenseService = Depends(get_expense_service)
):
    """
    Retrieve all saved expenses.

    Returns list of expense records sorted by date (newest first).
    """
    expenses = service.get_all_expenses()
    return ExpensesListResponse(expenses=expenses)


@router.post("/expenses", response_model=Expense)
async def create_expense(
    expense: ExpenseCreate,
    service: ExpenseService = Depends(get_expense_service)
):
    """
    Create a new expense.

    Returns the created expense record.
    """
    return service.create_expense(expense)


@router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    expense: ExpenseUpdate,
    service: ExpenseService = Depends(get_expense_service)
):
    """
    Update an existing expense.

    Returns the updated expense record.
    """
    return service.update_expense(expense_id, expense)


@router.delete("/expenses/{expense_id}", response_model=DeleteResponse)
async def delete_expense(
    expense_id: str,
    service: ExpenseService = Depends(get_expense_service)
):
    """
    Delete a specific expense by ID.

    Removes the expense record.
    """
    return service.delete_expense(expense_id)


@router.delete("/expenses", response_model=DeleteResponse)
async def delete_all_expenses(
    service: ExpenseService = Depends(get_expense_service)
):
    """
    Delete all expenses.

    Clears all expense records.
    """
    return service.delete_all_expenses()
