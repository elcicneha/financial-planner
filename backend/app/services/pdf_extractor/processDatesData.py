import re
from pathlib import Path
from typing import List, Optional

import pandas as pd


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

    def split_text_by_date(text: str) -> List[List[str]]:
        date_pattern = r"\d{2}-[A-Za-z]{3}-\d{4}"
        dates = re.findall(date_pattern, text)
        split_text = re.split(date_pattern, text)

        result = []
        for i in range(len(dates)):
            result.append([dates[i], split_text[i + 1].strip()])

        if len(split_text) > len(dates):
            result.append(['', split_text[-1].strip()])

        return result

    df = pd.read_csv(input_file, header=None)

    all_split_data = []
    for index, row in df.iterrows():
        text = row[0]
        split_data = split_text_by_date(text)
        for entry in split_data:
            all_split_data.append([index + 1] + entry)

    result_df = pd.DataFrame(all_split_data, columns=['Row Number', 'Date', 'Content'])

    def split_content_column(content: str) -> List[str]:
        return (content.split('\n') + [""] * 5)[:5]

    content_split = result_df['Content'].apply(split_content_column)
    content_columns = pd.DataFrame(content_split.tolist(), columns=['Amount', 'NAV', 'Units', 'Desc', 'Unit Balance'])
    final_df = pd.concat([result_df[['Row Number', 'Date']], content_columns], axis=1)

    output_file = work_dir / f"{input_path.stem}_processed.csv"
    final_df.to_csv(output_file, index=False)

    return str(output_file)
