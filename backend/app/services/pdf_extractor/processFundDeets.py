import re
from pathlib import Path
from typing import Optional

import pandas as pd


def clean_fund_details(
    input_csv: str, isin_ticker_db: str, work_dir: Optional[Path] = None
) -> str:
    """
    Extract ISIN and Folio numbers from the fund details CSV and map them to their corresponding ticker symbols.

    Args:
        input_csv: Path to the input CSV containing fund details.
        isin_ticker_db: Path to the CSV file containing ISIN to Ticker mappings.
        work_dir: Directory to create output file. If None, uses input file's directory.

    Returns:
        Path to the cleaned output CSV file.
    """
    input_path = Path(input_csv)

    if work_dir is None:
        work_dir = input_path.parent

    df = pd.read_csv(input_csv, header=0, names=['Raw Data']).copy()

    def extract_isin(text: str) -> str:
        text_clean = re.sub(r'[\x00-\x1F\x7F]', '', text)
        match = re.search(r"ISIN:\s(.*?)\(Advisor:", text_clean)
        return match.group(1).strip() if match else ''

    def extract_folio(text: str) -> str:
        match = re.search(r"Folio No:\s(.+)", text)
        return match.group(1).strip() if match else ''

    df.loc[:, 'ISIN'] = df['Raw Data'].apply(extract_isin)
    df.loc[:, 'Folio No.'] = df['Raw Data'].apply(extract_folio)
    df.loc[:, 'Row Number'] = range(1, len(df) + 1)

    isin_ticker_df = pd.read_csv(isin_ticker_db)
    isin_ticker_df.columns = ['ISIN', 'Ticker']

    cleaned_df = pd.merge(df, isin_ticker_df, on='ISIN', how='left')

    output_df = cleaned_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']]

    output_file = work_dir / f"{input_path.stem}_cleaned.csv"
    output_df.to_csv(output_file, index=False)

    return str(output_file)
