"""
CAS-specific exceptions.
"""


class CASParserError(Exception):
    """Raised when CAS parsing fails."""
    pass


class CASFormatError(CASParserError):
    """Raised when CAS format cannot be determined or is invalid."""
    pass


class PasswordRequiredError(CASParserError):
    """Raised when Excel file is password-protected."""
    pass
