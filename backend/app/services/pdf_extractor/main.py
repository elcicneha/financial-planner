from pdfToTxt import pdf_to_txt
from extractTextToCSV import extract_text_to_csv
from processDatesData import process_dates_data
from processFundDeets import clean_fund_details
from finalCombine import combine_dates_and_fund_details

def main(pdf_path, isin_ticker_db):
    """
    Main function to process a PDF file into a final combined CSV file with all relevant data.

    Args:
        pdf_path (str): Path to the PDF file to process.
        isin_ticker_db (str): Path to the ISIN-to-Ticker database CSV file.

    Returns:
        str: Path to the final processed CSV file.
    """
    print("\n" + "=" * 50)
    print("PDF Investment Data Extractor")
    print("=" * 50)

    # Step 1: Extract text from the PDF and get the text file path
    print("\n[1/5] Extracting text from PDF...")
    txt_file_path = pdf_to_txt(pdf_path)

    # Step 2: Extract segments and create initial CSVs
    print("\n[2/5] Extracting segments to CSV...")
    fund_deets_csv, dates_data_csv = extract_text_to_csv(txt_file_path)

    # Step 3: Process the dates data
    print("\n[3/5] Processing dates data...")
    processed_dates_csv = process_dates_data(dates_data_csv)

    # Step 4: Clean the fund details
    print("\n[4/5] Cleaning fund details...")
    cleaned_fund_details_csv = clean_fund_details(fund_deets_csv, isin_ticker_db)

    # Step 5: Combine and finalize the data
    print("\n[5/5] Combining final data...")
    final_csv = combine_dates_and_fund_details(processed_dates_csv, cleaned_fund_details_csv)

    print("\n" + "=" * 50)
    print(f"✓ Complete! Output: {final_csv}")
    print("=" * 50 + "\n")

    return final_csv

# Example usage
if __name__ == "__main__":
    pdf_path = "CAMS-Mutual-Funds-2.pdf"
    isin_ticker_db = "isin_ticker_db.csv"
    main(pdf_path, isin_ticker_db)
