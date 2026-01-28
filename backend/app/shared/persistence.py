"""Repository interfaces for data persistence abstraction."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class IRepository(ABC):
    """Base repository interface."""
    pass


class ICapitalGainsRepository(IRepository):
    """Interface for capital gains data access."""

    @abstractmethod
    def load_transactions(self) -> List[Any]:
        """Load all transactions from storage."""
        pass

    @abstractmethod
    def load_fund_type_overrides(self) -> Dict[str, str]:
        """Load manual fund type overrides."""
        pass

    @abstractmethod
    def save_fund_type_override(self, ticker: str, fund_type: str) -> None:
        """Save a single fund type override."""
        pass

    @abstractmethod
    def save_fund_type_overrides_batch(self, overrides: Dict[str, str]) -> None:
        """Save multiple fund type overrides atomically."""
        pass

    @abstractmethod
    def load_cached_gains(self) -> List[Dict[str, Any]]:
        """Load cached capital gains."""
        pass

    @abstractmethod
    def save_cached_gains(self, gains: List[Any]) -> None:
        """Save capital gains to cache."""
        pass

    @abstractmethod
    def get_last_updated(self) -> str:
        """Get the most recent modification date of transaction files."""
        pass


class ICASRepository(IRepository):
    """Interface for CAS data access."""

    @abstractmethod
    def get_cas_data(self, financial_year: str) -> Optional[Dict[str, Any]]:
        """Load CAS data for a financial year."""
        pass

    @abstractmethod
    def save_cas_data(self, financial_year: str, data: Dict[str, Any]) -> None:
        """Save CAS data for a financial year."""
        pass

    @abstractmethod
    def list_cas_files(self) -> List[Dict[str, Any]]:
        """List all CAS files."""
        pass


class IPayslipRepository(IRepository):
    """Interface for payslip data access."""

    @abstractmethod
    def get_all_payslips(self) -> List[Dict[str, Any]]:
        """Get all saved payslips."""
        pass

    @abstractmethod
    def save_payslips(self, payslips: List[Dict[str, Any]]) -> None:
        """Save payslips."""
        pass

    @abstractmethod
    def delete_payslip(self, payslip_id: str) -> None:
        """Delete a payslip by ID."""
        pass

    @abstractmethod
    def delete_all_payslips(self) -> None:
        """Delete all payslips."""
        pass


class ITransactionRepository(IRepository):
    """Interface for transaction (PDF extraction) data access."""

    @abstractmethod
    def save_upload(self, file_data: bytes, file_id: str, filename: str) -> str:
        """Save uploaded PDF file and return path."""
        pass

    @abstractmethod
    def get_upload_path(self, file_id: str) -> Optional[str]:
        """Get path to uploaded file."""
        pass

    @abstractmethod
    def cleanup_upload(self, file_path: str) -> None:
        """Delete uploaded PDF after processing."""
        pass

    @abstractmethod
    def save_results(self, file_id: str, results: Dict[str, Any]) -> None:
        """Save processing results."""
        pass

    @abstractmethod
    def get_results(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get processing results."""
        pass

    @abstractmethod
    def list_all_files(self) -> List[Dict[str, Any]]:
        """List all processed files."""
        pass
