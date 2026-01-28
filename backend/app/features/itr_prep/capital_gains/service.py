"""
Capital gains service orchestration layer.

Coordinates calculator, classifier, cache manager, and repository components.
"""

import logging
from typing import Dict, List

from app.shared.persistence import ICapitalGainsRepository

from .cache_manager import invalidate_cache, is_cache_valid
from .calculator import calculate_fifo_gains
from .classifier import get_fund_type_mapping
from .models import FIFOGain

logger = logging.getLogger(__name__)


class CapitalGainsService:
    """Service for calculating and managing capital gains."""

    def __init__(self, repository: ICapitalGainsRepository):
        self.repository = repository

    def get_capital_gains(self, force_recalculate: bool = False) -> List[FIFOGain]:
        """
        Get FIFO capital gains, recalculating if cache is invalid or forced.

        Args:
            force_recalculate: If True, forces recalculation regardless of cache status

        Returns:
            List of FIFOGain objects
        """
        if force_recalculate:
            logger.info("Force recalculation requested, invalidating cache...")
            invalidate_cache()
            return self._recalculate_and_cache()

        if not is_cache_valid():
            logger.info("Cache invalid, recalculating...")
            return self._recalculate_and_cache()

        logger.info("Reading from cache...")
        try:
            gains_data = self.repository.load_cached_gains()
            # Convert dicts back to FIFOGain objects
            gains = []
            for g in gains_data:
                from decimal import Decimal
                gain = FIFOGain(
                    sell_date=g['sell_date'],
                    ticker=g['ticker'],
                    folio=g['folio'],
                    units=Decimal(str(g['units'])),
                    sell_nav=Decimal(str(g['sell_nav'])),
                    proceeds=Decimal(str(g['sale_consideration'])),
                    buy_date=g['buy_date'],
                    buy_nav=Decimal(str(g['buy_nav'])),
                    cost_basis=Decimal(str(g['acquisition_cost'])),
                    gain=Decimal(str(g['gain'])),
                    holding_days=g['holding_days'],
                    fund_type=g['fund_type'],
                    term=g['term'],
                    financial_year=g['financial_year']
                )
                gains.append(gain)
            return gains
        except FileNotFoundError:
            logger.info("Cache not found, recalculating...")
            return self._recalculate_and_cache()
        except Exception as e:
            logger.error(f"Error reading cache: {e}, recalculating...")
            return self._recalculate_and_cache()

    def _recalculate_and_cache(self) -> List[FIFOGain]:
        """
        Recalculate FIFO gains and save to cache.

        Returns:
            List of FIFOGain objects
        """
        logger.info("Recalculating FIFO gains...")

        transactions = self.repository.load_transactions()

        if not transactions:
            logger.warning("No transactions found")
            return []

        fund_type_mapping = get_fund_type_mapping()
        manual_overrides = self.repository.load_fund_type_overrides()

        gains = calculate_fifo_gains(transactions, fund_type_mapping, manual_overrides)

        self.repository.save_cached_gains(gains)

        return gains

    def save_fund_type_override(self, ticker: str, fund_type: str) -> None:
        """
        Save a manual fund type override and invalidate cache.

        Args:
            ticker: Fund ticker symbol
            fund_type: 'equity' or 'debt'
        """
        self.repository.save_fund_type_override(ticker, fund_type)
        invalidate_cache()

    def save_fund_type_overrides_batch(self, overrides: Dict[str, str]) -> None:
        """
        Save multiple fund type overrides and invalidate cache.

        Args:
            overrides: Dictionary mapping ticker symbols to fund types
        """
        self.repository.save_fund_type_overrides_batch(overrides)
        invalidate_cache()

    def get_last_updated(self) -> str:
        """
        Get the most recent modification date of transaction files.

        Returns:
            ISO format timestamp
        """
        return self.repository.get_last_updated()
