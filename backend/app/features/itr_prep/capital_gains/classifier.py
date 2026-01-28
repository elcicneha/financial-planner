"""
Fund type classification logic.

Classifies mutual funds as equity or debt based on equity percentage
and manages classification overrides.
"""

import json
import logging
from decimal import Decimal
from typing import Dict, Optional

from app.config import ISIN_TICKER_LINKS_DB, EQUITY_PERCENTAGE_THRESHOLD

logger = logging.getLogger(__name__)


def parse_percentage(pct_str: str) -> Decimal:
    """
    Parse percentage string to Decimal.

    Args:
        pct_str: Percentage string (e.g., "68.73%", "0%", "")

    Returns:
        Decimal value (e.g., 68.73), or 0 if invalid.
    """
    if not pct_str or pct_str.strip() == '':
        return Decimal('0')

    try:
        return Decimal(pct_str.strip().replace('%', ''))
    except Exception:
        return Decimal('0')


def classify_fund_type(ticker: str, large_cap: str, mid_cap: str, small_cap: str, other_cap: str) -> str:
    """
    Classify fund as 'equity' or 'debt' based on equity percentage.

    Classification rules (Indian tax law):
    - Ticker contains "ARBI" → equity (arbitrage funds get equity taxation)
    - No cap data available (all empty strings) → unknown
    - Equity% >= 65% → equity
    - Equity% < 65% (including explicit 0%) → debt

    Args:
        ticker: Fund ticker symbol
        large_cap: Large cap percentage (e.g., "68.73%")
        mid_cap: Mid cap percentage
        small_cap: Small cap percentage
        other_cap: Other cap percentage

    Returns:
        'equity', 'debt', or 'unknown'
    """
    if 'arbi' in ticker.lower():
        return 'equity'

    # Check if all cap percentages are empty/missing (no data available)
    all_empty = all(not str(cap).strip() or str(cap).strip() == ''
                   for cap in [large_cap, mid_cap, small_cap, other_cap])

    if all_empty:
        return 'unknown'

    # Calculate equity percentage
    equity_pct = (
        parse_percentage(large_cap) +
        parse_percentage(mid_cap) +
        parse_percentage(small_cap) +
        parse_percentage(other_cap)
    )

    # Classify based on equity percentage threshold
    # Note: If equity_pct is 0 (e.g., "0%", "0%", "0%", "0%"), it's a debt fund (liquid/debt fund)
    return 'equity' if equity_pct >= EQUITY_PERCENTAGE_THRESHOLD else 'debt'


# Lazy-loaded fund type mapping
_fund_type_mapping: Optional[Dict[str, str]] = None


def get_fund_type_mapping() -> Dict[str, str]:
    """
    Get fund type mapping, loading from database if needed.

    Returns:
        Dictionary mapping ticker symbols to 'equity' or 'debt'.
    """
    global _fund_type_mapping

    if _fund_type_mapping is not None:
        return _fund_type_mapping

    _fund_type_mapping = {}

    if not ISIN_TICKER_LINKS_DB.exists():
        logger.warning(f"Market cap database not found: {ISIN_TICKER_LINKS_DB}")
        return _fund_type_mapping

    try:
        with open(ISIN_TICKER_LINKS_DB, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for row in data:
                ticker = row.get('Ticker', '').strip()
                if not ticker:
                    continue

                fund_type = classify_fund_type(
                    ticker,
                    row.get('Large Cap', ''),
                    row.get('Mid Cap', ''),
                    row.get('Small Cap', ''),
                    row.get('Other Cap', '')
                )
                _fund_type_mapping[ticker] = fund_type

        logger.info(f"Loaded market cap database: {len(_fund_type_mapping)} tickers")
    except Exception as e:
        logger.error(f"Error loading market cap database: {e}")

    return _fund_type_mapping
