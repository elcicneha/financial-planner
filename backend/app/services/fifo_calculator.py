"""
FIFO Capital Gains Calculator

This module calculates capital gains/losses using FIFO (First-In-First-Out) methodology
for mutual fund transactions.
"""

import os
import csv
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
OUTPUTS_DIR = BASE_DIR / "data" / "outputs"
CACHE_DIR = OUTPUTS_DIR / "fifo_cache"
CACHE_FILE = CACHE_DIR / "capital_gains_full.csv"
METADATA_FILE = CACHE_DIR / "cache_metadata.json"


class Transaction:
    """Represents a single transaction"""
    def __init__(self, date: datetime, ticker: str, folio: str,
                 side: str, nav: float, units: float, amount: float):
        self.date = date
        self.ticker = ticker
        self.folio = folio
        self.side = side  # 'buy' or 'sell'
        self.nav = round(nav, 4)
        self.units = round(abs(units), 3)  # Always positive
        self.amount = amount


class BuyLot:
    """Represents a buy lot in the FIFO queue"""
    def __init__(self, date: datetime, units: float, cost_per_unit: float,
                 original_units: float, original_total_cost: float):
        self.date = date
        self.units_left = round(units, 3)
        self.cost_per_unit = round(cost_per_unit, 4)
        self.original_units = round(original_units, 3)
        self.original_total_cost = round(original_total_cost, 2)


class FIFOGain:
    """Represents a FIFO gain calculation result"""
    def __init__(self, sell_date: str, ticker: str, folio: str, units: float,
                 sell_nav: float, proceeds: float, buy_date: str, buy_nav: float,
                 cost_basis: float, gain: float, holding_days: int, term: str):
        self.sell_date = sell_date
        self.ticker = ticker
        self.folio = folio
        self.units = units
        self.sell_nav = sell_nav
        self.proceeds = proceeds  # Sale Consideration
        self.buy_date = buy_date
        self.buy_nav = buy_nav
        self.cost_basis = cost_basis  # Acquisition Cost
        self.gain = gain
        self.holding_days = holding_days
        self.term = term  # 'Short-term' or 'Long-term'

    def to_dict(self) -> Dict:
        return {
            'sell_date': self.sell_date,
            'ticker': self.ticker,
            'folio': self.folio,
            'units': self.units,
            'sell_nav': self.sell_nav,
            'sale_consideration': self.proceeds,
            'buy_date': self.buy_date,
            'buy_nav': self.buy_nav,
            'acquisition_cost': self.cost_basis,
            'gain': self.gain,
            'holding_days': self.holding_days,
            'term': self.term
        }


def get_transaction_file_ids() -> List[str]:
    """
    Get list of all transaction file IDs by scanning outputs directory

    Returns:
        Sorted list of file IDs (e.g., ['b720420e', 'c831531f'])
    """
    file_ids = []

    if not OUTPUTS_DIR.exists():
        return file_ids

    # Scan all date directories
    for date_dir in OUTPUTS_DIR.iterdir():
        if not date_dir.is_dir() or date_dir.name == 'fifo_cache':
            continue

        # Look for transactions_*.csv files
        for csv_file in date_dir.glob('transactions_*.csv'):
            # Extract file_id from filename: transactions_{file_id}.csv
            filename = csv_file.stem  # Remove .csv
            file_id = filename.replace('transactions_', '')
            file_ids.append(file_id)

    return sorted(file_ids)


def is_cache_valid() -> bool:
    """
    Check if cache is valid by comparing current file IDs with cached file IDs

    Returns:
        True if cache is valid, False otherwise
    """
    if not CACHE_FILE.exists() or not METADATA_FILE.exists():
        return False

    try:
        # Read cached metadata
        with open(METADATA_FILE, 'r') as f:
            metadata = json.load(f)
            cached_file_ids = metadata.get('processed_file_ids', [])

        # Get current file IDs
        current_file_ids = get_transaction_file_ids()

        # Compare
        return cached_file_ids == current_file_ids

    except Exception as e:
        logger.error(f"Error checking cache validity: {e}")
        return False


