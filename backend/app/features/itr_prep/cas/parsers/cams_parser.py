"""
CAMS format CAS parser.

Handles parsing of CAMS .xls format with specific sheet names and column mappings.
"""

import logging
from typing import Dict, List, Tuple, Any
import pandas as pd

from .base import BaseCAParser
from .utils import parse_date, parse_number

logger = logging.getLogger(__name__)


class CAMSParser(BaseCAParser):
    """Parser for CAMS CAS format (.xls files)."""

    def get_summary_sheet_names(self) -> Tuple[str, str]:
        """Get CAMS summary sheet names."""
        return "OVERALL_SUMMARY_EQUITY", "OVERALL_SUMMARY_NONEQUITY"

    def get_transaction_sheet_name(self) -> str:
        """Get CAMS transaction sheet name."""
        return "TRXN_DETAILS"

    def parse_transactions(self) -> List[Dict[str, Any]]:
        """
        Parse transactions from CAMS TRXN_DETAILS sheet.

        CAMS-specific:
        - Asset type is directly available in a column
        - Sale consideration = units * redemption_price
        - Different column positions than KFINTECH
        """
        txn_sheet = self.get_transaction_sheet_name()

        if txn_sheet not in self.excel_file.sheet_names:
            logger.warning(f"Transaction sheet '{txn_sheet}' not found")
            return []

        df = pd.read_excel(self.excel_file, sheet_name=txn_sheet, header=None)
        transactions = []

        # Find header row
        header_row_idx = None
        for idx, row in df.iterrows():
            row_str = ' '.join(str(v) for v in row if pd.notna(v)).lower()
            if 'scheme' in row_str and 'folio' in row_str:
                header_row_idx = idx
                break

        if header_row_idx is None:
            logger.warning("Could not find header row in transaction sheet")
            return []

        # Parse column indices from header
        header = df.iloc[header_row_idx]
        col_indices = {}
        short_term_col = None
        long_term_col = None

        for col_idx, val in enumerate(header):
            if pd.isna(val):
                continue
            val_lower = str(val).lower().strip()

            # Basic fields
            if 'scheme' in val_lower and 'name' in val_lower:
                col_indices['fund_name'] = col_idx
            elif 'folio' in val_lower:
                col_indices['folio'] = col_idx
            elif 'asset' in val_lower and 'class' in val_lower:
                col_indices['asset_type'] = col_idx

            # Date fields (CAMS-specific positions)
            elif val_lower in ['date', 'date '] and 8 <= col_idx <= 10:
                col_indices['sell_date'] = col_idx
            elif 'date_1' in val_lower or (val_lower == 'date' and col_idx >= 14):
                col_indices['buy_date'] = col_idx

            # Units and amounts
            elif 'units' in val_lower and 10 <= col_idx <= 12:
                col_indices['units'] = col_idx
            elif 'redunits' in val_lower:
                col_indices['units'] = col_idx
            # For CAMS, we calculate sale_consideration = units * price
            elif val_lower == 'price' and 10 <= col_idx <= 13:
                col_indices['redemption_price'] = col_idx
            elif 'unit cost' in val_lower:
                col_indices['acquisition_cost_per_unit'] = col_idx

            # Gain/Loss columns
            if 'short term' in val_lower:
                short_term_col = col_idx
            elif 'long term without index' in val_lower:
                long_term_col = col_idx

        # Parse data rows
        for idx in range(header_row_idx + 1, len(df)):
            row = df.iloc[idx]

            # Skip empty rows or summary rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            first_cell = str(row.iloc[0]).lower()
            if 'total' in first_cell or 'grand' in first_cell:
                continue

            txn = {}

            # Parse basic fields
            for field, col_idx in col_indices.items():
                val = row.iloc[col_idx] if col_idx < len(row) else None

                if field in ['buy_date', 'sell_date']:
                    date_val = parse_date(val)
                    txn[field] = date_val.strftime('%Y-%m-%d') if date_val else ''
                elif field in ['units', 'acquisition_cost_per_unit', 'redemption_price']:
                    txn[field] = parse_number(val)
                elif field == 'asset_type':
                    # Extract and normalize asset type
                    asset_val = str(val).strip().upper() if pd.notna(val) else 'UNKNOWN'
                    # Map CASH to DEBT
                    if asset_val == 'CASH':
                        asset_val = 'DEBT'
                    txn['asset_type'] = asset_val
                else:
                    txn[field] = str(val).strip() if pd.notna(val) else ''

            # Calculate sale_consideration from units * redemption_price
            if 'units' in txn and 'redemption_price' in txn:
                txn['sale_consideration'] = txn['units'] * txn['redemption_price']
                # Remove redemption_price from final output
                del txn['redemption_price']

            # Determine term and gain_loss from short/long term columns
            short_term_gain = parse_number(row.iloc[short_term_col]) if short_term_col and short_term_col < len(row) else 0.0
            long_term_gain = parse_number(row.iloc[long_term_col]) if long_term_col and long_term_col < len(row) else 0.0

            # Only include transactions with actual gains/losses
            if short_term_gain == 0.0 and long_term_gain == 0.0:
                continue

            # Set term and gain_loss based on which is non-zero
            if short_term_gain != 0.0:
                txn['term'] = 'short'
                txn['gain_loss'] = short_term_gain
            else:
                txn['term'] = 'long'
                txn['gain_loss'] = long_term_gain

            # Calculate acquisition cost if we have units and cost per unit
            if 'acquisition_cost_per_unit' in txn and 'units' in txn:
                txn['acquisition_cost'] = txn['acquisition_cost_per_unit'] * txn['units']

            # Skip if missing critical fields
            if not txn.get('sell_date') or not txn.get('fund_name'):
                continue

            transactions.append(txn)

        return transactions

    def determine_asset_types(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        For CAMS, asset types are already in the data (no need to infer).

        Args:
            transactions: List of transactions

        Returns:
            Same transactions list (no changes needed for CAMS)
        """
        # CAMS has asset_type directly in the transaction sheet
        return transactions
