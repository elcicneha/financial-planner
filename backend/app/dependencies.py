"""Dependency injection configuration for FastAPI.

This module provides factory functions for creating service instances
with their dependencies. Uses FastAPI's Depends() for injection.
"""

from functools import lru_cache
from fastapi import Depends
from pathlib import Path
from app.config import UPLOADS_DIR, OUTPUTS_DIR, BASE_DIR, PAYSLIPS_DATA_FILE, EXPENSES_DATA_FILE, FILE_ID_LENGTH


# Investment Aggregator Dependencies
@lru_cache()
def get_pdf_transaction_repository():
    """Get PDF transaction repository instance."""
    from app.features.investment_aggregator.repository import FileTransactionRepository
    return FileTransactionRepository(
        uploads_dir=Path(UPLOADS_DIR),
        outputs_dir=Path(OUTPUTS_DIR),
        base_dir=Path(BASE_DIR)
    )


def get_pdf_transaction_service(
    repo=Depends(get_pdf_transaction_repository)
):
    """Get PDF transaction service instance."""
    from app.features.investment_aggregator.service import PDFTransactionService
    return PDFTransactionService(repository=repo)


# Payslip Dependencies
@lru_cache()
def get_payslip_repository():
    """Get payslip repository instance."""
    from app.features.itr_prep.payslips.repository import FilePayslipRepository
    return FilePayslipRepository(data_file=Path(PAYSLIPS_DATA_FILE))


def get_payslip_service(
    repo=Depends(get_payslip_repository)
):
    """Get payslip service instance."""
    from app.features.itr_prep.payslips.service import PayslipService
    return PayslipService(
        repository=repo,
        uploads_dir=Path(UPLOADS_DIR),
        file_id_length=FILE_ID_LENGTH
    )


# Capital Gains Dependencies
@lru_cache()
def get_capital_gains_repository():
    """Get capital gains repository instance."""
    from app.features.itr_prep.capital_gains.repository import FileCapitalGainsRepository
    return FileCapitalGainsRepository()


def get_capital_gains_service(
    repo=Depends(get_capital_gains_repository)
):
    """Get capital gains service instance."""
    from app.features.itr_prep.capital_gains.service import CapitalGainsService
    return CapitalGainsService(repository=repo)


# CAS Dependencies
@lru_cache()
def get_cas_repository():
    """Get CAS repository instance."""
    from app.features.itr_prep.cas.repository import FileCASRepository
    return FileCASRepository()


def get_cas_service(
    repo=Depends(get_cas_repository)
):
    """Get CAS service instance."""
    from app.features.itr_prep.cas.service import CASService
    return CASService(repository=repo)


# Expense Dependencies
@lru_cache()
def get_expense_repository():
    """Get expense repository instance."""
    from app.features.expenses.repository import FileExpenseRepository
    return FileExpenseRepository(data_file=Path(EXPENSES_DATA_FILE))


def get_expense_service(
    repo=Depends(get_expense_repository)
):
    """Get expense service instance."""
    from app.features.expenses.service import ExpenseService
    return ExpenseService(repository=repo)


# Placeholder for future dependencies:
# - Phase 6: Playground dependencies
