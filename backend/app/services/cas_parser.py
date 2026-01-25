"""
CAS (Capital Account Statement) Parser Service.

Extracts capital gains data from CAS Excel files (CAMS .xls or KFINTECH .xlsx).
Supports both password-protected and non-protected files.
Combines data from multiple uploads and removes duplicates.
"""

import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

import msoffcrypto
import pandas as pd

from app.config import CAS_DIR
from app.models.schemas import CASCapitalGains, CASCategoryData

logger = logging.getLogger(__name__)


class CASParserError(Exception):
    """Raised when CAS parsing fails."""
    pass


class PasswordRequiredError(Exception):
    """Raised when Excel file is password-protected."""
    pass


def _get_json_path(fy: str) -> Path:
    """Get the JSON file path for a financial year."""
    return CAS_DIR / f"FY{fy}.json"


def get_latest_fy() -> Optional[str]:
    """
    Get the most recent financial year based on uploaded CAS JSON files.

    Returns:
        Financial year string (e.g., "2024-25"), or None if no files exist.
    """
    if not CAS_DIR.exists():
        return None

    json_files = list(CAS_DIR.glob("FY*.json"))
    if not json_files:
        return None

    # Extract FY from filenames like "FY2024-25.json"
    fys = []
    for f in json_files:
        stem = f.stem  # e.g., "FY2024-25"
        if stem.startswith("FY"):
            fy = stem[2:]  # Extract "2024-25"
            fys.append(fy)

    return max(fys) if fys else None


def get_all_fys() -> List[str]:
    """
    Get all financial years that have CAS data.

    Returns:
        List of FY strings sorted in descending order.
    """
    if not CAS_DIR.exists():
        return []

    json_files = list(CAS_DIR.glob("FY*.json"))

    fys = []
    for f in json_files:
        stem = f.stem
        if stem.startswith("FY"):
            fy = stem[2:]
            fys.append(fy)

    return sorted(fys, reverse=True)


def detect_cas_format(excel_file: pd.ExcelFile) -> str:
    """
    Detect whether this is CAMS or KFINTECH format.

    Args:
        excel_file: Opened pandas ExcelFile object.

    Returns:
        "CAMS" or "KFINTECH"

    Raises:
        CASParserError: If format cannot be determined.
    """
    sheet_names = excel_file.sheet_names

    # KFINTECH has sheets like "Summary - Equity", "Summary - NonEquity"
    if "Summary - Equity" in sheet_names or "Summary - NonEquity" in sheet_names:
        return "KFINTECH"

    # CAMS has sheets like "OVERALL_SUMMARY_EQUITY", "OVERALL_SUMMARY_NONEQUITY"
    if "OVERALL_SUMMARY_EQUITY" in sheet_names or "OVERALL_SUMMARY_NONEQUITY" in sheet_names:
        return "CAMS"

    raise CASParserError(
        "Unknown CAS format. Expected CAMS or KFINTECH sheet structure. "
        f"Found sheets: {sheet_names}"
    )


def _parse_date(value) -> Optional[datetime]:
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


def _parse_number(value) -> float:
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


def infer_financial_year_from_excel(excel_file: pd.ExcelFile, cas_format: str) -> str:
    """
    Infer financial year from Excel redemption dates.

    Financial year in India runs from April 1 to March 31.
    Each transaction row has two dates (purchase and redemption).
    The chronologically later date is the redemption date.

    Args:
        excel_file: Opened pandas ExcelFile object.
        cas_format: "CAMS" or "KFINTECH"

    Returns:
        FY in format "2025-26"

    Raises:
        CASParserError: If financial year cannot be determined.
    """
    try:
        # Determine transaction sheet name based on format
        if cas_format == "CAMS":
            txn_sheet = "TRXN_DETAILS"
        else:  # KFINTECH
            txn_sheet = "Trasaction_Details"  # Note: KFINTECH has typo in sheet name

        if txn_sheet not in excel_file.sheet_names:
            raise CASParserError(f"Transaction sheet '{txn_sheet}' not found")

        # Read transaction sheet
        df = pd.read_excel(excel_file, sheet_name=txn_sheet, header=None)

        # Find the first row with multiple dates and use the later one (redemption date)
        for row_idx in range(len(df)):
            row = df.iloc[row_idx]
            dates_in_row = []

            # Extract all dates from this row
            for cell_value in row:
                date_obj = _parse_date(cell_value)
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

        raise CASParserError("Could not find row with purchase and redemption dates")

    except Exception as e:
        if isinstance(e, CASParserError):
            raise
        raise CASParserError(f"Failed to infer financial year: {e}")


