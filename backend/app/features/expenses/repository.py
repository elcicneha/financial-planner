"""Repository for expense data persistence."""

from pathlib import Path
import json
from typing import List, Dict, Any


class FileExpenseRepository:
    """File-based repository for expense data."""

    def __init__(self, data_file: Path):
        """
        Initialize repository with data file path.

        Args:
            data_file: Path to the JSON file for storing expenses
        """
        self.data_file = data_file

    def get_all_expenses(self) -> List[Dict[str, Any]]:
        """
        Get all saved expenses.

        Returns:
            List of expense records
        """
        if self.data_file.exists():
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                return data.get("expenses", [])
        return []

    def save_expenses(self, expenses: List[Dict[str, Any]]) -> None:
        """
        Save expenses to file.

        Args:
            expenses: List of expense records to save
        """
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_file, 'w') as f:
            json.dump({"expenses": expenses}, f, indent=2)

    def add_expense(self, expense: Dict[str, Any]) -> None:
        """
        Add a new expense.

        Args:
            expense: Expense record to add
        """
        expenses = self.get_all_expenses()
        expenses.append(expense)
        self.save_expenses(expenses)

    def update_expense(self, expense_id: str, updated_data: Dict[str, Any]) -> bool:
        """
        Update an existing expense.

        Args:
            expense_id: ID of the expense to update
            updated_data: New data for the expense

        Returns:
            True if expense was found and updated, False otherwise
        """
        expenses = self.get_all_expenses()
        for i, expense in enumerate(expenses):
            if expense.get("id") == expense_id:
                # Update only provided fields
                expenses[i].update(updated_data)
                self.save_expenses(expenses)
                return True
        return False

    def delete_expense(self, expense_id: str) -> bool:
        """
        Delete an expense by ID.

        Args:
            expense_id: ID of the expense to delete

        Returns:
            True if expense was found and deleted, False otherwise
        """
        expenses = self.get_all_expenses()
        original_length = len(expenses)
        expenses = [e for e in expenses if e.get("id") != expense_id]

        if len(expenses) < original_length:
            self.save_expenses(expenses)
            return True
        return False

    def delete_all_expenses(self) -> None:
        """Delete all expenses."""
        self.save_expenses([])
