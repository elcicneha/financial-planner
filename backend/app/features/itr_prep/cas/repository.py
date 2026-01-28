"""
CAS Repository - handles CAS data persistence.

Manages JSON file storage for CAS data, organized by financial year.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.config import CAS_DIR, BASE_DIR

logger = logging.getLogger(__name__)


class FileCASRepository:
    """File-based repository for CAS data."""

    def __init__(self, cas_dir: Path = CAS_DIR):
        """
        Initialize repository.

        Args:
            cas_dir: Directory for CAS JSON files.
        """
        self.cas_dir = cas_dir

    def _get_json_path(self, fy: str) -> Path:
        """Get the JSON file path for a financial year."""
        return self.cas_dir / f"FY{fy}.json"

    def load(self, fy: str) -> Optional[Dict[str, Any]]:
        """
        Load CAS data for a financial year.

        Args:
            fy: Financial year (e.g., "2024-25")

        Returns:
            CAS data dictionary, or None if not found.
        """
        json_path = self._get_json_path(fy)
        if not json_path.exists():
            return None

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load CAS data from {json_path}: {e}")
            return None

    def save(self, fy: str, data: Dict[str, Any]) -> Path:
        """
        Save CAS data for a financial year.

        Args:
            fy: Financial year (e.g., "2024-25")
            data: CAS data dictionary to save

        Returns:
            Path to saved JSON file.
        """
        self.cas_dir.mkdir(parents=True, exist_ok=True)
        json_path = self._get_json_path(fy)

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved CAS data to {json_path}")
        return json_path

    def list_all_fys(self) -> List[str]:
        """
        Get all financial years that have CAS data.

        Returns:
            List of FY strings sorted in descending order (e.g., ["2024-25", "2023-24"]).
        """
        if not self.cas_dir.exists():
            return []

        json_files = list(self.cas_dir.glob("FY*.json"))
        fys = []

        for f in json_files:
            stem = f.stem  # e.g., "FY2024-25"
            if stem.startswith("FY"):
                fy = stem[2:]  # Extract "2024-25"
                fys.append(fy)

        return sorted(fys, reverse=True)

    def get_latest_fy(self) -> Optional[str]:
        """
        Get the most recent financial year based on uploaded CAS JSON files.

        Returns:
            Financial year string (e.g., "2024-25"), or None if no files exist.
        """
        fys = self.list_all_fys()
        return fys[0] if fys else None

    def list_files_with_metadata(self) -> List[Dict[str, Any]]:
        """
        Get all CAS files with metadata.

        Returns:
            List of dictionaries with keys: financial_year, file_path, upload_date, file_size
        """
        if not self.cas_dir.exists():
            return []

        cas_files = list(self.cas_dir.glob("FY*.json"))
        files = []

        for cas_file in sorted(cas_files, reverse=True):
            # Parse FY from filename like "FY2024-25.json"
            stem = cas_file.stem
            fy = stem[2:] if stem.startswith("FY") else stem

            stat = cas_file.stat()

            files.append({
                'financial_year': fy,
                'file_path': str(cas_file.relative_to(BASE_DIR)),
                'upload_date': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'file_size': stat.st_size
            })

        return files
