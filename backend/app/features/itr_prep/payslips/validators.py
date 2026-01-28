"""Validators for payslip data."""

from typing import List, Dict, Any


def is_payslip_data_empty(payslip_data) -> bool:
    """
    Check if payslip data is invalid (missing gross pay).

    Gross pay is required for a valid payslip. If it's missing,
    the PDF is likely not a payslip.

    Args:
        payslip_data: Extracted payslip data (PayslipData model)

    Returns:
        True if no gross_pay found, False otherwise
    """
    return payslip_data.gross_pay is None


def is_duplicate_payslip(payslip_data, existing_payslips: List[Dict[str, Any]]) -> bool:
    """
    Check if payslip is a duplicate based on:
    - Same month/year (pay_period)
    - Same company_name
    - Same gross_pay

    Args:
        payslip_data: New payslip data to check (PayslipData model)
        existing_payslips: List of existing payslip records

    Returns:
        True if duplicate found, False otherwise
    """
    # Can't detect duplicates without these key fields
    if not payslip_data.pay_period or payslip_data.company_name is None or payslip_data.gross_pay is None:
        return False

    for record in existing_payslips:
        existing = record.get("payslip_data", {})
        existing_period = existing.get("pay_period")
        existing_company = existing.get("company_name")
        existing_gross = existing.get("gross_pay")

        if existing_period and existing_company is not None and existing_gross is not None:
            # Check if all three match
            if (existing_period.get("month") == payslip_data.pay_period.month and
                existing_period.get("year") == payslip_data.pay_period.year and
                existing_company == payslip_data.company_name and
                existing_gross == payslip_data.gross_pay):
                return True

    return False
