"""
Data models for FIFO capital gains calculations.

Contains Transaction, BuyLot, and FIFOGain classes with decimal precision helpers.
"""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict


# Decimal precision constants
UNITS_PRECISION = Decimal('0.001')
NAV_PRECISION = Decimal('0.0001')
MONEY_PRECISION = Decimal('0.01')


def to_decimal(value: float | str | Decimal) -> Decimal:
    """Convert a value to Decimal safely."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def round_units(value: Decimal) -> Decimal:
    """Round units to 3 decimal places."""
    return value.quantize(UNITS_PRECISION, ROUND_HALF_UP)


def round_nav(value: Decimal) -> Decimal:
    """Round NAV to 4 decimal places."""
    return value.quantize(NAV_PRECISION, ROUND_HALF_UP)


def round_money(value: Decimal) -> Decimal:
    """Round money to 2 decimal places."""
    return value.quantize(MONEY_PRECISION, ROUND_HALF_UP)


class Transaction:
    """Represents a single transaction."""
    __slots__ = ('date', 'ticker', 'folio', 'side', 'nav', 'units', 'amount')

    def __init__(self, date: datetime, ticker: str, folio: str,
                 side: str, nav: Decimal, units: Decimal, amount: Decimal):
        self.date = date
        self.ticker = ticker
        self.folio = folio
        self.side = side  # 'buy' or 'sell'
        self.nav = round_nav(nav)
        self.units = round_units(abs(units))
        self.amount = amount


class BuyLot:
    """Represents a buy lot in the FIFO queue."""
    __slots__ = ('date', 'units_left', 'cost_per_unit', 'original_units', 'original_total_cost')

    def __init__(self, date: datetime, units: Decimal, cost_per_unit: Decimal,
                 original_units: Decimal, original_total_cost: Decimal):
        self.date = date
        self.units_left = round_units(units)
        self.cost_per_unit = round_nav(cost_per_unit)
        self.original_units = round_units(original_units)
        self.original_total_cost = round_money(original_total_cost)


class FIFOGain:
    """Represents a FIFO gain calculation result."""
    __slots__ = ('sell_date', 'ticker', 'folio', 'units', 'sell_nav', 'proceeds',
                 'buy_date', 'buy_nav', 'cost_basis', 'gain', 'holding_days', 'fund_type', 'term', 'financial_year')

    def __init__(self, sell_date: str, ticker: str, folio: str, units: Decimal,
                 sell_nav: Decimal, proceeds: Decimal, buy_date: str, buy_nav: Decimal,
                 cost_basis: Decimal, gain: Decimal, holding_days: int, fund_type: str, term: str, financial_year: str):
        self.sell_date = sell_date
        self.ticker = ticker
        self.folio = folio
        self.units = units
        self.sell_nav = sell_nav
        self.proceeds = proceeds
        self.buy_date = buy_date
        self.buy_nav = buy_nav
        self.cost_basis = cost_basis
        self.gain = gain
        self.holding_days = holding_days
        self.fund_type = fund_type
        self.term = term
        self.financial_year = financial_year

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'sell_date': self.sell_date,
            'ticker': self.ticker,
            'folio': self.folio,
            'units': float(self.units),
            'sell_nav': float(self.sell_nav),
            'sale_consideration': float(self.proceeds),
            'buy_date': self.buy_date,
            'buy_nav': float(self.buy_nav),
            'acquisition_cost': float(self.cost_basis),
            'gain': float(self.gain),
            'holding_days': self.holding_days,
            'fund_type': self.fund_type,
            'term': self.term,
            'financial_year': self.financial_year
        }
