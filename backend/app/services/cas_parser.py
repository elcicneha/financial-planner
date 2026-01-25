"""
CAS (Capital Account Statement) Parser Service.

Extracts capital gains data from CAS Excel files (CAMS .xls or KFINTECH .xlsx).
Supports both password-protected and non-protected files.
"""

import io
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

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


def get_latest_cas_file() -> Optional[Path]:
    """
    Get the most recent CAS file based on filename (financial year).

    Returns:
        Path to the latest CAS file, or None if no files exist.
    """
    if not CAS_DIR.exists():
        return None

    cas_files = sorted(
        list(CAS_DIR.glob("FY*.xls")) + list(CAS_DIR.glob("FY*.xlsx")),
        reverse=True
    )
    return cas_files[0] if cas_files else None


def get_cas_file_for_fy(fy: str) -> Path:
    """
    Get CAS file path for a specific financial year.

    Args:
        fy: Financial year string (e.g., "2024-25")

    Returns:
        Path to the CAS file (checks both .xls and .xlsx).
    """
    # Try .xls first, then .xlsx
    xls_path = CAS_DIR / f"FY{fy}.xls"
    xlsx_path = CAS_DIR / f"FY{fy}.xlsx"

    if xls_path.exists():
        return xls_path
    elif xlsx_path.exists():
        return xlsx_path
    else:
        # Return xlsx path by default (will be created on upload)
        return xlsx_path


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


def open_excel_file(file_path: Path, password: Optional[str] = None) -> io.BytesIO:
    """
    Open Excel file, handling password protection if needed.

    Args:
        file_path: Path to Excel file.
        password: Password for decryption (if file is protected).

    Returns:
        BytesIO object containing decrypted Excel data.

    Raises:
        PasswordRequiredError: If file is password-protected and no password provided.
        CASParserError: If password is incorrect or file cannot be opened.
    """
    try:
        # Try opening without password first
        with open(file_path, 'rb') as f:
            excel_data = io.BytesIO(f.read())
            # Test if we can read it
            pd.ExcelFile(excel_data)
            excel_data.seek(0)
            return excel_data
    except Exception as e:
        # Check if it's a password protection error
        if "password" in str(e).lower() or "encrypted" in str(e).lower():
            if not password:
                raise PasswordRequiredError(
                    "This file is password-protected. Please provide the password."
                )

            # Try decrypting with password
            try:
                with open(file_path, 'rb') as f:
                    office_file = msoffcrypto.OfficeFile(f)
                    office_file.load_key(password=password)

                    decrypted = io.BytesIO()
                    office_file.decrypt(decrypted)
                    decrypted.seek(0)

                    # Validate it can be read
                    pd.ExcelFile(decrypted)
                    decrypted.seek(0)
                    return decrypted
            except Exception as decrypt_error:
                raise CASParserError(
                    f"Failed to decrypt file. Password may be incorrect: {decrypt_error}"
                )
        else:
            raise CASParserError(f"Failed to open Excel file: {e}")


def infer_financial_year_from_excel(excel_file: pd.ExcelFile, cas_format: str) -> str:
    """
    Infer financial year from Excel transaction dates.

    Financial year in India runs from April 1 to March 31.

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

        # Read transaction sheet (skip header rows)
        df = pd.read_excel(excel_file, sheet_name=txn_sheet, header=None)

        # Find a date column - look for cells containing dates
        for col_idx in range(min(10, len(df.columns))):
            for row_idx in range(min(20, len(df))):
                cell_value = df.iloc[row_idx, col_idx]

                if pd.isna(cell_value):
                    continue

                # Try parsing as date
                try:
                    if isinstance(cell_value, str):
                        # Try different date formats
                        for fmt in ["%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d"]:
                            try:
                                date_obj = datetime.strptime(cell_value, fmt)
                                break
                            except ValueError:
                                continue
                        else:
                            continue
                    elif isinstance(cell_value, datetime):
                        date_obj = cell_value
                    else:
                        continue

                    # Determine FY based on the date (FY starts on April 1)
                    if date_obj.month >= 4:  # Apr to Dec
                        fy_start_year = date_obj.year
                        fy_end_year = date_obj.year + 1
                    else:  # Jan to Mar
                        fy_start_year = date_obj.year - 1
                        fy_end_year = date_obj.year

                    return f"{fy_start_year}-{str(fy_end_year)[-2:]}"

                except (ValueError, TypeError):
                    continue

        raise CASParserError("Could not find valid transaction date in Excel file")

    except Exception as e:
        raise CASParserError(f"Failed to infer financial year: {e}")


def _parse_cams_summary_sheet(df: pd.DataFrame) -> Tuple[float, float, float, float, float, float]:
    """
    Parse CAMS format summary sheet (OVERALL_SUMMARY_EQUITY or OVERALL_SUMMARY_NONEQUITY).

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
        label = str(row[0]).strip() if pd.notna(row[0]) else ""

        # Get "Total" column value (usually last column with data)
        total_value = 0.0
        for col_idx in range(len(row) - 1, 0, -1):
            if pd.notna(row[col_idx]) and isinstance(row[col_idx], (int, float)):
                total_value = float(row[col_idx])
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