def parse_transaction_side(units_str: str) -> Tuple[str, float]:
    """
    Parse transaction side (buy/sell) from units string

    Args:
        units_str: Units string (e.g., "142.297" or "(142.297)")

    Returns:
        Tuple of (side, units_value) where side is 'buy' or 'sell'
    """
    units_str = str(units_str).strip()

    # Check for parentheses notation (indicates negative/sell)
    if units_str.startswith('(') and units_str.endswith(')'):
        # Remove parentheses and convert
        units_value = float(units_str[1:-1].replace(',', ''))
        return 'sell', abs(units_value)
    else:
        # Regular number
        units_value = float(str(units_str).replace(',', ''))
        if units_value < 0:
            return 'sell', abs(units_value)
        else:
            return 'buy', units_value


def load_all_transactions() -> List[Transaction]:
    """
    Load all transactions from all CSV files in outputs directory

    Returns:
        List of Transaction objects, deduplicated and sorted by date
    """
    all_transactions = []
    seen_transactions = set()

    if not OUTPUTS_DIR.exists():
        logger.warning(f"Outputs directory not found: {OUTPUTS_DIR}")
        return all_transactions

    # Scan all date directories
    for date_dir in OUTPUTS_DIR.iterdir():
        if not date_dir.is_dir() or date_dir.name == 'fifo_cache':
            continue

        # Look for transactions_*.csv files
        for csv_file in date_dir.glob('transactions_*.csv'):
            logger.info(f"Loading transactions from: {csv_file}")

            try:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)

                    for row in reader:
                        # Parse date
                        try:
                            date = datetime.strptime(row['Date'].strip(), '%Y-%m-%d')
                        except ValueError:
                            logger.warning(f"Invalid date format: {row['Date']}")
                            continue

                        # Parse ticker and folio
                        ticker = row['Ticker'].strip()
                        folio = row['Folio No.'].strip()

                        if not ticker:
                            continue

                        # Parse NAV
                        try:
                            nav = float(row['NAV'].replace(',', ''))
                        except (ValueError, KeyError):
                            logger.warning(f"Invalid NAV: {row.get('NAV')}")
                            continue

                        # Parse units and determine side
                        try:
                            side, units = parse_transaction_side(row['Units'])
                        except (ValueError, KeyError):
                            logger.warning(f"Invalid units: {row.get('Units')}")
                            continue

                        # Parse amount
                        try:
                            amount_str = row['Amount'].strip()
                            if amount_str.startswith('(') and amount_str.endswith(')'):
                                amount = -float(amount_str[1:-1].replace(',', ''))
                            else:
                                amount = float(amount_str.replace(',', ''))
                        except (ValueError, KeyError):
                            logger.warning(f"Invalid amount: {row.get('Amount')}")
                            continue

                        # Create deduplication key
                        dedup_key = (date.strftime('%Y-%m-%d'), ticker, folio,
                                   round(units, 3), round(nav, 4))

                        if dedup_key in seen_transactions:
                            logger.debug(f"Duplicate transaction skipped: {dedup_key}")
                            continue

                        seen_transactions.add(dedup_key)

                        # Create transaction
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

            except Exception as e:
                logger.error(f"Error loading {csv_file}: {e}")
                continue

    # Sort by date
    all_transactions.sort(key=lambda t: t.date)

    logger.info(f"Loaded {len(all_transactions)} transactions")
    return all_transactions


