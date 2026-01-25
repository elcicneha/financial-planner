import csv
import logging
import re
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class TextExtractionError(Exception):
    """Raised when text segment extraction fails."""
    pass


def extract_text_to_csv(
    txt_file_path: str, work_dir: Optional[Path] = None
) -> Tuple[str, str]:
    """
    Extracts text between predefined delimiters from a text file and writes it to CSV files.

    Args:
        txt_file_path: Path to the text file.
        work_dir: Directory to create output files. If None, uses txt file's directory.

    Returns:
        Tuple of paths to the two generated CSV files (fund_deets, dates_data).

    Raises:
        TextExtractionError: If required segments cannot be found or extraction fails.
        FileNotFoundError: If the text file doesn't exist.
    """
    txt_path_obj = Path(txt_file_path)

    if not txt_path_obj.exists():
        raise FileNotFoundError(f"Text file not found: {txt_file_path}")

    if work_dir is None:
        work_dir = txt_path_obj.parent

    delimiters_and_files = [
        ("KYC: OK  PAN: OK", "Nominee 1:", work_dir / "extracted_fund_deets.csv"),
        ("Opening Unit Balance: ", "NAV on ", work_dir / "extracted_dates_data.csv"),
    ]

    csv_file_1: Optional[str] = None
    csv_file_2: Optional[str] = None

    try:
        with open(txt_file_path, 'r', encoding='utf-8') as file:
            file_content = file.read()
    except PermissionError as e:
        logger.error(f"Permission denied reading file: {txt_file_path} - {e}")
        raise TextExtractionError(f"Permission denied: {e}") from e
    except UnicodeDecodeError as e:
        logger.error(f"Encoding error reading file: {txt_file_path} - {e}")
        raise TextExtractionError(f"File encoding error: {e}") from e

    for idx, (start_delim, end_delim, output_csv) in enumerate(delimiters_and_files, start=1):
        pattern = re.compile(rf"{re.escape(start_delim)}(.*?){re.escape(end_delim)}", re.DOTALL)
        matches = pattern.findall(file_content)

        if not matches:
            logger.warning(f"No matches found for pattern {idx} in {txt_file_path}")
            continue

        try:
            with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Segment'])
                for match in matches:
                    writer.writerow([match.strip()])
        except PermissionError as e:
            logger.error(f"Permission denied writing to {output_csv}: {e}")
            raise TextExtractionError(f"Permission denied writing output: {e}") from e

        if idx == 1:
            csv_file_1 = str(output_csv)
        elif idx == 2:
            csv_file_2 = str(output_csv)

    if csv_file_1 is None or csv_file_2 is None:
        missing = []
        if csv_file_1 is None:
            missing.append("fund details")
        if csv_file_2 is None:
            missing.append("dates data")
        raise TextExtractionError(
            f"Failed to extract required segments: {', '.join(missing)}. "
            "The PDF may not be a valid CAMS/Karvy statement."
        )

    logger.info(f"Extracted segments to: {csv_file_1}, {csv_file_2}")
    return csv_file_1, csv_file_2
