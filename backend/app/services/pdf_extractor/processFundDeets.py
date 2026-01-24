import re
import pandas as pd
import os

def clean_fund_details(input_csv, isin_ticker_db):
    """
    Extract ISIN and Folio numbers from the fund details CSV and map them to their corresponding ticker symbols.

    Args:
        input_csv (str): Path to the input CSV containing fund details.
        isin_ticker_db (str): Path to the CSV file containing ISIN to Ticker mappings.

    Returns:
        str: Path to the cleaned output CSV file.
    """
    # Load the input CSV into a DataFrame (skip the header row)
    df = pd.read_csv(input_csv, header=0, names=['Raw Data']).copy()

    # Function to clean and extract ISIN from the Raw Data
    def extract_isin(text):
        # Replace line breaks (CHAR(10)) with a space and clean up extra spaces
        text_clean = re.sub(r'[\x00-\x1F\x7F]', '', text)  # Replace multiple spaces/newlines with a single space

        # Search for ISIN between "ISIN: " and "(Advisor:"
        match = re.search(r"ISIN:\s(.*?)\(Advisor:", text_clean)

        return match.group(1).strip() if match else ''

    # Function to extract Folio Number using regex
    def extract_folio(text):
        match = re.search(r"Folio No:\s(.+)", text)
        return match.group(1).strip() if match else ''

    # Apply the extraction functions
    df.loc[:, 'ISIN'] = df['Raw Data'].apply(extract_isin)
    df.loc[:, 'Folio No.'] = df['Raw Data'].apply(extract_folio)

    # Add Row Number for reference
    df.loc[:, 'Row Number'] = range(1, len(df) + 1)

    # Load ISIN to Ticker mappings
    isin_ticker_df = pd.read_csv(isin_ticker_db)
    isin_ticker_df.columns = ['ISIN', 'Ticker']  # Ensure column names are standardized

    # Merge the data with ISIN to Ticker mapping
    cleaned_df = pd.merge(df, isin_ticker_df, on='ISIN', how='left')

    # Flag missing ISIN-Ticker mappings
    missing_rows = cleaned_df[cleaned_df['Ticker'].isna()]
    empty_isins = missing_rows[missing_rows['ISIN'] == '']
    valid_missing = missing_rows[missing_rows['ISIN'] != '']['ISIN'].unique()

    if len(valid_missing) > 0:
        print(f"  ⚠ Missing ticker mappings for {len(valid_missing)} ISIN(s):")
        for isin in valid_missing:
            print(f"    - {isin}")
    if len(empty_isins) > 0:
        print(f"  ⚠ {len(empty_isins)} row(s) have no ISIN (extraction failed):")
        for _, row in empty_isins.iterrows():
            row_num = row['Row Number']
            raw_full = row['Raw Data'].replace('\n', '\\n')
            print(f"    - Row {row_num}: \"{raw_full}\"")

    # Select and reorder columns for output
    output_df = cleaned_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']]

    # Generate the output file path
    base_name = os.path.splitext(input_csv)[0]
    output_file = f"{base_name}_cleaned.csv"

    # Save the cleaned data to a new CSV
    output_df.to_csv(output_file, index=False)

    print(f"  ✓ Saved to {output_file}")

    return output_file

# Example usage
if __name__ == "__main__":
    output_csv = clean_fund_details('extracted_fund_deets.csv', 'isin_ticker_db.csv')
    print(f"Generated file: {output_csv}")
