"""
Tax Rules Configuration
========================

This file contains all tax rules for capital gains calculations.
These rules change frequently, so they're maintained separately for easy updates.

IMPORTANT: All dates should be in ISO format (YYYY-MM-DD)
          All holding periods are in DAYS

Last updated: January 2026
"""

from datetime import datetime
from decimal import Decimal


# ============================================================================
# EQUITY MUTUAL FUNDS - Tax Rules
# ============================================================================

EQUITY_LTCG_THRESHOLD_DAYS = 365  # 1 year for equity funds

# Equity funds follow a simple rule:
# - Holding period > 1 year (365 days) = Long-term Capital Gains (LTCG)
# - Holding period ≤ 1 year = Short-term Capital Gains (STCG)


# ============================================================================
# DEBT MUTUAL FUNDS - Tax Rules
# ============================================================================

# CRITICAL DATE: Tax law changed on April 1, 2023
DEBT_TAX_REGIME_CHANGE_DATE = datetime(2023, 4, 1)


def get_debt_fund_term(buy_date: datetime, sell_date: datetime) -> str:
    """
    Determine if debt fund capital gains are short-term or long-term.

    Tax Rules for Debt Mutual Funds:

    1. For investments made ON OR AFTER April 1, 2023:
       - ALL gains are treated as Short-Term Capital Gains (STCG)
       - Holding period does NOT matter
       - Taxed at your income tax slab rate

    2. For investments made BEFORE April 1, 2023:
       - Holding period ≤ 24 months (730 days) = Short-term (STCG)
       - Holding period > 24 months (730 days) = Long-term (LTCG)
       - Note: Previously it was 36 months, but changed to 24 months

    Args:
        buy_date: Date when units were purchased
        sell_date: Date when units were sold/redeemed

    Returns:
        'Short-term' or 'Long-term'
    """
    holding_days = (sell_date - buy_date).days

    # Rule 1: Investments made on or after April 1, 2023
    if buy_date >= DEBT_TAX_REGIME_CHANGE_DATE:
        return 'Short-term'  # Always STCG, regardless of holding period

    # Rule 2: Investments made before April 1, 2023
    DEBT_LTCG_THRESHOLD_DAYS_OLD_REGIME = 730  # 24 months

    if holding_days > DEBT_LTCG_THRESHOLD_DAYS_OLD_REGIME:
        return 'Long-term'
    else:
        return 'Short-term'


def get_equity_fund_term(holding_days: int) -> str:
    """
    Determine if equity fund capital gains are short-term or long-term.

    Tax Rules for Equity Mutual Funds:
    - Holding period > 1 year (365 days) = Long-term (LTCG)
    - Holding period ≤ 1 year = Short-term (STCG)

    Args:
        holding_days: Number of days between purchase and sale

    Returns:
        'Short-term' or 'Long-term'
    """
    if holding_days > EQUITY_LTCG_THRESHOLD_DAYS:
        return 'Long-term'
    else:
        return 'Short-term'


# ============================================================================
# USAGE EXAMPLES (for reference)
# ============================================================================

"""
Example 1: Debt fund bought on March 15, 2023, sold on May 1, 2025
- Buy date: Before April 1, 2023
- Holding period: ~750 days (> 730 days)
- Result: Long-term Capital Gains

Example 2: Debt fund bought on May 1, 2023, sold on May 1, 2025
- Buy date: After April 1, 2023
- Holding period: 730 days
- Result: Short-term Capital Gains (new regime - always STCG)

Example 3: Debt fund bought on Jan 1, 2022, sold on Jan 1, 2024
- Buy date: Before April 1, 2023
- Holding period: 730 days (exactly 24 months)
- Result: Short-term (need > 730 days for LTCG)

Example 4: Equity fund bought on Jan 1, 2024, sold on Feb 1, 2025
- Holding period: ~395 days (> 365 days)
- Result: Long-term Capital Gains
"""
