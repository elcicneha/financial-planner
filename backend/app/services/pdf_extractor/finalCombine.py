import pandas as pd

def combine_dates_and_fund_details(dates_csv, fund_details_csv):
    """
    Combines the processed dates data with fund details by matching row numbers and appends ISIN, Folio, and Ticker columns.

    Args:
        dates_csv (str): Path to the processed dates CSV file.
        fund_details_csv (str): Path to the cleaned fund details CSV file.

    Returns:
        str: Path to the combined and filtered output CSV file.
    """
    # Load the dates CSV and fund details CSV into DataFrames
    dates_df = pd.read_csv(dates_csv)
    fund_details_df = pd.read_csv(fund_details_csv)

    # Merge on Row Number to combine the data
    combined_df = pd.merge(dates_df, fund_details_df[['Row Number', 'ISIN', 'Folio No.', 'Ticker']], on='Row Number', how='left')

    # Filter rows where the "Desc" column contains specific transaction types
    transaction_types = ["purchase", "redemption", "switch-in", "switch-out", "switch in", "switch out", "systematic investment"]
    pattern = '|'.join(transaction_types)

    filtered_df = combined_df[combined_df['Desc'].str.contains(pattern, case=False, na=False)].copy()

    # Remove rows where the "Date" column is empty (NaN or blank)
    filtered_df = filtered_df.dropna(subset=['Date'])

    # Convert the "Date" column to datetime format (yyyy-mm-dd)
    filtered_df.loc[:, 'Date'] = pd.to_datetime(filtered_df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')

    # Sort by the "Date" column
    filtered_df = filtered_df.sort_values(by='Date').reset_index(drop=True)

    # Remove the "Row Number" column
    filtered_df = filtered_df.drop(columns=['Row Number'])

    # Add empty placeholder columns
    filtered_df['Current NAV'] = ''
    filtered_df['Action'] = ''
    filtered_df['Current Value'] = ''

    # Reorder columns to final order
    column_order = [
        'Date', 'Ticker', 'Current NAV', 'Action', 'Amount',
        'NAV', 'Units', 'Current Value', 'Unit Balance', 'Folio No.'
    ]
    filtered_df = filtered_df[column_order]

    # Generate the output file path
    output_file = "final_extracted_transactions.csv"

    # Save the filtered and combined data to a new CSV
    filtered_df.to_csv(output_file, index=False)

    print(f"  ✓ Saved {len(filtered_df)} transactions to {output_file}")

    return output_file

# # Example usage
# output_csv = combine_dates_and_fund_details('output_with_row_numbers.csv', 'extracted_fund_deets_cleaned.csv')
# print(f"Generated file: {output_csv}")
