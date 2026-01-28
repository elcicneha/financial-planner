"""
FIFO capital gains calculation algorithm.

Calculates capital gains using First-In-First-Out methodology.
"""

import logging
from collections import defaultdict
from decimal import Decimal
from typing import Dict, List

from app.core.tax_rules import get_debt_fund_term, get_equity_fund_term
from app.core.utils import get_financial_year

from .models import BuyLot, FIFOGain, Transaction, round_money, round_units

logger = logging.getLogger(__name__)


def calculate_fifo_gains(
    transactions: List[Transaction],
    fund_type_mapping: Dict[str, str],
    manual_overrides: Dict[str, str]
) -> List[FIFOGain]:
    """
    Calculate FIFO capital gains from transactions.

    Args:
        transactions: List of Transaction objects (should be sorted by date)
        fund_type_mapping: Dictionary mapping ticker symbols to fund types
        manual_overrides: Dictionary of manual fund type overrides

    Returns:
        List of FIFOGain objects
    """
    # Group by ticker||folio
    buckets: Dict[str, List[Transaction]] = defaultdict(list)
    for tx in transactions:
        key = f"{tx.ticker}||{tx.folio}"
        buckets[key].append(tx)

    # Sort each bucket by date
    for key in buckets:
        buckets[key].sort(key=lambda t: t.date)

    all_gains = []

    for key, bucket_txs in buckets.items():
        fifo_queue: List[BuyLot] = []

        for tx in bucket_txs:
            if tx.side == 'buy':
                lot = BuyLot(
                    date=tx.date,
                    units=tx.units,
                    cost_per_unit=tx.nav,
                    original_units=tx.units,
                    original_total_cost=abs(tx.amount)
                )
                fifo_queue.append(lot)

            elif tx.side == 'sell':
                units_to_match = tx.units

                while units_to_match > Decimal('0') and fifo_queue:
                    lot = fifo_queue[0]

                    units_matched = min(units_to_match, lot.units_left)
                    units_matched = round_units(units_matched)

                    # Calculate cost and proceeds
                    if units_matched == lot.units_left and units_matched == lot.original_units:
                        cost = lot.original_total_cost
                    else:
                        cost = round_money(units_matched * lot.cost_per_unit)

                    proceeds = round_money(units_matched * tx.nav)
                    gain = round_money(proceeds - cost)

                    holding_days = (tx.date - lot.date).days

                    # Determine fund type
                    fund_type = manual_overrides.get(tx.ticker) or fund_type_mapping.get(tx.ticker, 'unknown')

                    # Determine term (short-term vs long-term) using tax rules
                    if fund_type == 'equity':
                        term = get_equity_fund_term(holding_days)
                    elif fund_type == 'debt':
                        term = get_debt_fund_term(buy_date=lot.date, sell_date=tx.date)
                    else:
                        # For unknown fund types, treat as debt (more conservative approach)
                        term = get_debt_fund_term(buy_date=lot.date, sell_date=tx.date)

                    financial_year = get_financial_year(tx.date)

                    fifo_gain = FIFOGain(
                        sell_date=tx.date.strftime('%Y-%m-%d'),
                        ticker=tx.ticker,
                        folio=tx.folio,
                        units=units_matched,
                        sell_nav=tx.nav,
                        proceeds=proceeds,
                        buy_date=lot.date.strftime('%Y-%m-%d'),
                        buy_nav=lot.cost_per_unit,
                        cost_basis=cost,
                        gain=gain,
                        holding_days=holding_days,
                        fund_type=fund_type,
                        term=term,
                        financial_year=financial_year
                    )
                    all_gains.append(fifo_gain)

                    units_to_match = round_units(units_to_match - units_matched)
                    lot.units_left = round_units(lot.units_left - units_matched)

                    if lot.units_left <= Decimal('0'):
                        fifo_queue.pop(0)

                if units_to_match > Decimal('0'):
                    logger.warning(
                        f"Unmatched units for {tx.ticker} (folio {tx.folio}): "
                        f"{units_to_match} units on {tx.date.strftime('%Y-%m-%d')}"
                    )

    return all_gains