def calculate_fifo_gains(transactions: List[Transaction]) -> List[FIFOGain]:
    """
    Calculate FIFO capital gains from transactions

    Args:
        transactions: List of Transaction objects (should be sorted by date)

    Returns:
        List of FIFOGain objects
    """
    # Group by ticker||folio
    buckets = defaultdict(list)
    for tx in transactions:
        key = f"{tx.ticker}||{tx.folio}"
        buckets[key].append(tx)

    # Sort each bucket by date (should already be sorted, but ensure)
    for key in buckets:
        buckets[key].sort(key=lambda t: t.date)

    # Process each bucket with FIFO
    all_gains = []

    for key, bucket_txs in buckets.items():
        fifo_queue: List[BuyLot] = []

        for tx in bucket_txs:
            if tx.side == 'buy':
                # Add to FIFO queue
                lot = BuyLot(
                    date=tx.date,
                    units=tx.units,
                    cost_per_unit=tx.nav,
                    original_units=tx.units,
                    original_total_cost=abs(tx.amount)
                )
                fifo_queue.append(lot)

            elif tx.side == 'sell':
                # Match against FIFO queue
                units_to_match = tx.units

                while units_to_match > 0 and fifo_queue:
                    lot = fifo_queue[0]

                    # Determine how many units to take from this lot
                    units_matched = min(units_to_match, lot.units_left)
                    units_matched = round(units_matched, 3)

                    # Calculate cost and proceeds
                    if units_matched == lot.units_left and units_matched == lot.original_units:
                        # Taking entire original lot in one go
                        cost_raw = lot.original_total_cost
                    else:
                        # Partial take
                        cost_raw = units_matched * lot.cost_per_unit

                    proceeds_raw = units_matched * tx.nav

                    cost = round(cost_raw, 2)
                    proceeds = round(proceeds_raw, 2)
                    gain = round(proceeds - cost, 2)

                    # Calculate holding period
                    holding_days = (tx.date - lot.date).days
                    term = 'Long-term' if holding_days >= 365 else 'Short-term'

                    # Create gain record
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
                        term=term
                    )
                    all_gains.append(fifo_gain)

                    # Update remaining units
                    units_to_match = round(units_to_match - units_matched, 3)
                    lot.units_left = round(lot.units_left - units_matched, 3)

                    # Remove lot if exhausted
                    if lot.units_left <= 0:
                        fifo_queue.pop(0)

                if units_to_match > 0:
                    logger.warning(
                        f"⚠️ Unmatched units for {tx.ticker} (folio {tx.folio}): "
                        f"{units_to_match} units on {tx.date.strftime('%Y-%m-%d')}"
                    )

    return all_gains


def recalculate_and_cache_fifo() -> List[FIFOGain]:
    """
    Recalculate FIFO gains and save to cache

    Returns:
        List of FIFOGain objects
    """
    logger.info("Recalculating FIFO gains...")

    # Load all transactions
    transactions = load_all_transactions()

    if not transactions:
        logger.warning("No transactions found")
        return []

    # Calculate gains
    gains = calculate_fifo_gains(transactions)

    # Ensure cache directory exists
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Save gains to CSV
    with open(CACHE_FILE, 'w', newline='', encoding='utf-8') as f:
        if gains:
            fieldnames = list(gains[0].to_dict().keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for gain in gains:
                writer.writerow(gain.to_dict())

    # Save metadata
    metadata = {
        'last_computed': datetime.now().isoformat(),
        'processed_file_ids': get_transaction_file_ids(),
        'total_gains': len(gains)
    }
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"FIFO gains cached: {len(gains)} records")
    return gains


def get_cached_gains() -> List[Dict]:
    """
    Get cached FIFO gains, recalculating if cache is invalid

    Returns:
        List of gain dictionaries
    """
    if not is_cache_valid():
        logger.info("Cache invalid, recalculating...")
        gains = recalculate_and_cache_fifo()
        return [g.to_dict() for g in gains]

    # Read from cache
    logger.info("Reading from cache...")
    gains = []

    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert numeric fields
                row['units'] = float(row['units'])
                row['sell_nav'] = float(row['sell_nav'])
                row['sale_consideration'] = float(row['sale_consideration'])
                row['buy_nav'] = float(row['buy_nav'])
                row['acquisition_cost'] = float(row['acquisition_cost'])
                row['gain'] = float(row['gain'])
                row['holding_days'] = int(row['holding_days'])
                gains.append(row)
    except Exception as e:
        logger.error(f"Error reading cache: {e}")
        # Recalculate on error
        gains_obj = recalculate_and_cache_fifo()
        return [g.to_dict() for g in gains_obj]

    logger.info(f"Loaded {len(gains)} gains from cache")
    return gains
