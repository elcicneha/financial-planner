"""
CAS Parser Factory.

Auto-detects CAS format (CAMS or KFINTECH) and instantiates the appropriate parser.
"""

import io
from typing import Optional
import pandas as pd
import msoffcrypto

from .base import BaseCAParser
from .cams_parser import CAMSParser
from .kfintech_parser import KFINTECHParser
from .utils import infer_financial_year


class CASFormatError(Exception):
    """Raised when CAS format cannot be determined."""
    pass


class PasswordRequiredError(Exception):
    """Raised when Excel file is password-protected."""
    pass


def detect_cas_format(excel_file: pd.ExcelFile) -> str:
    """
    Detect whether this is CAMS or KFINTECH format.

    Args:
        excel_file: Opened pandas ExcelFile object.

    Returns:
        "CAMS" or "KFINTECH"

    Raises:
        CASFormatError: If format cannot be determined.
    """
    sheet_names = excel_file.sheet_names

    # KFINTECH has sheets like "Summary - Equity", "Summary - NonEquity"
    if "Summary - Equity" in sheet_names or "Summary - NonEquity" in sheet_names:
        return "KFINTECH"

    # CAMS has sheets like "OVERALL_SUMMARY_EQUITY", "OVERALL_SUMMARY_NONEQUITY"
    if "OVERALL_SUMMARY_EQUITY" in sheet_names or "OVERALL_SUMMARY_NONEQUITY" in sheet_names:
        return "CAMS"

    raise CASFormatError(
        "Unknown CAS format. Expected CAMS or KFINTECH sheet structure. "
        f"Found sheets: {sheet_names}"
    )


def create_parser(excel_file: pd.ExcelFile) -> BaseCAParser:
    """
    Create the appropriate parser based on detected format.

    Args:
        excel_file: Opened pandas ExcelFile object.

    Returns:
        Parser instance (CAMSParser or KFINTECHParser).

    Raises:
        CASFormatError: If format cannot be determined.
    """
    cas_format = detect_cas_format(excel_file)

    if cas_format == "CAMS":
        return CAMSParser(excel_file)
    elif cas_format == "KFINTECH":
        return KFINTECHParser(excel_file)
    else:
        raise CASFormatError(f"Unsupported CAS format: {cas_format}")


def open_excel_file(file_content: bytes, password: Optional[str] = None) -> pd.ExcelFile:
    """
    Open Excel file, handling password-protected files.

    Args:
        file_content: Raw Excel file bytes.
        password: Password for decryption (if file is protected).

    Returns:
        Opened pandas ExcelFile object.

    Raises:
        PasswordRequiredError: If file is password-protected and no password provided.
        CASFormatError: If file cannot be opened.
    """
    # Check if file is encrypted using msoffcrypto
    file_obj = io.BytesIO(file_content)
    is_encrypted = False

    try:
        office_file = msoffcrypto.OfficeFile(file_obj)
        is_encrypted = office_file.is_encrypted()
    except Exception:
        # Not an OLE file or can't determine - try opening directly
        pass

    if is_encrypted:
        if not password:
            raise PasswordRequiredError(
                "This file is password-protected. Please provide the password."
            )

        # Decrypt the file
        try:
            file_obj = io.BytesIO(file_content)
            office_file = msoffcrypto.OfficeFile(file_obj)
            office_file.load_key(password=password)

            decrypted = io.BytesIO()
            office_file.decrypt(decrypted)
            decrypted.seek(0)

            return pd.ExcelFile(decrypted, engine='openpyxl')
        except Exception as decrypt_error:
            raise CASFormatError(
                f"Failed to decrypt file. Password may be incorrect: {decrypt_error}"
            )
    else:
        # Try opening the file directly
        try:
            file_obj = io.BytesIO(file_content)
            return pd.ExcelFile(file_obj)
        except Exception as e:
            raise CASFormatError(f"Failed to open Excel file: {e}")
