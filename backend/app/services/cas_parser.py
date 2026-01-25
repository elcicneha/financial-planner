"""
CAS (Capital Account Statement) Parser Service.

Extracts capital gains data from CAS JSON files provided by CAMS/Karvy.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import CAS_DIR
from app.models.schemas import CASCapitalGains, CASCategoryData

logger = logging.getLogger(__name__)


class CASParserError(Exception):
    """Raised when CAS parsing fails."""
    pass


def get_latest_cas_file() -> Optional[Path]:
    """
    Get the most recent CAS file based on filename (financial year).

    Returns:
        Path to the latest CAS file, or None if no files exist.
    """
    if not CAS_DIR.exists():
        return None

    cas_files = sorted(CAS_DIR.glob("FY*.json"), reverse=True)
    return cas_files[0] if cas_files else None


def get_cas_file_for_fy(fy: str) -> Path:
    """
    Get CAS file path for a specific financial year.

    Args:
        fy: Financial year string (e.g., "2024-25")

    Returns:
        Path to the CAS file (may not exist).
    """
    return CAS_DIR / f"FY{fy}.json"


def infer_financial_year_from_cas(cas_data: dict) -> str:
    """
    Infer financial year from CAS JSON transaction dates.

    Financial year in India runs from April 1 to March 31.
    Reads a single transaction date to determine the FY.

    Args:
        cas_data: Parsed CAS JSON data.

    Returns:
        FY in format "2025-26"

    Raises:
        CASParserError: If financial year cannot be determined.
    """
    transactions = cas_data.get("TRXN_DETAILS", [])

    if not transactions:
        raise CASParserError("No transaction details found in CAS JSON")

    first_txn = transactions[0]
    date_str = first_txn.get("Date")

    if not date_str:
        raise CASParserError("No date found in CAS transaction")

    try:
        date_obj = datetime.strptime(date_str, "%d-%b-%Y")
    except (ValueError, TypeError) as e:
        raise CASParserError(f"Could not parse transaction date: {date_str}") from e

    # Determine FY based on the date (FY starts on April 1)
    if date_obj.month >= 4:  # Apr to Dec
        fy_start_year = date_obj.year
        fy_end_year = date_obj.year + 1
    else:  # Jan to Mar
        fy_start_year = date_obj.year - 1
        fy_end_year = date_obj.year

    return f"{fy_start_year}-{str(fy_end_year)[-2:]}"


def _parse_capital_gains_section(summary_data: list) -> tuple[float, float, float, float, float, float]:
    """
    Parse capital gains from a CAS summary section (equity or debt).

    The CAS summary has a specific structure with ST and LT sections.
    Each section has: Full Value Consideration, Cost of Acquisition, Gain/Loss.

    Args:
        summary_data: List of summary rows from CAS JSON.

    Returns:
        Tuple of (st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain)
    """
    st_sale = 0.0
    st_cost = 0.0
    st_gain = 0.0
    lt_sale = 0.0
    lt_cost = 0.0
    lt_gain = 0.0

    fvc_count = 0  # Full Value Consideration counter
    coa_count = 0  # Cost of Acquisition counter

    for row in summary_data:
        summary_type = row.get("Summary Of Capital Gains", "")
        total_value = row.get("Total", 0.0)

        if summary_type == "Full Value Consideration":
            fvc_count += 1
            if fvc_count == 1:  # First occurrence = Short-term
                st_sale = total_value
            elif fvc_count == 3:  # Third occurrence = Long-term without index
                lt_sale = total_value

        elif summary_type == "Cost of Acquisition":
            coa_count += 1
            if coa_count == 1:  # First occurrence = Short-term
                st_cost = total_value
            elif coa_count == 3:  # Third occurrence = Long-term without index
                lt_cost = total_value

        elif summary_type == "Short Term Capital Gain/Loss":
            st_gain = total_value

        elif "LongTermWithOutIndex" in summary_type and "CapitalGain" in summary_type:
            lt_gain = total_value

    return st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain


def parse_cas_capital_gains(cas_data: dict) -> CASCapitalGains:
    """
    Parse CAS JSON data into structured capital gains.

    Extracts 4 categories of capital gains:
    - Equity Short-term
    - Equity Long-term
    - Debt Short-term
    - Debt Long-term

    Args:
        cas_data: Parsed CAS JSON data.

    Returns:
        CASCapitalGains with all four categories populated.
    """
    # Parse equity data
    equity_summary = cas_data.get("OVERALL_SUMMARY_EQUITY", [])
    eq_st_sale, eq_st_cost, eq_st_gain, eq_lt_sale, eq_lt_cost, eq_lt_gain = \
        _parse_capital_gains_section(equity_summary)

    # Parse debt (non-equity) data
    debt_summary = cas_data.get("OVERALL_SUMMARY_NONEQUITY", [])
    debt_st_sale, debt_st_cost, debt_st_gain, debt_lt_sale, debt_lt_cost, debt_lt_gain = \
        _parse_capital_gains_section(debt_summary)

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


def load_and_parse_cas(fy: Optional[str] = None) -> CASCapitalGains:
    """
    Load CAS file and parse capital gains.

    Args:
        fy: Financial year (e.g., "2024-25"). If None, uses latest file.

    Returns:
        Parsed CASCapitalGains data.

    Raises:
        FileNotFoundError: If CAS file doesn't exist.
        CASParserError: If parsing fails.
    """
    if fy:
        cas_path = get_cas_file_for_fy(fy)
        if not cas_path.exists():
            raise FileNotFoundError(f"CAS file not found for financial year {fy}")
    else:
        cas_path = get_latest_cas_file()
        if not cas_path:
            raise FileNotFoundError("No CAS files found. Please upload a CAS JSON file.")

    try:
        with open(cas_path, 'r', encoding='utf-8') as f:
            cas_data = json.load(f)
    except json.JSONDecodeError as e:
        raise CASParserError(f"Failed to parse CAS JSON: {e}") from e

    return parse_cas_capital_gains(cas_data)


def validate_cas_json(cas_data: dict) -> None:
    """
    Validate that a dict looks like a valid CAS JSON file.

    Args:
        cas_data: Parsed JSON data to validate.

    Raises:
        CASParserError: If validation fails.
    """
    if "OVERALL_SUMMARY_EQUITY" not in cas_data and "OVERALL_SUMMARY_NONEQUITY" not in cas_data:
        raise CASParserError("Invalid CAS JSON format. Missing expected fields.")
