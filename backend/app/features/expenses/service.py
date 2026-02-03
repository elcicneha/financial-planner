"""Service for expense management."""

from fastapi import HTTPException
from typing import List
import uuid

from .repository import FileExpenseRepository
from .schemas import Expense, ExpenseCreate, ExpenseUpdate, SplitDetails


class ExpenseService:
    """Service for expense management."""

    def __init__(self, repository: FileExpenseRepository):
        """
        Initialize expense service.

        Args:
            repository: Repository for expense data persistence
        """
        self.repo = repository

    def get_all_expenses(self) -> List[Expense]:
        """
        Get all saved expenses.

        Returns:
            List of Expense records sorted by date (newest first)
        """
        data = self.repo.get_all_expenses()

        # Handle backward compatibility: add default values for old expenses
        expenses = []
        for e in data:
            if "splits" not in e:
                # Old expense: treat as personal expense
                e["splits"] = {
                    "user": e["amount"],
                    "flatmate": 0,
                    "shared": 0
                }
            if "paid_by" not in e:
                e["paid_by"] = "user"
            if "split_type" not in e:
                # Infer split_type from splits
                splits = e["splits"]
                if splits.get("shared", 0) > 0 and (splits.get("user", 0) > 0 or splits.get("flatmate", 0) > 0):
                    e["split_type"] = "mix"
                elif splits.get("shared", 0) > 0:
                    e["split_type"] = "shared"
                else:
                    e["split_type"] = "personal"

            expenses.append(Expense(**e))

        # Sort by date (newest first)
        expenses.sort(key=lambda e: e.date, reverse=True)

        return expenses

    def create_expense(self, expense_data: ExpenseCreate) -> Expense:
        """
        Create a new expense.

        Args:
            expense_data: Data for the new expense

        Returns:
            Created Expense record

        Raises:
            HTTPException: If split validation fails
        """
        # Validate splits sum to total amount
        splits_total = (
            expense_data.splits.user +
            expense_data.splits.flatmate +
            expense_data.splits.shared
        )

        # Allow small floating point tolerance
        if abs(splits_total - expense_data.amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Split total ({splits_total}) must equal expense amount ({expense_data.amount})"
            )

        expense_id = str(uuid.uuid4())
        expense = Expense(
            id=expense_id,
            date=expense_data.date,
            amount=expense_data.amount,
            amount_formula=expense_data.amount_formula,
            note=expense_data.note,
            category=expense_data.category,
            paid_by=expense_data.paid_by,
            split_type=expense_data.split_type,
            splits=expense_data.splits,
        )

        self.repo.add_expense(expense.model_dump())
        return expense

    def update_expense(self, expense_id: str, update_data: ExpenseUpdate) -> Expense:
        """
        Update an existing expense.

        Args:
            expense_id: ID of the expense to update
            update_data: Updated expense data

        Returns:
            Updated Expense record

        Raises:
            HTTPException: If expense not found
        """
        # Get current expense
        all_expenses = self.repo.get_all_expenses()
        current_expense = next((e for e in all_expenses if e.get("id") == expense_id), None)

        if not current_expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Prepare update dict (only non-None fields)
        update_dict = {
            k: v for k, v in update_data.model_dump().items()
            if v is not None
        }

        # Update the expense
        success = self.repo.update_expense(expense_id, update_dict)

        if not success:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Get and return updated expense
        all_expenses = self.repo.get_all_expenses()
        updated_expense = next((e for e in all_expenses if e.get("id") == expense_id), None)

        return Expense(**updated_expense)

    def delete_expense(self, expense_id: str) -> dict:
        """
        Delete a specific expense.

        Args:
            expense_id: ID of the expense to delete

        Returns:
            Success message dict

        Raises:
            HTTPException: If expense not found
        """
        success = self.repo.delete_expense(expense_id)

        if not success:
            raise HTTPException(status_code=404, detail="Expense not found")

        return {"message": "Expense deleted successfully", "id": expense_id}

    def delete_all_expenses(self) -> dict:
        """
        Delete all expenses.

        Returns:
            Success message dict
        """
        self.repo.delete_all_expenses()
        return {"message": "All expenses deleted successfully"}
