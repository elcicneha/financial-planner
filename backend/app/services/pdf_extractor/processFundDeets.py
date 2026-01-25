import json
import re
import pandas as pd
import os

def clean_fund_details(input_csv, isin_ticker_db):
    """
    Extract ISIN and Folio numbers from the fund details CSV and map them to their corresponding ticker symbols.

    Args:
        input_csv (str): Path to the input CSV containing fund details.
        isin_ticker_db (str): Path to the JSON file containing ISIN to Ticker mappings.

    Returns:
        str: Path to the cleaned output CSV file.
    """
    # Load the input CSV into a DataFrame
    df = pd.read_csv(input_csv, header=None, names=['Raw Data'])

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
    df['ISIN'] = df['Raw Data'].apply(extract_isin)
    df['Folio No.'] = df['Raw Data'].apply(extract_folio)

    # Add Row Number for reference
    df['Row Number'] = range(1, len(df) + 1)

    # Load ISIN to Ticker mappings from JSON
    with open(isin_ticker_db, 'r', encoding='utf-8') as f:
        isin_ticker_data = json.load(f)

    isin_ticker_df = pd.DataFrame(isin_ticker_data)
    isin_ticker_df = isin_ticker_df[['ISIN', 'Ticker']]  # Select only needed columns

    # Merge the data with ISIN to Ticker mapping
    cleaned_df = pd.merge(df, isin_ticker_df, on='ISIN', how='left')

    # Select and reorder columns for output
    output_df = cleaned_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']]

    # Generate the output file path
    base_name = os.path.splitext(input_csv)[0]
    output_file = f"{base_name}_cleaned.csv"

    # Save the cleaned data to a new CSV
    output_df.to_csv(output_file, index=False)

    print(f"Cleaned fund details have been saved to {output_file}")

    return output_file

# Example usage
if __name__ == "__main__":
    output_csv = clean_fund_details('extracted_fund_deets.csv', 'isin_ticker_db.json')
    print(f"Generated file: {output_csv}")
