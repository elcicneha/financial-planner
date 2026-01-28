"""File management utilities for upload/cleanup operations."""

import os
import shutil
from pathlib import Path
from typing import Optional


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent security issues.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for filesystem
    """
    # Remove path components
    filename = os.path.basename(filename)

    # Replace unsafe characters
    unsafe_chars = ['..', '/', '\\', '\0']
    for char in unsafe_chars:
        filename = filename.replace(char, '_')

    return filename


def ensure_directory(path: Path) -> None:
    """
    Ensure directory exists, create if needed.

    Args:
        path: Directory path
    """
    path.mkdir(parents=True, exist_ok=True)


def cleanup_file(file_path: Path) -> bool:
    """
    Safely delete a file.

    Args:
        file_path: Path to file

    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False


def cleanup_directory(dir_path: Path, recursive: bool = False) -> bool:
    """
    Safely delete a directory.

    Args:
        dir_path: Path to directory
        recursive: If True, delete recursively

    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        if dir_path.exists() and dir_path.is_dir():
            if recursive:
                shutil.rmtree(dir_path)
            else:
                dir_path.rmdir()
            return True
        return False
    except Exception:
        return False


def get_file_size(file_path: Path) -> Optional[int]:
    """
    Get file size in bytes.

    Args:
        file_path: Path to file

    Returns:
        File size in bytes, or None if file doesn't exist
    """
    try:
        if file_path.exists() and file_path.is_file():
            return file_path.stat().st_size
        return None
    except Exception:
        return None
