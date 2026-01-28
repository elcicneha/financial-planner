import json
import re
import pandas as pd
import os
from datetime import datetime
from pathlib import Path
from typing import Optional


class CombineError(Exception):
    """Raised when combining data fails."""
    pass


def combine_dates_and_fund_details(dates_csv, fund_details_csv, work_dir: Optional[Path] = None):
    """
    Combines the processed dates data with fund details by matching row numbers and appends ISIN, Folio, and Ticker columns.

    Args:
        dates_csv (str): Path to the processed dates CSV file.
        fund_details_csv (str): Path to the cleaned fund details CSV file.
        work_dir: Directory to create output file. If None, uses dates_csv file's directory.

    Returns:
        str: Path to the combined and filtered output JSON file.
    """
    if work_dir is None:
        work_dir = Path(dates_csv).parent
    # Load the dates CSV and fund details CSV into DataFrames
    dates_df = pd.read_csv(dates_csv)
    fund_details_df = pd.read_csv(fund_details_csv)

    # Merge on Row Number to combine the data
    combined_df = pd.merge(dates_df, fund_details_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']], on='Row Number', how='left')

    # Filter rows where the "Desc" column contains specific transaction types
    transaction_types = ["purchase", "redemption", "switch-in", "switch-out", "switch in", "switch out", "systematic investment"]
    pattern = '|'.join(transaction_types)

    filtered_df = combined_df[combined_df['Desc'].str.contains(pattern, case=False, na=False)]

    # Remove rows where the "Date" column is empty (NaN or blank)
    filtered_df = filtered_df.dropna(subset=['Date'])

    # Convert the "Date" column to datetime format (yyyy-mm-dd)
    filtered_df['Date'] = pd.to_datetime(filtered_df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')

    # Sort by the "Date" column
    filtered_df = filtered_df.sort_values(by='Date').reset_index(drop=True)

    # Remove the "Row Number" column
    filtered_df = filtered_df.drop(columns=['Row Number'])

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

    # Generate the output file path
    output_file = work_dir / "final_extracted_transactions.json"

    output_data = {
        'created_at': datetime.now().isoformat(),
        'transaction_count': len(transactions),
        'transactions': transactions
    }

    # Save as JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)

    print(f"Combined and filtered data has been saved to {output_file}")

    return str(output_file)

# # Example usage
# output_csv = combine_dates_and_fund_details('output_with_row_numbers.csv', 'extracted_fund_deets_cleaned.csv')
# print(f"Generated file: {output_csv}")