def _parse_transactions(excel_file: pd.ExcelFile, cas_format: str) -> List[Dict[str, Any]]:
    """
    Parse individual transactions from the transaction details sheet.

    Args:
        excel_file: Opened pandas ExcelFile object.
        cas_format: "CAMS" or "KFINTECH"

    Returns:
        List of transaction dictionaries with keys:
        - fund_name, folio, buy_date, sell_date, units, buy_nav, sell_nav,
        - sale_consideration, acquisition_cost, gain_loss, asset_type, term
    """
    # Determine sheet name based on format
    if cas_format == "CAMS":
        txn_sheet = "TRXN_DETAILS"
    else:
        txn_sheet = "Trasaction_Details"

    if txn_sheet not in excel_file.sheet_names:
        logger.warning(f"Transaction sheet '{txn_sheet}' not found")
        return []

    df = pd.read_excel(excel_file, sheet_name=txn_sheet, header=None)
    transactions = []

    # Find header row and data rows
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
    for col_idx, val in enumerate(header):
        if pd.isna(val):
            continue
        val_lower = str(val).lower().strip()
        if 'scheme' in val_lower or 'fund' in val_lower:
            col_indices['fund_name'] = col_idx
        elif 'folio' in val_lower:
            col_indices['folio'] = col_idx
        elif 'unit' in val_lower and 'redeem' in val_lower:
            col_indices['units'] = col_idx
        elif 'purchase' in val_lower and 'date' in val_lower:
            col_indices['buy_date'] = col_idx
        elif 'redemp' in val_lower and 'date' in val_lower:
            col_indices['sell_date'] = col_idx
        elif 'purchase' in val_lower and 'nav' in val_lower:
            col_indices['buy_nav'] = col_idx
        elif 'redemp' in val_lower and 'nav' in val_lower:
            col_indices['sell_nav'] = col_idx
        elif 'full value' in val_lower or 'sale' in val_lower and 'consider' in val_lower:
            col_indices['sale_consideration'] = col_idx
        elif 'cost' in val_lower and 'acq' in val_lower:
            col_indices['acquisition_cost'] = col_idx
        elif 'gain' in val_lower or 'loss' in val_lower:
            if 'gain_loss' not in col_indices:
                col_indices['gain_loss'] = col_idx

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
        for field, col_idx in col_indices.items():
            val = row.iloc[col_idx] if col_idx < len(row) else None
            if field in ['buy_date', 'sell_date']:
                date_val = _parse_date(val)
                txn[field] = date_val.strftime('%Y-%m-%d') if date_val else ''
            elif field in ['units', 'buy_nav', 'sell_nav', 'sale_consideration', 'acquisition_cost', 'gain_loss']:
                txn[field] = _parse_number(val)
            else:
                txn[field] = str(val).strip() if pd.notna(val) else ''

        # Skip if missing critical fields
        if not txn.get('sell_date') or not txn.get('fund_name'):
            continue

        # Determine asset type from sheet context (equity vs debt)
        # This will be set later based on which summary sheet the fund appears in
        txn['asset_type'] = 'unknown'
        txn['term'] = 'unknown'

        transactions.append(txn)

    return transactions


def _parse_summary_sheet(df: pd.DataFrame) -> Tuple[float, float, float, float, float, float]:
    """
    Parse summary sheet (works for both CAMS and KFINTECH formats).

    Args:
        df: DataFrame from summary sheet (read with header=None).

    Returns:
        Tuple of (st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain)
    """
    st_sale = 0.0
    st_cost = 0.0
    st_gain = 0.0
    lt_sale = 0.0
    lt_cost = 0.0
    lt_gain = 0.0

    # Look for specific row labels in first column
    for idx, row in df.iterrows():
        label = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""

        # Get "Total" column value (usually last column with data)
        total_value = 0.0
        for col_idx in range(len(row) - 1, 0, -1):
            if pd.notna(row.iloc[col_idx]) and isinstance(row.iloc[col_idx], (int, float)):
                total_value = float(row.iloc[col_idx])
                break

        if "Full Value Consideration" in label:
            if st_sale == 0.0:  # First occurrence = Short-term
                st_sale = total_value
            else:  # Second occurrence = Long-term
                lt_sale = total_value

        elif "Cost of Acquisition" in label:
            if st_cost == 0.0:  # First occurrence = Short-term
                st_cost = total_value
            else:  # Second occurrence = Long-term
                lt_cost = total_value

        elif "Short Term Capital Gain/Loss" in label or "Short Term Capital Gain" in label:
            st_gain = total_value

        elif "LongTermWithOutIndex" in label and "CapitalGain" in label:
            lt_gain = total_value

    return st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain


