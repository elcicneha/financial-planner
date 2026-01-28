"""
Market Cap Info Updater

Scrapes market cap breakdown data from fund pages and updates the database.
This is a maintenance script, not part of the main extraction pipeline.
"""

import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Default database file path
DEFAULT_DB_FILE = Path(__file__).parent / "isin_ticker_links_db.csv"


def scrape_market_cap_data(url: str, timeout: int = 10) -> Optional[Dict[str, str]]:
    """
    Scrape market cap breakdown from a fund page.

    Args:
        url: URL to scrape.
        timeout: Request timeout in seconds.

    Returns:
        Dictionary mapping category names to percentages, or None on failure.
    """
    if not url or not url.strip():
        return None

    try:
        response = requests.get(
            url,
            headers={'User-Agent': 'Mozilla/5.0'},
            timeout=timeout
        )
        response.raise_for_status()
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')
    holding_list = soup.find(class_='holding-list')

    if not holding_list:
        logger.debug(f"No 'holding-list' element found for: {url}")
        return None

    data: Dict[str, str] = {}
    for block in holding_list.find_all(class_='mfScheme-fund-progress'):
        category = block.select_one('.funds-top-label')
        percentage = block.select_one('.pull-right')

        if category and percentage:
            data[category.get_text(strip=True)] = percentage.get_text(strip=True)

    return data


def load_database(file_path: Path) -> tuple[List[str], List[Dict[str, str]]]:
    """
    Load the CSV database into memory.

    Args:
        file_path: Path to the CSV file.

    Returns:
        Tuple of (headers, rows) where rows is a list of dictionaries.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = list(reader)

    return list(headers), rows


def save_database(file_path: Path, headers: List[str], rows: List[Dict[str, str]]) -> None:
    """
    Save the database back to CSV.

    Args:
        file_path: Path to the CSV file.
        headers: Column headers.
        rows: List of row dictionaries.
    """
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def update_market_cap_info(file_path: Optional[Path] = None) -> int:
    """
    Update market cap info for all funds in the database.

    Args:
        file_path: Path to the database CSV. Defaults to isin_ticker_links_db.csv.

    Returns:
        Number of rows successfully updated.
    """
    if file_path is None:
        file_path = DEFAULT_DB_FILE

    if not file_path.exists():
        logger.error(f"Database file not found: {file_path}")
        return 0

    headers, rows = load_database(file_path)

    # The last 4 columns are the market cap categories
    market_cap_columns = headers[-4:] if len(headers) >= 4 else []

    if not market_cap_columns:
        logger.warning("No market cap columns found in database")
        return 0

    updated_count = 0

    for i, row in enumerate(rows):
        url = row.get('Link', '').strip()

        if not url:
            continue

        data = scrape_market_cap_data(url)

        if data:
            for category, percentage in data.items():
                if category in market_cap_columns:
                    rows[i][category] = percentage

            updated_count += 1
            logger.info(f"Updated: {row.get('Ticker', 'Unknown')} ({i + 1}/{len(rows)})")

    save_database(file_path, headers, rows)
    logger.info(f"Database updated: {updated_count}/{len(rows)} rows")

    return updated_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_market_cap_info()
