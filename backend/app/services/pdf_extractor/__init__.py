import os
import shutil
from pathlib import Path

from .pdfToTxt import pdf_to_txt
from .extractTextToCSV import extract_text_to_csv
from .processDatesData import process_dates_data
from .processFundDeets import clean_fund_details
from .finalCombine import combine_dates_and_fund_details


def extract_transactions(pdf_path: Path, output_dir: Path, file_id: str) -> Path:
    """
    Extract mutual fund transactions from a PDF and save as CSV.

    Args:
        pdf_path: Path to the uploaded PDF file
        output_dir: Directory to save the output CSV
        file_id: Unique identifier for naming the output file

    Returns:
        Path to the generated CSV file
    """
    # Get the directory containing this module (for isin_ticker_db.csv)
    module_dir = Path(__file__).parent
    isin_ticker_db = module_dir / "isin_ticker_db.csv"

    # Store original working directory
    original_cwd = os.getcwd()

    # Work in the upload directory (where intermediate files will be created)
    work_dir = pdf_path.parent
    os.chdir(work_dir)

    try:
        # Step 1: Extract text from PDF
        print("\n[1/5] Extracting text from PDF...")
        txt_file_path = pdf_to_txt(str(pdf_path))

        if not txt_file_path:
            raise Exception("Failed to extract text from PDF")

        # Step 2: Extract segments to CSV
        print("\n[2/5] Extracting segments to CSV...")
        fund_deets_csv, dates_data_csv = extract_text_to_csv(txt_file_path)

        if not fund_deets_csv or not dates_data_csv:
            raise Exception("Failed to extract segments from text")

        # Step 3: Process dates data
        print("\n[3/5] Processing dates data...")
        processed_dates_csv = process_dates_data(dates_data_csv)

        # Step 4: Clean fund details
        print("\n[4/5] Cleaning fund details...")
        cleaned_fund_details_csv = clean_fund_details(fund_deets_csv, str(isin_ticker_db))

        # Step 5: Combine final data
        print("\n[5/5] Combining final data...")
        final_csv = combine_dates_and_fund_details(processed_dates_csv, cleaned_fund_details_csv)

        # Move final CSV to output directory with proper name
        output_filename = f"transactions_{file_id}.csv"
        output_path = output_dir / output_filename

        shutil.move(final_csv, output_path)

        print(f"\n✓ Complete! Output: {output_path}")

        return output_path

    finally:
        # Restore original working directory
        os.chdir(original_cwd)
