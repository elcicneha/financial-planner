from pathlib import Path
from typing import Optional

import pandas as pd


def combine_dates_and_fund_details(
    dates_csv: str, fund_details_csv: str, work_dir: Optional[Path] = None
) -> str:
    """
    Combines the processed dates data with fund details by matching row numbers and appends ISIN, Folio, and Ticker columns.

    Args:
        dates_csv: Path to the processed dates CSV file.
        fund_details_csv: Path to the cleaned fund details CSV file.
        work_dir: Directory to create output file. If None, uses dates_csv file's directory.

    Returns:
        Path to the combined and filtered output CSV file.
    """
    if work_dir is None:
        work_dir = Path(dates_csv).parent

    dates_df = pd.read_csv(dates_csv)
    fund_details_df = pd.read_csv(fund_details_csv)

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
    filtered_df.loc[:, 'Date'] = pd.to_datetime(filtered_df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    filtered_df = filtered_df.sort_values(by='Date').reset_index(drop=True)
    filtered_df = filtered_df.drop(columns=['Row Number'])

    filtered_df['Current NAV'] = ''
    filtered_df['Action'] = ''
    filtered_df['Current Value'] = ''

    column_order = [
        'Date', 'Ticker', 'Current NAV', 'Action', 'Amount',
        'NAV', 'Units', 'Current Value', 'Unit Balance', 'Folio No.'
    ]
    filtered_df = filtered_df[column_order]

    output_file = work_dir / "final_extracted_transactions.csv"
    filtered_df.to_csv(output_file, index=False)

    return str(output_file)