def parse_cas_data(excel_file: pd.ExcelFile, cas_format: str) -> Dict[str, Any]:
    """
    Parse CAS Excel into a data structure with transactions and summary.

    Args:
        excel_file: Opened pandas ExcelFile object.
        cas_format: "CAMS" or "KFINTECH"

    Returns:
        Dictionary with 'transactions' list and 'summary' dict.
    """
    # Determine sheet names based on format
    if cas_format == "CAMS":
        equity_sheet = "OVERALL_SUMMARY_EQUITY"
        debt_sheet = "OVERALL_SUMMARY_NONEQUITY"
    else:  # KFINTECH
        equity_sheet = "Summary - Equity"
        debt_sheet = "Summary - NonEquity"

    # Parse summary data
    summary = {
        'equity_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'equity_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'debt_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        'debt_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
    }

    if equity_sheet in excel_file.sheet_names:
        equity_df = pd.read_excel(excel_file, sheet_name=equity_sheet, header=None)
        eq_st_sale, eq_st_cost, eq_st_gain, eq_lt_sale, eq_lt_cost, eq_lt_gain = \
            _parse_summary_sheet(equity_df)
        summary['equity_short_term'] = {
            'sale_consideration': eq_st_sale,
            'acquisition_cost': eq_st_cost,
            'gain_loss': eq_st_gain
        }
        summary['equity_long_term'] = {
            'sale_consideration': eq_lt_sale,
            'acquisition_cost': eq_lt_cost,
            'gain_loss': eq_lt_gain
        }

    if debt_sheet in excel_file.sheet_names:
        debt_df = pd.read_excel(excel_file, sheet_name=debt_sheet, header=None)
        debt_st_sale, debt_st_cost, debt_st_gain, debt_lt_sale, debt_lt_cost, debt_lt_gain = \
            _parse_summary_sheet(debt_df)
        summary['debt_short_term'] = {
            'sale_consideration': debt_st_sale,
            'acquisition_cost': debt_st_cost,
            'gain_loss': debt_st_gain
        }
        summary['debt_long_term'] = {
            'sale_consideration': debt_lt_sale,
            'acquisition_cost': debt_lt_cost,
            'gain_loss': debt_lt_gain
        }

    # Parse transactions (for deduplication)
    transactions = _parse_transactions(excel_file, cas_format)

    return {
        'transactions': transactions,
        'summary': summary,
        'updated_at': datetime.now().isoformat()
    }


def _transaction_key(txn: Dict[str, Any]) -> str:
    """
    Generate a unique key for a transaction for deduplication.
    Based on fund name, folio, sell date, and units.
    """
    return f"{txn.get('fund_name', '')}|{txn.get('folio', '')}|{txn.get('sell_date', '')}|{txn.get('units', 0)}"


