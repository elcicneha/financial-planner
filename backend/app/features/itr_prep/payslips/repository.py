"""Repository for payslip data persistence."""

from pathlib import Path
import json
from typing import List, Dict, Any
from app.shared.persistence import IPayslipRepository


class FilePayslipRepository(IPayslipRepository):
    """File-based repository for payslip data."""

    def __init__(self, data_file: Path):
        """
        Initialize repository with data file path.

        Args:
            data_file: Path to the JSON file for storing payslips
        """
        self.data_file = data_file

    def get_all_payslips(self) -> List[Dict[str, Any]]:
        """
        Get all saved payslips.

        Returns:
            List of payslip records
        """
        if self.data_file.exists():
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                return data.get("payslips", [])
        return []

    def save_payslips(self, payslips: List[Dict[str, Any]]) -> None:
        """
        Save payslips to file.

        Args:
            payslips: List of payslip records to save
        """
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_file, 'w') as f:
            json.dump({"payslips": payslips}, f, indent=2)

    def delete_payslip(self, payslip_id: str) -> None:
        """
        Delete a payslip by ID.

        Args:
            payslip_id: ID of the payslip to delete
        """
        payslips = self.get_all_payslips()
        payslips = [p for p in payslips if p.get("id") != payslip_id]
        self.save_payslips(payslips)

    def delete_all_payslips(self) -> None:
        """Delete all payslips."""
        self.save_payslips([])
