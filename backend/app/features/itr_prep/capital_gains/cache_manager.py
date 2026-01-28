"""
Cache management for FIFO calculations.

Handles cache validation and invalidation based on transaction file changes.
"""

import json
import logging
from typing import List

from app.config import (
    FIFO_CACHE_FILE,
    FIFO_METADATA_FILE,
    OUTPUTS_DIR,
)

logger = logging.getLogger(__name__)


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


def invalidate_cache() -> None:
    """Delete cache files to force recalculation."""
    try:
        if FIFO_CACHE_FILE.exists():
            FIFO_CACHE_FILE.unlink()
            logger.info("FIFO cache invalidated")
        if FIFO_METADATA_FILE.exists():
            FIFO_METADATA_FILE.unlink()
            logger.info("FIFO cache metadata deleted")
    except Exception as e:
        logger.warning(f"Error invalidating cache: {e}")
