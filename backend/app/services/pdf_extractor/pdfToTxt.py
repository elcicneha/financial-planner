import logging
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class PDFExtractionError(Exception):
    """Raised when PDF text extraction fails."""
    pass


def pdf_to_txt(pdf_path: str, work_dir: Optional[Path] = None) -> str:
    """
    Converts a PDF file to a text file and returns the path of the text file.

    Args:
        pdf_path: The path to the PDF file.
        work_dir: Directory to create output file. If None, uses pdf's directory.

    Returns:
        The path to the generated text file.

    Raises:
        PDFExtractionError: If PDF cannot be read or text extraction fails.
        FileNotFoundError: If the PDF file doesn't exist.
    """
    pdf_path_obj = Path(pdf_path)

    if not pdf_path_obj.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    if work_dir is None:
        work_dir = pdf_path_obj.parent

    txt_file_path = work_dir / f"{pdf_path_obj.stem}.txt"

    try:
        with fitz.open(pdf_path) as pdf_document:
            pages = [page.get_text() for page in pdf_document]
            pdf_content = ''.join(pages)

        if not pdf_content.strip():
            raise PDFExtractionError(f"No text content found in PDF: {pdf_path}")

        with open(txt_file_path, 'w', encoding='utf-8') as txt_file:
            txt_file.write(pdf_content)

        logger.info(f"Extracted text from PDF: {pdf_path} -> {txt_file_path}")
        return str(txt_file_path)

    except fitz.FileDataError as e:
        logger.error(f"Invalid or corrupted PDF file: {pdf_path} - {e}")
        raise PDFExtractionError(f"Invalid or corrupted PDF file: {e}") from e
    except PermissionError as e:
        logger.error(f"Permission denied accessing file: {pdf_path} - {e}")
        raise PDFExtractionError(f"Permission denied: {e}") from e
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {pdf_path} - {e}")
        raise PDFExtractionError(f"Failed to extract text from PDF: {e}") from e