def _merge_cas_data(existing: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge new CAS data into existing data, removing duplicates.

    Transactions are deduplicated by key (fund+folio+date+units).
    Summary values are combined (summed) from both sources.
    """
    # Merge transactions with deduplication
    existing_txns = {_transaction_key(t): t for t in existing.get('transactions', [])}
    for txn in new.get('transactions', []):
        key = _transaction_key(txn)
        existing_txns[key] = txn  # New overwrites duplicates

    merged_transactions = list(existing_txns.values())

    # Combine summary values
    merged_summary = {}
    for category in ['equity_short_term', 'equity_long_term', 'debt_short_term', 'debt_long_term']:
        existing_cat = existing.get('summary', {}).get(category, {})
        new_cat = new.get('summary', {}).get(category, {})

        merged_summary[category] = {
            'sale_consideration': existing_cat.get('sale_consideration', 0.0) + new_cat.get('sale_consideration', 0.0),
            'acquisition_cost': existing_cat.get('acquisition_cost', 0.0) + new_cat.get('acquisition_cost', 0.0),
            'gain_loss': existing_cat.get('gain_loss', 0.0) + new_cat.get('gain_loss', 0.0),
        }

    return {
        'transactions': merged_transactions,
        'summary': merged_summary,
        'updated_at': datetime.now().isoformat()
    }


def _load_existing_json(fy: str) -> Optional[Dict[str, Any]]:
    """Load existing JSON data for a financial year, if it exists."""
    json_path = _get_json_path(fy)
    if json_path.exists():
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load existing JSON {json_path}: {e}")
    return None


def _save_json(fy: str, data: Dict[str, Any]) -> Path:
    """Save CAS data as JSON."""
    CAS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = _get_json_path(fy)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    return json_path


def load_and_parse_cas(
    fy: Optional[str] = None,
    password: Optional[str] = None
) -> CASCapitalGains:
    """
    Load CAS data from JSON file.

    Args:
        fy: Financial year (e.g., "2024-25"). If None, uses latest FY.
        password: Not used (kept for API compatibility).

    Returns:
        CASCapitalGains data.

    Raises:
        FileNotFoundError: If no CAS data exists.
    """
    if fy:
        json_path = _get_json_path(fy)
        if not json_path.exists():
            raise FileNotFoundError(f"CAS data not found for financial year {fy}")
    else:
        latest_fy = get_latest_fy()
        if not latest_fy:
            raise FileNotFoundError("No CAS data found. Please upload a CAS Excel file.")
        json_path = _get_json_path(latest_fy)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    summary = data.get('summary', {})
    last_updated = data.get('updated_at', datetime.now().isoformat())

    return CASCapitalGains(
        equity_short_term=CASCategoryData(**summary.get('equity_short_term', {})),
        equity_long_term=CASCategoryData(**summary.get('equity_long_term', {})),
        debt_short_term=CASCategoryData(**summary.get('debt_short_term', {})),
        debt_long_term=CASCategoryData(**summary.get('debt_long_term', {})),
        last_updated=last_updated
    )


def validate_and_save_cas_excel(
    file_content: bytes,
    password: Optional[str] = None
) -> Tuple[str, Path]:
    """
    Validate CAS Excel file, combine with existing data, and save as JSON.

    The Excel file is deleted after processing.

    Args:
        file_content: Raw Excel file bytes.
        password: Password for decryption (if file is protected).

    Returns:
        Tuple of (financial_year, saved_json_path)

    Raises:
        PasswordRequiredError: If file is password-protected.
        CASParserError: If validation fails.
    """
    # First, check if file is encrypted using msoffcrypto
    file_obj = io.BytesIO(file_content)
    is_encrypted = False

    try:
        office_file = msoffcrypto.OfficeFile(file_obj)
        is_encrypted = office_file.is_encrypted()
    except Exception:
        # Not an OLE file or can't determine - try opening directly
        pass

    if is_encrypted:
        if not password:
            raise PasswordRequiredError(
                "This file is password-protected. Please provide the password."
            )

        # Decrypt the file
        try:
            file_obj = io.BytesIO(file_content)
            office_file = msoffcrypto.OfficeFile(file_obj)
            office_file.load_key(password=password)

            decrypted = io.BytesIO()
            office_file.decrypt(decrypted)
            decrypted.seek(0)

            excel_file = pd.ExcelFile(decrypted, engine='openpyxl')
        except Exception as decrypt_error:
            raise CASParserError(
                f"Failed to decrypt file. Password may be incorrect: {decrypt_error}"
            )
    else:
        # Try opening the file directly
        try:
            file_obj = io.BytesIO(file_content)
            excel_file = pd.ExcelFile(file_obj)
        except Exception as e:
            raise CASParserError(f"Failed to open Excel file: {e}")

    # Detect format
    cas_format = detect_cas_format(excel_file)

    # Infer financial year
    financial_year = infer_financial_year_from_excel(excel_file, cas_format)

    # Parse data from Excel
    new_data = parse_cas_data(excel_file, cas_format)

    # Load existing data and merge (if exists)
    existing_data = _load_existing_json(financial_year)
    if existing_data:
        logger.info(f"Merging with existing data for FY {financial_year}")
        merged_data = _merge_cas_data(existing_data, new_data)
    else:
        merged_data = {
            'transactions': new_data['transactions'],
            'summary': new_data['summary'],
            'updated_at': datetime.now().isoformat()
        }

    # Save as JSON
    json_path = _save_json(financial_year, merged_data)
    logger.info(f"Saved combined CAS data: {json_path} (FY: {financial_year})")

    return financial_year, json_path