def _parse_kfintech_summary_sheet(df: pd.DataFrame) -> Tuple[float, float, float, float, float, float]:
    """
    Parse KFINTECH format summary sheet (Summary - Equity or Summary - NonEquity).

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
        label = str(row[0]).strip() if pd.notna(row[0]) else ""

        # Get "Total" column value (usually last column)
        total_value = 0.0
        for col_idx in range(len(row) - 1, 0, -1):
            if pd.notna(row[col_idx]) and isinstance(row[col_idx], (int, float)):
                total_value = float(row[col_idx])
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


def parse_cas_capital_gains(
    excel_file: pd.ExcelFile,
    cas_format: str
) -> CASCapitalGains:
    """
    Parse CAS Excel data into structured capital gains.

    Extracts 4 categories of capital gains:
    - Equity Short-term
    - Equity Long-term
    - Debt Short-term
    - Debt Long-term

    Args:
        excel_file: Opened pandas ExcelFile object.
        cas_format: "CAMS" or "KFINTECH"

    Returns:
        CASCapitalGains with all four categories populated.
    """
    # Determine sheet names based on format
    if cas_format == "CAMS":
        equity_sheet = "OVERALL_SUMMARY_EQUITY"
        debt_sheet = "OVERALL_SUMMARY_NONEQUITY"
        parser_func = _parse_cams_summary_sheet
    else:  # KFINTECH
        equity_sheet = "Summary - Equity"
        debt_sheet = "Summary - NonEquity"
        parser_func = _parse_kfintech_summary_sheet

    # Parse equity data
    eq_st_sale = eq_st_cost = eq_st_gain = 0.0
    eq_lt_sale = eq_lt_cost = eq_lt_gain = 0.0

    if equity_sheet in excel_file.sheet_names:
        equity_df = pd.read_excel(excel_file, sheet_name=equity_sheet, header=None)
        eq_st_sale, eq_st_cost, eq_st_gain, eq_lt_sale, eq_lt_cost, eq_lt_gain = \
            parser_func(equity_df)

    # Parse debt (non-equity) data
    debt_st_sale = debt_st_cost = debt_st_gain = 0.0
    debt_lt_sale = debt_lt_cost = debt_lt_gain = 0.0

    if debt_sheet in excel_file.sheet_names:
        debt_df = pd.read_excel(excel_file, sheet_name=debt_sheet, header=None)
        debt_st_sale, debt_st_cost, debt_st_gain, debt_lt_sale, debt_lt_cost, debt_lt_gain = \
            parser_func(debt_df)

    return CASCapitalGains(
        equity_short_term=CASCategoryData(
            sale_consideration=eq_st_sale,
            acquisition_cost=eq_st_cost,
            gain_loss=eq_st_gain
        ),
        equity_long_term=CASCategoryData(
            sale_consideration=eq_lt_sale,
            acquisition_cost=eq_lt_cost,
            gain_loss=eq_lt_gain
        ),
        debt_short_term=CASCategoryData(
            sale_consideration=debt_st_sale,
            acquisition_cost=debt_st_cost,
            gain_loss=debt_st_gain
        ),
        debt_long_term=CASCategoryData(
            sale_consideration=debt_lt_sale,
            acquisition_cost=debt_lt_cost,
            gain_loss=debt_lt_gain
        )
    )


def load_and_parse_cas(
    fy: Optional[str] = None,
    password: Optional[str] = None
) -> CASCapitalGains:
    """
    Load CAS Excel file and parse capital gains.

    Args:
        fy: Financial year (e.g., "2024-25"). If None, uses latest file.
        password: Password for decryption (if file is protected).

    Returns:
        Parsed CASCapitalGains data.

    Raises:
        FileNotFoundError: If CAS file doesn't exist.
        PasswordRequiredError: If file is password-protected.
        CASParserError: If parsing fails.
    """
    if fy:
        cas_path = get_cas_file_for_fy(fy)
        if not cas_path.exists():
            raise FileNotFoundError(f"CAS file not found for financial year {fy}")
    else:
        cas_path = get_latest_cas_file()
        if not cas_path:
            raise FileNotFoundError("No CAS files found. Please upload a CAS Excel file.")

    # Open Excel file (with password if needed)
    excel_data = open_excel_file(cas_path, password)

    # Load as pandas ExcelFile
    excel_file = pd.ExcelFile(excel_data)

    # Detect format
    cas_format = detect_cas_format(excel_file)
    logger.info(f"Detected CAS format: {cas_format}")

    # Parse capital gains
    return parse_cas_capital_gains(excel_file, cas_format)


def validate_and_save_cas_excel(
    file_content: bytes,
    password: Optional[str] = None
) -> Tuple[str, Path]:
    """
    Validate CAS Excel file and save it to appropriate location.

    Args:
        file_content: Raw Excel file bytes.
        password: Password for decryption (if file is protected).

    Returns:
        Tuple of (financial_year, saved_file_path)

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
            file_content = decrypted.getvalue()
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

    # Determine file extension based on format
    file_extension = ".xls" if cas_format == "CAMS" else ".xlsx"

    # Save file
    CAS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = CAS_DIR / f"FY{financial_year}{file_extension}"

    with open(file_path, 'wb') as f:
        f.write(file_content)

    logger.info(f"Saved CAS file: {file_path} (Format: {cas_format}, FY: {financial_year})")

    return financial_year, file_path
