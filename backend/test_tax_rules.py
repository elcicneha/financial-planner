"""
Test script to verify tax rules implementation.
This is a standalone script to quickly validate the tax rules logic.
"""

from datetime import datetime
from app.core.tax_rules import get_debt_fund_term, get_equity_fund_term


def test_debt_fund_rules():
    """Test debt mutual fund tax rules."""
    print("\n" + "="*70)
    print("TESTING DEBT MUTUAL FUND TAX RULES")
    print("="*70)

    test_cases = [
        {
            "desc": "Debt fund bought BEFORE Apr 1, 2023, held for 25 months",
            "buy_date": datetime(2022, 1, 1),
            "sell_date": datetime(2024, 2, 1),
            "expected": "Long-term"
        },
        {
            "desc": "Debt fund bought BEFORE Apr 1, 2023, held for 20 months",
            "buy_date": datetime(2022, 1, 1),
            "sell_date": datetime(2023, 9, 1),
            "expected": "Short-term"
        },
        {
            "desc": "Debt fund bought BEFORE Apr 1, 2023, held for exactly 24 months",
            "buy_date": datetime(2022, 1, 1),
            "sell_date": datetime(2024, 1, 1),
            "expected": "Short-term"  # Need > 730 days for LTCG
        },
        {
            "desc": "Debt fund bought AFTER Apr 1, 2023, held for 3 years",
            "buy_date": datetime(2023, 5, 1),
            "sell_date": datetime(2026, 5, 1),
            "expected": "Short-term"  # New regime: always STCG
        },
        {
            "desc": "Debt fund bought AFTER Apr 1, 2023, held for 6 months",
            "buy_date": datetime(2025, 6, 1),
            "sell_date": datetime(2025, 12, 1),
            "expected": "Short-term"
        },
        {
            "desc": "Debt fund bought ON Apr 1, 2023, held for 2 years",
            "buy_date": datetime(2023, 4, 1),
            "sell_date": datetime(2025, 4, 1),
            "expected": "Short-term"  # On or after April 1, 2023
        },
    ]

    passed = 0
    failed = 0

    for test in test_cases:
        result = get_debt_fund_term(test["buy_date"], test["sell_date"])
        holding_days = (test["sell_date"] - test["buy_date"]).days

        status = "✓ PASS" if result == test["expected"] else "✗ FAIL"
        if result == test["expected"]:
            passed += 1
        else:
            failed += 1

        print(f"\n{status}")
        print(f"  Test: {test['desc']}")
        print(f"  Buy:  {test['buy_date'].strftime('%Y-%m-%d')}")
        print(f"  Sell: {test['sell_date'].strftime('%Y-%m-%d')}")
        print(f"  Holding: {holding_days} days")
        print(f"  Expected: {test['expected']}, Got: {result}")

    print(f"\n{'='*70}")
    print(f"DEBT FUND TESTS: {passed} passed, {failed} failed")
    print(f"{'='*70}")
    return failed == 0


def test_equity_fund_rules():
    """Test equity mutual fund tax rules."""
    print("\n" + "="*70)
    print("TESTING EQUITY MUTUAL FUND TAX RULES")
    print("="*70)

    test_cases = [
        {
            "desc": "Equity fund held for 13 months",
            "holding_days": 395,
            "expected": "Long-term"
        },
        {
            "desc": "Equity fund held for exactly 1 year",
            "holding_days": 365,
            "expected": "Short-term"  # Need > 365 days
        },
        {
            "desc": "Equity fund held for 366 days",
            "holding_days": 366,
            "expected": "Long-term"
        },
        {
            "desc": "Equity fund held for 6 months",
            "holding_days": 180,
            "expected": "Short-term"
        },
    ]

    passed = 0
    failed = 0

    for test in test_cases:
        result = get_equity_fund_term(test["holding_days"])

        status = "✓ PASS" if result == test["expected"] else "✗ FAIL"
        if result == test["expected"]:
            passed += 1
        else:
            failed += 1

        print(f"\n{status}")
        print(f"  Test: {test['desc']}")
        print(f"  Holding: {test['holding_days']} days")
        print(f"  Expected: {test['expected']}, Got: {result}")

    print(f"\n{'='*70}")
    print(f"EQUITY FUND TESTS: {passed} passed, {failed} failed")
    print(f"{'='*70}")
    return failed == 0


if __name__ == "__main__":
    print("\nRunning Tax Rules Tests...")

    debt_passed = test_debt_fund_rules()
    equity_passed = test_equity_fund_rules()

    if debt_passed and equity_passed:
        print("\n" + "="*70)
        print("ALL TESTS PASSED ✓")
        print("="*70)
        exit(0)
    else:
        print("\n" + "="*70)
        print("SOME TESTS FAILED ✗")
        print("="*70)
        exit(1)
