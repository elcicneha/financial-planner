import re
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd

# Pre-compile the date pattern for better performance
DATE_PATTERN = re.compile(r"\d{2}-[A-Za-z]{3}-\d{4}")


def _split_text_by_date(text: str) -> List[Tuple[str, str]]:
    """
    Split text by date patterns.

    Args:
        text: Raw text containing dates.

    Returns:
        List of (date, content) tuples.
    """
    dates = DATE_PATTERN.findall(text)
    split_text = DATE_PATTERN.split(text)

    result = []
    for date, content in zip(dates, split_text[1:]):
        result.append((date, content.strip()))

    if len(split_text) > len(dates) + 1:
        result.append(('', split_text[-1].strip()))

    return result


def _process_row(row_data: Tuple[int, str]) -> List[List]:
    """
    Process a single row and return all date-split entries.

    Args:
        row_data: Tuple of (row_index, text_content)

    Returns:
        List of [row_number, date, content] entries
    """
    row_idx, text = row_data
    entries = _split_text_by_date(text)
    return [[row_idx + 1, date, content] for date, content in entries]


def process_dates_data(input_file: str, work_dir: Optional[Path] = None) -> str:
    """
    Processes a CSV file containing text data, splits it by dates and further by new lines into columns.

    Args:
        input_file: Path to the input CSV file.
        work_dir: Directory to create output file. If None, uses input file's directory.

    Returns:
        Path to the generated output CSV file.
    """
    input_path = Path(input_file)

    if work_dir is None:
        work_dir = input_path.parent

    df = pd.read_csv(input_file, header=None)

    # Use list comprehension instead of iterrows for better performance
    all_split_data = []
    for idx, text in enumerate(df[0].values):
        entries = _split_text_by_date(text)
        for date, content in entries:
            all_split_data.append([idx + 1, date, content])

    result_df = pd.DataFrame(all_split_data, columns=['Row Number', 'Date', 'Content'])

    def split_content_column(content: str) -> List[str]:
        return (content.split('\n') + [""] * 5)[:5]

    content_split = result_df['Content'].apply(split_content_column)
    content_columns = pd.DataFrame(content_split.tolist(), columns=['Amount', 'NAV', 'Units', 'Desc', 'Unit Balance'])
    final_df = pd.concat([result_df[['Row Number', 'Date']], content_columns], axis=1)

    output_file = work_dir / f"{input_path.stem}_processed.csv"
    final_df.to_csv(output_file, index=False)

    return str(output_file)
