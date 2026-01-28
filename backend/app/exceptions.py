"""Custom exceptions for the application."""


class FileProcessingError(Exception):
    """Base exception for file processing errors."""
    pass


class ValidationError(Exception):
    """Base exception for validation errors."""
    pass


class CalculatorNotFoundError(Exception):
    """Calculator not found in registry."""
    pass
