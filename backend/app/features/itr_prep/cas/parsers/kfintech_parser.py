"""
KFINTECH format CAS parser.

Handles parsing of KFINTECH .xlsx format with specific sheet names and column mappings.
Asset types must be inferred from Scheme_Level_Summary sheet.
"""

import logging
from typing import Dict, List, Tuple, Any
import pandas as pd

from .base import BaseCAParser
from .utils import parse_date, parse_number

logger = logging.getLogger(__name__)


class KFINTECHParser(BaseCAParser):
    """Parser for KFINTECH CAS format (.xlsx files)."""

    def get_summary_sheet_names(self) -> Tuple[str, str]:
        """Get KFINTECH summary sheet names."""
        return "Summary - Equity", "Summary - NonEquity"

    def get_transaction_sheet_name(self) -> str:
        """Get KFINTECH transaction sheet name (note the typo in original)."""
        return "Trasaction_Details"  # Note: KFINTECH has typo in sheet name

    def parse_transactions(self) -> List[Dict[str, Any]]:
        """
        Parse transactions from KFINTECH Trasaction_Details sheet.

        KFINTECH-specific:
        - Asset type is UNKNOWN initially (must be inferred later)
        - Sale consideration is directly available
        - Different column positions than CAMS
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

            # Basic fields (KFINTECH scheme name is at column 3)
            if col_idx == 3:
                col_indices['fund_name'] = col_idx
            elif 'folio' in val_lower:
                col_indices['folio'] = col_idx

            # Date fields (KFINTECH-specific positions)
            if val_lower == 'date' and col_idx >= 14:
                col_indices['sell_date'] = col_idx
            elif val_lower == 'date' and col_idx <= 6:
                col_indices['buy_date'] = col_idx

            # Units and amounts
            if 'units' in val_lower and col_idx >= 15 and col_idx <= 17:
                col_indices['units'] = col_idx
            elif 'amount' in val_lower and col_idx >= 16 and col_idx <= 18:
                col_indices['sale_consideration'] = col_idx
            # For KFINTECH, "Original Purchase Cost" is the per-unit cost (column 8)
            elif 'original purchase cost' in val_lower and 'amount' not in val_lower:
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
                elif field in ['units', 'sale_consideration', 'acquisition_cost_per_unit']:
                    txn[field] = parse_number(val)
                else:
                    txn[field] = str(val).strip() if pd.notna(val) else ''

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

            # For KFINTECH, asset type is UNKNOWN initially (will be determined later)
            txn['asset_type'] = 'UNKNOWN'

            # Skip if missing critical fields
            if not txn.get('sell_date') or not txn.get('fund_name'):
                continue

            transactions.append(txn)

        return transactions

    def determine_asset_types(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        For KFINTECH, determine asset types by checking Scheme_Level_Summary sheet.

        Args:
            transactions: List of transactions with UNKNOWN asset_type

        Returns:
            Updated transactions list with asset_type filled in
        """
        # Extract fund names from Scheme_Level_Summary sheet
        equity_funds = set()
        debt_funds = set()

        if "Scheme_Level_Summary" in self.excel_file.sheet_names:
            df = pd.read_excel(self.excel_file, sheet_name="Scheme_Level_Summary", header=None)

            current_section = None
            for idx, row in df.iterrows():
                first_col = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''

                # Detect section headers
                if 'capital gain' in first_col.lower() and 'equity' in first_col.lower():
                    current_section = 'EQUITY'
                    continue
                elif 'capital gain' in first_col.lower() and ('non' in first_col.lower() or 'debt' in first_col.lower()):
                    current_section = 'DEBT'
                    continue

                # Extract fund names from data rows
                if current_section and first_col and len(first_col) > 15:
                    # Skip header and summary rows
                    if any(keyword in first_col.lower() for keyword in
                           ['scheme name', 'total', 'grand', 'count']):
                        continue

                    # Add to appropriate set
                    if current_section == 'EQUITY':
                        equity_funds.add(first_col.lower())
                    elif current_section == 'DEBT':
                        debt_funds.add(first_col.lower())

        # Match transactions against fund lists using partial matching
        for txn in transactions:
            if txn.get('asset_type') == 'UNKNOWN':
                fund_name = txn.get('fund_name', '').strip().lower()

                # Try exact or partial match
                matched = False
                for ef in equity_funds:
                    # Remove ISIN codes and extra spaces for matching
                    ef_clean = ef.split('inf')[0].strip() if 'inf' in ef else ef
                    fund_clean = fund_name.split('inf')[0].strip() if 'inf' in fund_name else fund_name

                    if ef_clean in fund_clean or fund_clean in ef_clean:
                        txn['asset_type'] = 'EQUITY'
                        matched = True
                        break

                if not matched:
                    for df_name in debt_funds:
                        df_clean = df_name.split('inf')[0].strip() if 'inf' in df_name else df_name
                        fund_clean = fund_name.split('inf')[0].strip() if 'inf' in fund_name else fund_name

                        if df_clean in fund_clean or fund_clean in df_clean:
                            txn['asset_type'] = 'DEBT'
                            break

        return transactions
