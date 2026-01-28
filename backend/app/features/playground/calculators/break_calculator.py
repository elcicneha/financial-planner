"""Break Calculator - Calculate optimal break duration based on savings and expenses.

This calculator helps users plan extended career breaks by projecting:
- Phase 1 (Accumulation): How savings grow with monthly contributions until break starts
- Phase 2 (Spending): How long the corpus lasts with monthly withdrawals and inflation
"""

import math
from typing import Dict, Any

from app.shared.calculator_registry import register_calculator


@register_calculator(
    name="break",
    description="Calculate how long your savings will last during a career break"
)
class BreakCalculator:
    """Break duration calculator with two-phase projection."""

    def calculate(self, **params) -> Dict[str, Any]:
        """
        Calculate retirement projections.

        Args:
            **params: Calculator inputs (see BreakCalculatorInput schema)

        Returns:
            Dict with calculation results (see BreakCalculatorOutput schema)
        """
        # Extract parameters with defaults
        current_age = params.get("current_age", 0)
        start_break_in = params.get("start_break_in", 0)
        current_savings = params.get("current_savings", 0)
        monthly_savings = params.get("monthly_savings", 0)
        monthly_expense = params.get("monthly_expense", 0)
        return_rate_accumulation = params.get("return_rate_accumulation", 12.0)
        return_rate_spending = params.get("return_rate_spending", 8.0)
        expense_increase_rate = params.get("expense_increase_rate", 5.0)
        use_effective_rate = params.get("use_effective_rate", True)
        invest_at_month_end = params.get("invest_at_month_end", False)

        # Phase 1: Accumulation
        months_until_break = start_break_in * 12
        monthly_rate_accum = self._get_monthly_rate(
            return_rate_accumulation, use_effective_rate
        )

        if months_until_break == 0:
            # Break starts immediately - no accumulation phase
            amount_at_break = current_savings
        elif monthly_rate_accum == 0:
            # No growth case
            amount_at_break = current_savings + monthly_savings * months_until_break
        else:
            # Future value of lump sum
            fv_lump_sum = current_savings * math.pow(
                1 + monthly_rate_accum, months_until_break
            )

            # Future value of annuity (depends on timing)
            if invest_at_month_end:
                # Ordinary annuity (payment at end of period)
                fv_annuity = monthly_savings * (
                    (math.pow(1 + monthly_rate_accum, months_until_break) - 1)
                    / monthly_rate_accum
                )
            else:
                # Annuity due (payment at beginning of period)
                fv_annuity = monthly_savings * (
                    (math.pow(1 + monthly_rate_accum, months_until_break) - 1)
                    / monthly_rate_accum
                ) * (1 + monthly_rate_accum)

            amount_at_break = fv_lump_sum + fv_annuity

        age_at_break = current_age + start_break_in

        # Phase 2: Spending
        monthly_rate_spend = self._get_monthly_rate(
            return_rate_spending, use_effective_rate
        )
        yearly_expense_multiplier = 1 + expense_increase_rate / 100

        corpus = amount_at_break
        current_expense = monthly_expense
        months_in_spending = 0
        max_months = 100 * 12  # Cap at 100 years to prevent infinite loop

        # Stop when corpus can't cover a full month's expense
        while corpus >= current_expense and months_in_spending < max_months:
            # Apply monthly growth
            corpus = corpus * (1 + monthly_rate_spend)

            # Withdraw monthly expense
            corpus = corpus - current_expense

            months_in_spending += 1

            # Increase expense at the start of each new year
            if months_in_spending > 0 and months_in_spending % 12 == 0:
                current_expense = current_expense * yearly_expense_multiplier

        years_in_spending = months_in_spending / 12
        corpus_runs_out_age = age_at_break + years_in_spending
        remaining_amount = max(0, round(corpus))

        return {
            "current_amount": current_savings,
            "amount_at_break": round(amount_at_break),
            "age_at_break": age_at_break,
            "corpus_runs_out_age": round(corpus_runs_out_age * 10) / 10,  # 1 decimal
            "remaining_amount": remaining_amount,
        }

    def _get_monthly_rate(self, annual_rate: float, use_effective: bool) -> float:
        """
        Convert annual rate to monthly rate using effective or nominal method.

        Args:
            annual_rate: Annual rate as percentage (e.g., 12 for 12%)
            use_effective: If True, use effective rate formula; if False, use nominal

        Returns:
            Monthly rate as decimal (e.g., 0.01 for 1%)
        """
        if use_effective:
            # Effective: (1 + r)^(1/12) - 1
            return math.pow(1 + annual_rate / 100, 1 / 12) - 1
        else:
            # Nominal: r / 12
            return annual_rate / 100 / 12
