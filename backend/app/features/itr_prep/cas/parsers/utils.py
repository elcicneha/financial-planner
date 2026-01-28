"""
Shared utility functions for CAS parsing.

Contains date parsing, number parsing, and transaction deduplication utilities.
"""

from datetime import datetime
from typing import Optional, Any, Dict, List
import pandas as pd


def parse_date(value) -> Optional[datetime]:
    """
    Try to parse a value as a date.

    Args:
        value: Cell value to parse.

    Returns:
        datetime object if successful, None otherwise.
    """
    if pd.isna(value):
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        for fmt in ["%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d"]:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

    return None


def parse_number(value) -> float:
    """Parse a value as a number, returning 0.0 if not possible."""
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            # Remove commas and parse
            return float(value.replace(',', ''))
        except ValueError:
            return 0.0
    return 0.0


def transaction_key(txn: Dict[str, Any]) -> str:
    """
    Generate a unique key for a transaction for deduplication.
    Based on fund name, folio, sell date, and units.
    """
    return f"{txn.get('fund_name', '')}|{txn.get('folio', '')}|{txn.get('sell_date', '')}|{txn.get('units', 0)}"


def recalculate_summary_from_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Recalculate summary values from deduplicated transactions.

    Args:
        transactions: List of transaction dictionaries with asset_type, term, and gain_loss

    Returns:
        Summary dictionary with 4 categories (equity/debt × short/long term)
    """
    summary = {
        'equity_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'equity_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'debt_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'debt_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
    }

    for txn in transactions:
        asset_type = txn.get('asset_type', 'UNKNOWN').upper()
        term = txn.get('term', 'unknown').lower()

        # Skip if we can't categorize
        if asset_type not in ['EQUITY', 'DEBT'] or term not in ['short', 'long']:
            continue

        # Determine category key
        category_key = f"{asset_type.lower()}_{term}_term"

        # Add values to appropriate category
        summary[category_key]['sale_consideration'] += txn.get('sale_consideration', 0.0)
        summary[category_key]['acquisition_cost'] += txn.get('acquisition_cost', 0.0)
        summary[category_key]['gain_loss'] += txn.get('gain_loss', 0.0)

    return summary


def infer_financial_year(excel_file: pd.ExcelFile, transaction_sheet_name: str) -> str:
    """
    Infer financial year from Excel redemption dates.

    Financial year in India runs from April 1 to March 31.
    Each transaction row has two dates (purchase and redemption).
    The chronologically later date is the redemption date.

    Args:
        excel_file: Opened pandas ExcelFile object.
        transaction_sheet_name: Name of the transaction details sheet.

    Returns:
        FY in format "2025-26"

    Raises:
        ValueError: If financial year cannot be determined.
    """
    if transaction_sheet_name not in excel_file.sheet_names:
        raise ValueError(f"Transaction sheet '{transaction_sheet_name}' not found")

    # Read transaction sheet
    df = pd.read_excel(excel_file, sheet_name=transaction_sheet_name, header=None)

    # Find the first row with multiple dates and use the later one (redemption date)
    for row_idx in range(len(df)):
        row = df.iloc[row_idx]
        dates_in_row = []

        # Extract all dates from this row
        for cell_value in row:
            date_obj = parse_date(cell_value)
            if date_obj:
                dates_in_row.append(date_obj)

        # If we found at least 2 dates, the later one is the redemption date
        if len(dates_in_row) >= 2:
            redemption_date = max(dates_in_row)

            # Determine FY based on the redemption date (FY starts on April 1)
            if redemption_date.month >= 4:  # Apr to Dec
                fy_start_year = redemption_date.year
                fy_end_year = redemption_date.year + 1
            else:  # Jan to Mar
                fy_start_year = redemption_date.year - 1
                fy_end_year = redemption_date.year

            return f"{fy_start_year}-{str(fy_end_year)[-2:]}"

    raise ValueError("Could not find row with purchase and redemption dates")
