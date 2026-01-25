import logging
import shutil
from pathlib import Path
from typing import List

from .pdfToTxt import pdf_to_txt, PDFExtractionError
from .extractTextToCSV import extract_text_to_csv, TextExtractionError
from .processDatesData import process_dates_data
from .processFundDeets import clean_fund_details
from .finalCombine import combine_dates_and_fund_details, CombineError

logger = logging.getLogger(__name__)

# Export error types for external handling
__all__ = [
    'extract_transactions',
    'PDFExtractionError',
    'TextExtractionError',
    'CombineError',
]


def extract_transactions(pdf_path: Path, output_dir: Path, file_id: str) -> Path:
    """
    Extract mutual fund transactions from a PDF and save as JSON.

    Args:
        pdf_path: Path to the uploaded PDF file
        output_dir: Directory to save the output JSON
        file_id: Unique identifier for naming the output file

    Returns:
        Path to the generated JSON file

    Raises:
        PDFExtractionError: If PDF text extraction fails.
        TextExtractionError: If segment extraction fails.
        CombineError: If data combination fails.
        FileNotFoundError: If required files are missing.
    """
    module_dir = Path(__file__).parent
    isin_ticker_db = module_dir / "isin_ticker_db.csv"

    work_dir = pdf_path.parent
    intermediate_files: List[Path] = []
    output_path = output_dir / f"transactions_{file_id}.json"

    try:
        # Step 1: Extract text from PDF
        logger.info(f"Step 1: Extracting text from PDF: {pdf_path}")
        txt_file_path = pdf_to_txt(str(pdf_path), work_dir)
        intermediate_files.append(Path(txt_file_path))

        # Step 2: Extract segments to CSV
        logger.info("Step 2: Extracting segments from text")
        fund_deets_csv, dates_data_csv = extract_text_to_csv(txt_file_path, work_dir)
        intermediate_files.append(Path(fund_deets_csv))
        intermediate_files.append(Path(dates_data_csv))

        # Step 3: Process dates data
        logger.info("Step 3: Processing dates data")
        processed_dates_csv = process_dates_data(dates_data_csv, work_dir)
        intermediate_files.append(Path(processed_dates_csv))

        # Step 4: Clean fund details
        logger.info("Step 4: Cleaning fund details")
        cleaned_fund_details_csv = clean_fund_details(fund_deets_csv, str(isin_ticker_db), work_dir)
        intermediate_files.append(Path(cleaned_fund_details_csv))

        # Step 5: Combine final data (now outputs JSON)
        logger.info("Step 5: Combining final data")
        final_json = combine_dates_and_fund_details(processed_dates_csv, cleaned_fund_details_csv, work_dir)
        intermediate_files.append(Path(final_json))

        # Move final JSON to output directory
        shutil.move(final_json, output_path)
        logger.info(f"Transaction extraction complete: {output_path}")

        return output_path

    finally:
        # Clean up intermediate files
        cleanup_count = 0
        for file_path in intermediate_files:
            if file_path.exists() and file_path != output_path:
                try:
                    file_path.unlink()
                    cleanup_count += 1
                except Exception as e:
                    logger.warning(f"Failed to clean up intermediate file {file_path}: {e}")

        if cleanup_count > 0:
            logger.debug(f"Cleaned up {cleanup_count} intermediate files")
