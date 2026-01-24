from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF


def pdf_to_txt(pdf_path: str, work_dir: Optional[Path] = None) -> Optional[str]:
    """
    Converts a PDF file to a text file and returns the path of the text file.

    Args:
        pdf_path: The path to the PDF file.
        work_dir: Directory to create output file. If None, uses pdf's directory.

    Returns:
        The path to the generated text file, or None on error.
    """
    pdf_path_obj = Path(pdf_path)

    if work_dir is None:
        work_dir = pdf_path_obj.parent

    txt_file_path = work_dir / f"{pdf_path_obj.stem}.txt"

    try:
        with fitz.open(pdf_path) as pdf_document:
            pages = [pdf_document[page_num].get_text() for page_num in range(len(pdf_document))]
            pdf_content = ''.join(pages)

        with open(txt_file_path, 'w', encoding='utf-8') as txt_file:
            txt_file.write(pdf_content)

        return str(txt_file_path)

    except Exception:
        return None
