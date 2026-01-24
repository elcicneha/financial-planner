import csv
import re
from pathlib import Path
from typing import Optional, Tuple


def extract_text_to_csv(
    txt_file_path: str, work_dir: Optional[Path] = None
) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts text between predefined delimiters from a text file and writes it to CSV files.

    Args:
        txt_file_path: Path to the text file.
        work_dir: Directory to create output files. If None, uses txt file's directory.

    Returns:
        Tuple of paths to the two generated CSV files (fund_deets, dates_data).
    """
    txt_path_obj = Path(txt_file_path)

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

        for idx, (start_delim, end_delim, output_csv) in enumerate(delimiters_and_files, start=1):
            pattern = re.compile(rf"{re.escape(start_delim)}(.*?){re.escape(end_delim)}", re.DOTALL)
            matches = pattern.findall(file_content)

            if not matches:
                continue

            with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Segment'])
                for match in matches:
                    writer.writerow([match.strip()])

            if idx == 1:
                csv_file_1 = str(output_csv)
            elif idx == 2:
                csv_file_2 = str(output_csv)

        return csv_file_1, csv_file_2

    except Exception:
        return None, None
