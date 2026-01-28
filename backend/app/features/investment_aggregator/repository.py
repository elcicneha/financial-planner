from pathlib import Path
from fastapi import UploadFile
import shutil
import json
from datetime import datetime
from typing import Dict, Any, List, Optional


class FileTransactionRepository:
    """File-based repository for transaction data."""

    def __init__(self, uploads_dir: Path, outputs_dir: Path, base_dir: Path):
        self.uploads_dir = uploads_dir
        self.outputs_dir = outputs_dir
        self.base_dir = base_dir

    async def save_upload(self, file: UploadFile, file_id: str, date_folder: str) -> tuple[Path, Path, Path]:
        """
        Save uploaded PDF file.

        Returns:
            Tuple of (pdf_path, upload_folder, output_folder)
        """
        from app.shared.file_manager import sanitize_filename

        upload_folder = self.uploads_dir / date_folder
        output_folder = self.outputs_dir / date_folder
        upload_folder.mkdir(parents=True, exist_ok=True)
        output_folder.mkdir(parents=True, exist_ok=True)

        safe_filename = sanitize_filename(file.filename)
        pdf_filename = f"{file_id}_{safe_filename}"
        pdf_path = upload_folder / pdf_filename

        # Save file
        contents = await file.read()
        with open(pdf_path, 'wb') as f:
            f.write(contents)

        return pdf_path, upload_folder, output_folder

    def cleanup_upload_folder(self, upload_folder: Path) -> None:
        """Delete upload folder after processing."""
        try:
            if upload_folder.exists():
                shutil.rmtree(upload_folder)
        except Exception:
            pass

    def get_output_path(self, file_id: str) -> Optional[Path]:
        """Get path to processed output JSON file."""
        if not self.outputs_dir.exists():
            return None

        # Search for file in outputs directory
        for date_dir in self.outputs_dir.iterdir():
            if date_dir.is_dir() and date_dir.name != 'fifo_cache':
                json_file = date_dir / f"transactions_{file_id}.json"
                if json_file.exists():
                    return json_file
        return None

    def get_results(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get processing results including transaction data."""
        json_file = self.get_output_path(file_id)

        if not json_file:
            return None

        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            return {
                "file_id": file_id,
                "output_path": str(json_file.relative_to(self.base_dir)),
                "transactions": data.get("transactions", [])
            }
        except (json.JSONDecodeError, Exception):
            return None

    def list_all_files(self) -> List[Dict[str, Any]]:
        """List all processed transaction files."""
        files = []

        if not self.outputs_dir.exists():
            return files

        for date_dir in sorted(self.outputs_dir.iterdir(), reverse=True):
            if date_dir.is_dir() and date_dir.name != 'fifo_cache':
                for json_file in date_dir.glob("transactions_*.json"):
                    file_id = json_file.stem.replace("transactions_", "")
                    files.append({
                        "file_id": file_id,
                        "date": date_dir.name,
                        "path": str(json_file.relative_to(self.base_dir))
                    })

        return files
