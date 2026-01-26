"""
FIFO Capital Gains Calculator

This module calculates capital gains/losses using FIFO (First-In-First-Out) methodology
for mutual fund transactions. Uses Decimal for financial precision.
"""

import json
import logging
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, List, Optional

from app.config import (
    OUTPUTS_DIR,
    FIFO_CACHE_DIR,
    FIFO_CACHE_FILE,
    FIFO_METADATA_FILE,
    FUND_TYPE_OVERRIDES_FILE,
    ISIN_TICKER_LINKS_DB,
    EQUITY_LTCG_THRESHOLD_DAYS,
    DEBT_LTCG_THRESHOLD_DAYS,
    EQUITY_PERCENTAGE_THRESHOLD,
)
from app.utils import get_financial_year

logger = logging.getLogger(__name__)

# Decimal precision constants
UNITS_PRECISION = Decimal('0.001')
NAV_PRECISION = Decimal('0.0001')
MONEY_PRECISION = Decimal('0.01')


def _to_decimal(value: float | str | Decimal) -> Decimal:
    """Convert a value to Decimal safely."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _round_units(value: Decimal) -> Decimal:
    """Round units to 3 decimal places."""
    return value.quantize(UNITS_PRECISION, ROUND_HALF_UP)


def _round_nav(value: Decimal) -> Decimal:
    """Round NAV to 4 decimal places."""
    return value.quantize(NAV_PRECISION, ROUND_HALF_UP)


def _round_money(value: Decimal) -> Decimal:
    """Round money to 2 decimal places."""
    return value.quantize(MONEY_PRECISION, ROUND_HALF_UP)


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


def load_fund_type_overrides() -> Dict[str, str]:
    """
    Load manual fund type overrides from JSON file.

    Returns:
        Dictionary mapping ticker symbols to 'equity' or 'debt'.
    """
    if not FUND_TYPE_OVERRIDES_FILE.exists():
        return {}

    try:
        with open(FUND_TYPE_OVERRIDES_FILE, 'r', encoding='utf-8') as f:
            overrides = json.load(f)
            logger.info(f"Loaded {len(overrides)} fund type overrides")
            return overrides
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in fund type overrides file: {e}")
        return {}
    except Exception as e:
        logger.error(f"Error loading fund type overrides: {e}")
        return {}


def save_fund_type_override(ticker: str, fund_type: str) -> None:
    """
    Save a manual fund type override and invalidate FIFO cache.

    Args:
        ticker: Fund ticker symbol
        fund_type: 'equity' or 'debt'

    Raises:
        ValueError: If fund_type is invalid.
    """
    if fund_type not in ['equity', 'debt']:
        raise ValueError(f"Invalid fund_type: {fund_type}. Must be 'equity' or 'debt'")

    overrides = load_fund_type_overrides()
    overrides[ticker] = fund_type

    FUND_TYPE_OVERRIDES_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(FUND_TYPE_OVERRIDES_FILE, 'w', encoding='utf-8') as f:
            json.dump(overrides, f, indent=2)
        logger.info(f"Saved override: {ticker} → {fund_type}")
    except Exception as e:
        logger.error(f"Error saving fund type override: {e}")
        raise

    # Invalidate FIFO cache
    invalidate_fifo_cache()


def invalidate_fifo_cache() -> None:
    """Delete FIFO cache files to force recalculation."""
    try:
        if FIFO_CACHE_FILE.exists():
            FIFO_CACHE_FILE.unlink()
            logger.info("FIFO cache invalidated")
        if FIFO_METADATA_FILE.exists():
            FIFO_METADATA_FILE.unlink()
            logger.info("FIFO cache metadata deleted")
    except Exception as e:
        logger.warning(f"Error invalidating cache: {e}")


class Transaction:
    """Represents a single transaction."""
    __slots__ = ('date', 'ticker', 'folio', 'side', 'nav', 'units', 'amount')

    def __init__(self, date: datetime, ticker: str, folio: str,
                 side: str, nav: Decimal, units: Decimal, amount: Decimal):
        self.date = date
        self.ticker = ticker
        self.folio = folio
        self.side = side  # 'buy' or 'sell'
        self.nav = _round_nav(nav)
        self.units = _round_units(abs(units))
        self.amount = amount


class BuyLot:
    """Represents a buy lot in the FIFO queue."""
    __slots__ = ('date', 'units_left', 'cost_per_unit', 'original_units', 'original_total_cost')

    def __init__(self, date: datetime, units: Decimal, cost_per_unit: Decimal,
                 original_units: Decimal, original_total_cost: Decimal):
        self.date = date
        self.units_left = _round_units(units)
        self.cost_per_unit = _round_nav(cost_per_unit)
        self.original_units = _round_units(original_units)
        self.original_total_cost = _round_money(original_total_cost)


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


def get_transaction_file_ids() -> List[str]:
    """
    Get list of all transaction file IDs by scanning outputs directory.

    Returns:
        Sorted list of file IDs (e.g., ['b720420e', 'c831531f'])
    """
    file_ids = []

    if not OUTPUTS_DIR.exists():
        return file_ids

    for date_dir in OUTPUTS_DIR.iterdir():
        if not date_dir.is_dir() or date_dir.name == 'fifo_cache':
            continue

        for json_file in date_dir.glob('transactions_*.json'):
            file_id = json_file.stem.replace('transactions_', '')
            file_ids.append(file_id)

    return sorted(file_ids)


def is_cache_valid() -> bool:
    """
    Check if cache is valid by comparing current file IDs with cached file IDs.

    Returns:
        True if cache is valid, False otherwise.
    """
    if not FIFO_CACHE_FILE.exists() or not FIFO_METADATA_FILE.exists():
        return False

    try:
        with open(FIFO_METADATA_FILE, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            cached_file_ids = metadata.get('processed_file_ids', [])

        current_file_ids = get_transaction_file_ids()
        return cached_file_ids == current_file_ids
    except Exception as e:
        logger.error(f"Error checking cache validity: {e}")
        return False


def parse_transaction_side(units_str: str) -> tuple[str, Decimal]:
    """
    Parse transaction side (buy/sell) from units string.

    Args:
        units_str: Units string (e.g., "142.297" or "(142.297)")

    Returns:
        Tuple of (side, units_value) where side is 'buy' or 'sell'
    """
    units_str = str(units_str).strip()

    if units_str.startswith('(') and units_str.endswith(')'):
        units_value = Decimal(units_str[1:-1].replace(',', ''))
        return 'sell', abs(units_value)
    else:
        units_value = Decimal(units_str.replace(',', ''))
        if units_value < 0:
            return 'sell', abs(units_value)
        return 'buy', units_value


def load_all_transactions() -> List[Transaction]:
    """
    Load all transactions from all JSON files in outputs directory.

    Returns:
        List of Transaction objects, deduplicated and sorted by date.
    """
    all_transactions = []
    seen_transactions = set()

    if not OUTPUTS_DIR.exists():
        logger.warning(f"Outputs directory not found: {OUTPUTS_DIR}")
        return all_transactions

    for date_dir in OUTPUTS_DIR.iterdir():
        if not date_dir.is_dir() or date_dir.name == 'fifo_cache':
            continue

        for json_file in date_dir.glob('transactions_*.json'):
            logger.info(f"Loading transactions from: {json_file}")

            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for row in data.get('transactions', []):
                    try:
                        date = datetime.strptime(row['date'], '%Y-%m-%d')
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Invalid date: {row.get('date')} - {e}")
                        continue

                    ticker = row.get('ticker', '').strip()
                    folio = row.get('folio', '').strip()

                    if not ticker:
                        continue

                    try:
                        nav = Decimal(str(row['nav']).replace(',', ''))
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Invalid NAV: {row.get('nav')} - {e}")
                        continue

                    try:
                        side, units = parse_transaction_side(row['units'])
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Invalid units: {row.get('units')} - {e}")
                        continue

                    try:
                        amount_str = str(row['amount']).strip()
                        if amount_str.startswith('(') and amount_str.endswith(')'):
                            amount = -Decimal(amount_str[1:-1].replace(',', ''))
                        else:
                            amount = Decimal(amount_str.replace(',', ''))
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Invalid amount: {row.get('amount')} - {e}")
                        continue

                    # Create deduplication key
                    dedup_key = (date.strftime('%Y-%m-%d'), ticker, folio,
                                 str(_round_units(units)), str(_round_nav(nav)))

                    if dedup_key in seen_transactions:
                        logger.debug(f"Duplicate transaction skipped: {dedup_key}")
                        continue

                    seen_transactions.add(dedup_key)

                    transaction = Transaction(
                        date=date,
                        ticker=ticker,
                        folio=folio,
                        side=side,
                        nav=nav,
                        units=units,
                        amount=amount
                    )
                    all_transactions.append(transaction)

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in {json_file}: {e}")
                continue
            except Exception as e:
                logger.error(f"Error loading {json_file}: {e}")
                continue

    all_transactions.sort(key=lambda t: t.date)
    logger.info(f"Loaded {len(all_transactions)} transactions")
    return all_transactions


def calculate_fifo_gains(transactions: List[Transaction]) -> List[FIFOGain]:
    """
    Calculate FIFO capital gains from transactions.

    Args:
        transactions: List of Transaction objects (should be sorted by date)

    Returns:
        List of FIFOGain objects
    """
    manual_overrides = load_fund_type_overrides()
    fund_type_mapping = get_fund_type_mapping()

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
                    units_matched = _round_units(units_matched)

                    # Calculate cost and proceeds
                    if units_matched == lot.units_left and units_matched == lot.original_units:
                        cost = lot.original_total_cost
                    else:
                        cost = _round_money(units_matched * lot.cost_per_unit)

                    proceeds = _round_money(units_matched * tx.nav)
                    gain = _round_money(proceeds - cost)

                    holding_days = (tx.date - lot.date).days

                    # Determine fund type
                    fund_type = manual_overrides.get(tx.ticker) or fund_type_mapping.get(tx.ticker, 'unknown')

                    # Apply threshold based on fund type
                    if fund_type == 'equity':
                        threshold_days = EQUITY_LTCG_THRESHOLD_DAYS
                    else:
                        threshold_days = DEBT_LTCG_THRESHOLD_DAYS

                    term = 'Long-term' if holding_days >= threshold_days else 'Short-term'
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

                    units_to_match = _round_units(units_to_match - units_matched)
                    lot.units_left = _round_units(lot.units_left - units_matched)

                    if lot.units_left <= Decimal('0'):
                        fifo_queue.pop(0)

                if units_to_match > Decimal('0'):
                    logger.warning(
                        f"Unmatched units for {tx.ticker} (folio {tx.folio}): "
                        f"{units_to_match} units on {tx.date.strftime('%Y-%m-%d')}"
                    )

    return all_gains


def recalculate_and_cache_fifo() -> List[FIFOGain]:
    """
    Recalculate FIFO gains and save to cache.

    Returns:
        List of FIFOGain objects
    """
    logger.info("Recalculating FIFO gains...")

    transactions = load_all_transactions()

    if not transactions:
        logger.warning("No transactions found")
        return []

    gains = calculate_fifo_gains(transactions)

    FIFO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Save gains to JSON
    gains_data = [g.to_dict() for g in gains]
    with open(FIFO_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(gains_data, f)

    # Save metadata
    metadata = {
        'last_computed': datetime.now().isoformat(),
        'processed_file_ids': get_transaction_file_ids(),
        'total_gains': len(gains)
    }
    with open(FIFO_METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"FIFO gains cached: {len(gains)} records")
    return gains


def get_last_updated() -> str:
    """
    Get the most recent modification date of transaction files.

    Returns:
        ISO format timestamp of the most recently modified transaction file.
    """
    latest_mtime = None

    if OUTPUTS_DIR.exists():
        for date_dir in OUTPUTS_DIR.iterdir():
            if not date_dir.is_dir() or date_dir.name == 'fifo_cache':
                continue

            for json_file in date_dir.glob('transactions_*.json'):
                mtime = json_file.stat().st_mtime
                if latest_mtime is None or mtime > latest_mtime:
                    latest_mtime = mtime

    if latest_mtime is not None:
        return datetime.fromtimestamp(latest_mtime).isoformat()

    return datetime.now().isoformat()


def get_cached_gains() -> List[Dict]:
    """
    Get cached FIFO gains, recalculating if cache is invalid.

    Returns:
        List of gain dictionaries.
    """
    if not is_cache_valid():
        logger.info("Cache invalid, recalculating...")
        gains = recalculate_and_cache_fifo()
        return [g.to_dict() for g in gains]

    logger.info("Reading from cache...")

    try:
        with open(FIFO_CACHE_FILE, 'r', encoding='utf-8') as f:
            gains = json.load(f)
        logger.info(f"Loaded {len(gains)} gains from cache")
        return gains
    except Exception as e:
        logger.error(f"Error reading cache: {e}")
        gains = recalculate_and_cache_fifo()
        return [g.to_dict() for g in gains]
