"""
Shared utility functions for the Financial Planner application.
"""

from datetime import datetime


def get_financial_year(date: datetime) -> str:
    """
    Get financial year from a date.

    Indian FY runs from April 1 to March 31.
    Example: 2024-05-15 → "2024-25", 2024-02-15 → "2023-24"

    Args:
        date: datetime object.

    Returns:
        Financial year string like "2024-25".
    """
    if date.month >= 4:  # April or later
        start_year = date.year
        end_year = date.year + 1
    else:  # January to March
        start_year = date.year - 1
        end_year = date.year

    return f"{start_year}-{str(end_year)[-2:]}"


def get_financial_year_from_string(date_str: str) -> str:
    """
    Extract financial year from a date string.

    Indian FY runs from April 1 to March 31.
    Example: "2024-05-15" → "2024-25", "2024-02-15" → "2023-24"

    Args:
        date_str: Date in YYYY-MM-DD format.

    Returns:
        Financial year string like "2024-25".
    """
    date = datetime.strptime(date_str, '%Y-%m-%d')
    return get_financial_year(date)
