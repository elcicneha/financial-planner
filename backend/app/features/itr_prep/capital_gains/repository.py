"""
Data access layer for capital gains calculations.

Handles loading transactions, fund type overrides, and cache management.
"""

import json
import logging
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Dict, List

from app.config import (
    OUTPUTS_DIR,
    FIFO_CACHE_DIR,
    FIFO_CACHE_FILE,
    FIFO_METADATA_FILE,
    FUND_TYPE_OVERRIDES_FILE,
)
from app.shared.persistence import ICapitalGainsRepository

from .cache_manager import get_transaction_file_ids
from .models import FIFOGain, Transaction, round_nav, round_units

logger = logging.getLogger(__name__)


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


class FileCapitalGainsRepository(ICapitalGainsRepository):
    """File-based implementation of capital gains repository."""

    def load_transactions(self) -> List[Transaction]:
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
                                     str(round_units(units)), str(round_nav(nav)))

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

    def load_fund_type_overrides(self) -> Dict[str, str]:
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

    def save_fund_type_override(self, ticker: str, fund_type: str) -> None:
        """
        Save a manual fund type override.

        Args:
            ticker: Fund ticker symbol
            fund_type: 'equity' or 'debt'

        Raises:
            ValueError: If fund_type is invalid.
        """
        if fund_type not in ['equity', 'debt']:
            raise ValueError(f"Invalid fund_type: {fund_type}. Must be 'equity' or 'debt'")

        overrides = self.load_fund_type_overrides()
        overrides[ticker] = fund_type

        FUND_TYPE_OVERRIDES_FILE.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(FUND_TYPE_OVERRIDES_FILE, 'w', encoding='utf-8') as f:
                json.dump(overrides, f, indent=2)
            logger.info(f"Saved override: {ticker} → {fund_type}")
        except Exception as e:
            logger.error(f"Error saving fund type override: {e}")
            raise

    def save_fund_type_overrides_batch(self, overrides_dict: Dict[str, str]) -> None:
        """
        Save multiple manual fund type overrides atomically.

        Args:
            overrides_dict: Dictionary mapping ticker symbols to 'equity' or 'debt'

        Raises:
            ValueError: If any fund_type is invalid.
        """
        # Validate all entries first
        for ticker, fund_type in overrides_dict.items():
            if fund_type not in ['equity', 'debt']:
                raise ValueError(f"Invalid fund_type for {ticker}: {fund_type}. Must be 'equity' or 'debt'")

        # Load current overrides
        overrides = self.load_fund_type_overrides()

        # Update with all new values
        overrides.update(overrides_dict)

        FUND_TYPE_OVERRIDES_FILE.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(FUND_TYPE_OVERRIDES_FILE, 'w', encoding='utf-8') as f:
                json.dump(overrides, f, indent=2)
            logger.info(f"Saved {len(overrides_dict)} fund type overrides: {list(overrides_dict.keys())}")
        except Exception as e:
            logger.error(f"Error saving fund type overrides: {e}")
            raise

    def load_cached_gains(self) -> List[Dict]:
        """
        Load cached FIFO gains from file.

        Returns:
            List of gain dictionaries.

        Raises:
            FileNotFoundError: If cache file doesn't exist.
        """
        if not FIFO_CACHE_FILE.exists():
            raise FileNotFoundError("Cache file not found")

        try:
            with open(FIFO_CACHE_FILE, 'r', encoding='utf-8') as f:
                gains = json.load(f)
            logger.info(f"Loaded {len(gains)} gains from cache")
            return gains
        except Exception as e:
            logger.error(f"Error reading cache: {e}")
            raise

    def save_cached_gains(self, gains: List[FIFOGain]) -> None:
        """
        Save FIFO gains to cache.

        Args:
            gains: List of FIFOGain objects to cache.
        """
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

    def get_last_updated(self) -> str:
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
