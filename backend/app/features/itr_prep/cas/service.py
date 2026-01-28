"""
CAS Service - business logic for CAS parsing and capital gains calculation.

Orchestrates parsing, merging, and deduplication of CAS data.
"""

import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any
from pathlib import Path

from .repository import FileCASRepository
from .schemas import CASCapitalGains, CASCategoryData, CASTransaction
from .parsers import create_parser, open_excel_file
from .parsers.utils import transaction_key, recalculate_summary_from_transactions, infer_financial_year
from .exceptions import CASParserError

logger = logging.getLogger(__name__)


class CASService:
    """Service for CAS parsing and data management."""

    def __init__(self, repository: FileCASRepository):
        """
        Initialize service.

        Args:
            repository: CAS repository for data persistence.
        """
        self.repository = repository

    def parse_and_save_excel(
        self,
        file_content: bytes,
        password: Optional[str] = None
    ) -> Tuple[str, Path]:
        """
        Parse CAS Excel file, merge with existing data, and save as JSON.

        Args:
            file_content: Raw Excel file bytes.
            password: Password for decryption (if file is protected).

        Returns:
            Tuple of (financial_year, saved_json_path)

        Raises:
            PasswordRequiredError: If file is password-protected.
            CASParserError: If parsing fails.
        """
        # Open Excel file (handles password-protected files)
        excel_file = open_excel_file(file_content, password)

        # Create parser based on detected format
        parser = create_parser(excel_file)

        # Infer financial year
        txn_sheet = parser.get_transaction_sheet_name()
        try:
            financial_year = infer_financial_year(excel_file, txn_sheet)
        except ValueError as e:
            raise CASParserError(f"Failed to infer financial year: {e}")

        # Parse transactions and summaries
        transactions = parser.parse_transactions()
        transactions = parser.determine_asset_types(transactions)
        summary = parser.parse_all_summaries()

        new_data = {
            'transactions': transactions,
            'summary': summary,
            'updated_at': datetime.now().isoformat()
        }

        # Load existing data and merge (if exists)
        existing_data = self.repository.load(financial_year)
        if existing_data:
            logger.info(f"Merging with existing data for FY {financial_year}")
            merged_data = self._merge_cas_data(existing_data, new_data)
        else:
            # Even for first upload, recalculate summary from transactions
            recalculated_summary = recalculate_summary_from_transactions(transactions)
            merged_data = {
                'transactions': transactions,
                'summary': recalculated_summary,
                'updated_at': datetime.now().isoformat()
            }

        # Save as JSON
        json_path = self.repository.save(financial_year, merged_data)
        logger.info(f"Saved combined CAS data: {json_path} (FY: {financial_year})")

        return financial_year, json_path

    def _merge_cas_data(self, existing: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge new CAS data into existing data, removing duplicates.

        Transactions are deduplicated by key (fund+folio+date+units).
        Summary values are recalculated from deduplicated transactions.
        """
        # Merge transactions with deduplication
        existing_txns = {transaction_key(t): t for t in existing.get('transactions', [])}
        for txn in new.get('transactions', []):
            key = transaction_key(txn)
            existing_txns[key] = txn  # New overwrites duplicates

        merged_transactions = list(existing_txns.values())

        # Recalculate summary from deduplicated transactions
        merged_summary = recalculate_summary_from_transactions(merged_transactions)

        return {
            'transactions': merged_transactions,
            'summary': merged_summary,
            'updated_at': datetime.now().isoformat()
        }

    def get_capital_gains(self, fy: Optional[str] = None) -> CASCapitalGains:
        """
        Get CAS capital gains data for a financial year.

        Args:
            fy: Financial year (e.g., "2024-25"). If None, uses latest FY.

        Returns:
            CASCapitalGains data.

        Raises:
            FileNotFoundError: If no CAS data exists.
        """
        if fy:
            data = self.repository.load(fy)
            if not data:
                raise FileNotFoundError(f"CAS data not found for financial year {fy}")
        else:
            latest_fy = self.repository.get_latest_fy()
            if not latest_fy:
                raise FileNotFoundError("No CAS data found. Please upload a CAS Excel file.")
            data = self.repository.load(latest_fy)

        summary = data.get('summary', {})
        last_updated = data.get('updated_at', datetime.now().isoformat())

        # Parse transactions for source data view
        raw_transactions = data.get('transactions', [])
        transactions = []
        for txn in raw_transactions:
            transactions.append(CASTransaction(
                fund_name=txn.get('fund_name', ''),
                asset_type=txn.get('asset_type', 'UNKNOWN'),
                term=txn.get('term', 'unknown'),
                folio=txn.get('folio', ''),
                buy_date=txn.get('buy_date', ''),
                sell_date=txn.get('sell_date', ''),
                units=txn.get('units', 0.0),
                buy_nav=txn.get('buy_nav', 0.0),
                sell_nav=txn.get('sell_nav', 0.0),
                sale_consideration=txn.get('sale_consideration', 0.0),
                acquisition_cost=txn.get('acquisition_cost', 0.0),
                gain_loss=txn.get('gain_loss', 0.0),
            ))

        return CASCapitalGains(
            equity_short_term=CASCategoryData(**summary.get('equity_short_term', {})),
            equity_long_term=CASCategoryData(**summary.get('equity_long_term', {})),
            debt_short_term=CASCategoryData(**summary.get('debt_short_term', {})),
            debt_long_term=CASCategoryData(**summary.get('debt_long_term', {})),
            transactions=transactions,
            last_updated=last_updated
        )

    def get_empty_capital_gains(self) -> CASCapitalGains:
        """
        Return empty CAS capital gains with all zeros when no files uploaded.

        Returns:
            Empty CASCapitalGains data.
        """
        empty_category = CASCategoryData(sale_consideration=0, acquisition_cost=0, gain_loss=0)
        return CASCapitalGains(
            equity_short_term=empty_category,
            equity_long_term=empty_category,
            debt_short_term=empty_category,
            debt_long_term=empty_category,
            has_files=False,
            last_updated=datetime.now().isoformat(),
        )
