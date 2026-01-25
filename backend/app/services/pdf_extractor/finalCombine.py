import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


class CombineError(Exception):
    """Raised when combining data fails."""
    pass


def combine_dates_and_fund_details(
    dates_csv: str, fund_details_csv: str, work_dir: Optional[Path] = None
) -> str:
    """
    Combines the processed dates data with fund details and outputs as JSON.

    Args:
        dates_csv: Path to the processed dates CSV file.
        fund_details_csv: Path to the cleaned fund details CSV file.
        work_dir: Directory to create output file. If None, uses dates_csv file's directory.

    Returns:
        Path to the combined and filtered output JSON file.

    Raises:
        CombineError: If combining or filtering fails.
        FileNotFoundError: If input files don't exist.
    """
    if work_dir is None:
        work_dir = Path(dates_csv).parent

    dates_path = Path(dates_csv)
    fund_details_path = Path(fund_details_csv)

    if not dates_path.exists():
        raise FileNotFoundError(f"Dates CSV not found: {dates_csv}")
    if not fund_details_path.exists():
        raise FileNotFoundError(f"Fund details CSV not found: {fund_details_csv}")

    try:
        dates_df = pd.read_csv(dates_csv)
        fund_details_df = pd.read_csv(fund_details_csv)
    except pd.errors.EmptyDataError as e:
        logger.error(f"Empty CSV file: {e}")
        raise CombineError(f"Empty CSV file: {e}") from e
    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error: {e}")
        raise CombineError(f"CSV parsing error: {e}") from e

    combined_df = pd.merge(
        dates_df,
        fund_details_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']],
        on='Row Number',
        how='left'
    )

    transaction_types = [
        "purchase", "redemption", "switch-in", "switch-out",
        "switch in", "switch out", "systematic investment"
    ]
    pattern = '|'.join(transaction_types)

    filtered_df = combined_df[combined_df['Desc'].str.contains(pattern, case=False, na=False)].copy()
    filtered_df = filtered_df.dropna(subset=['Date'])

    if filtered_df.empty:
        logger.warning("No transactions found after filtering")
        raise CombineError("No valid transactions found in the PDF")

    # Convert dates
    filtered_df['Date'] = pd.to_datetime(filtered_df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    filtered_df = filtered_df.sort_values(by='Date').reset_index(drop=True)
    filtered_df = filtered_df.drop(columns=['Row Number'], errors='ignore')

    # Build transaction list for JSON output
    transactions = []
    for _, row in filtered_df.iterrows():
        transactions.append({
            'date': row.get('Date', ''),
            'ticker': row.get('Ticker', ''),
            'folio': row.get('Folio No.', ''),
            'isin': row.get('ISIN', ''),
            'amount': str(row.get('Amount', '')),
            'nav': str(row.get('NAV', '')),
            'units': str(row.get('Units', '')),
            'balance': str(row.get('Unit Balance', '')),
        })

    output_file = work_dir / "final_extracted_transactions.json"

    output_data = {
        'created_at': datetime.now().isoformat(),
        'transaction_count': len(transactions),
        'transactions': transactions
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)

    logger.info(f"Combined {len(transactions)} transactions to: {output_file}")
    return str(output_file)
