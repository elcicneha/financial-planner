import shutil
from pathlib import Path
from typing import List

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
    module_dir = Path(__file__).parent
    isin_ticker_db = module_dir / "isin_ticker_db.csv"

    work_dir = pdf_path.parent
    intermediate_files: List[Path] = []
    output_path = output_dir / f"transactions_{file_id}.csv"

    try:
        # Step 1: Extract text from PDF
        txt_file_path = pdf_to_txt(str(pdf_path), work_dir)
        if not txt_file_path:
            raise Exception("Failed to extract text from PDF")
        intermediate_files.append(Path(txt_file_path))

        # Step 2: Extract segments to CSV
        fund_deets_csv, dates_data_csv = extract_text_to_csv(txt_file_path, work_dir)
        if not fund_deets_csv or not dates_data_csv:
            raise Exception("Failed to extract segments from text")
        intermediate_files.append(Path(fund_deets_csv))
        intermediate_files.append(Path(dates_data_csv))

        # Step 3: Process dates data
        processed_dates_csv = process_dates_data(dates_data_csv, work_dir)
        intermediate_files.append(Path(processed_dates_csv))

        # Step 4: Clean fund details
        cleaned_fund_details_csv = clean_fund_details(fund_deets_csv, str(isin_ticker_db), work_dir)
        intermediate_files.append(Path(cleaned_fund_details_csv))

        # Step 5: Combine final data
        final_csv = combine_dates_and_fund_details(processed_dates_csv, cleaned_fund_details_csv, work_dir)
        intermediate_files.append(Path(final_csv))

        # Move final CSV to output directory
        shutil.move(final_csv, output_path)

        return output_path

    finally:
        # Clean up intermediate files
        for file_path in intermediate_files:
            if file_path.exists() and file_path != output_path:
                try:
                    file_path.unlink()
                except Exception:
                    pass
