"""
Application configuration and path constants.

Centralizes all path definitions and magic numbers to avoid duplication
across modules and make configuration changes easier.
"""

from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

# Upload and output directories
UPLOADS_DIR = DATA_DIR / "uploads"
OUTPUTS_DIR = DATA_DIR / "outputs"
CAS_DIR = DATA_DIR / "cas"

# FIFO cache
FIFO_CACHE_DIR = DATA_DIR / "fifo_cache"
FIFO_CACHE_FILE = FIFO_CACHE_DIR / "capital_gains.json"
FIFO_METADATA_FILE = FIFO_CACHE_DIR / "cache_metadata.json"
FUND_TYPE_OVERRIDES_FILE = DATA_DIR / "fund_type_overrides.json"

# Reference data
PDF_EXTRACTOR_DIR = BASE_DIR / "backend" / "app" / "services" / "pdf_extractor"
ISIN_TICKER_DB = PDF_EXTRACTOR_DIR / "isin_ticker_db.csv"
ISIN_TICKER_LINKS_DB = PDF_EXTRACTOR_DIR / "isin_ticker_links_db.csv"

# Constants
FILE_ID_LENGTH = 8  # Length of UUID prefix used for file IDs

# Tax thresholds (in days)
EQUITY_LTCG_THRESHOLD_DAYS = 365   # 1 year for equity funds
DEBT_LTCG_THRESHOLD_DAYS = 1095   # 3 years for debt funds

# Fund classification
EQUITY_PERCENTAGE_THRESHOLD = 65.0  # Minimum equity % to classify as equity fund


def ensure_directories() -> None:
    """Create all required data directories if they don't exist."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    CAS_DIR.mkdir(parents=True, exist_ok=True)
    FIFO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
