"""Dependency injection configuration for FastAPI.

This module provides factory functions for creating service instances
with their dependencies. Uses FastAPI's Depends() for injection.
"""

from functools import lru_cache
from fastapi import Depends
from pathlib import Path
from app.config import UPLOADS_DIR, OUTPUTS_DIR, BASE_DIR


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


# Placeholder for future dependencies:
# - Phase 3: Payslips dependencies
# - Phase 4: Capital gains dependencies
# - Phase 5: CAS dependencies
# - Phase 6: Playground dependencies
