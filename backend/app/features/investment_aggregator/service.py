from pathlib import Path
from fastapi import UploadFile, HTTPException
from .repository import FileTransactionRepository
from .extractor import extract_transactions
import logging
import asyncio
import uuid
from datetime import datetime
from app.config import ensure_directories, FILE_ID_LENGTH

logger = logging.getLogger(__name__)


class PDFTransactionService:
    """Service for PDF transaction extraction."""

    def __init__(self, repository: FileTransactionRepository):
        self.repo = repository

    async def process_upload(self, file: UploadFile):
        """Process uploaded PDF and extract transactions."""
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        ensure_directories()

        # Generate unique file ID
        file_id = str(uuid.uuid4())[:FILE_ID_LENGTH]
        date_folder = datetime.now().strftime("%Y-%m-%d")

        # Save upload
        pdf_path, upload_folder, output_folder = await self.repo.save_upload(file, file_id, date_folder)

        try:
            # Extract transactions (run in thread to avoid blocking)
            output_path = await asyncio.to_thread(
                extract_transactions, pdf_path, output_folder, file_id
            )

            # Clean up the upload folder after successful processing
            self.repo.cleanup_upload_folder(upload_folder)

            return {
                "success": True,
                "message": "File uploaded and processed successfully",
                "file_id": file_id,
                "output_path": str(output_path.relative_to(self.repo.base_dir))
            }

        except Exception as e:
            logger.error(f"Failed to process PDF: {e}")
            # Clean up on failure too
            self.repo.cleanup_upload_folder(upload_folder)
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    def get_results(self, file_id: str):
        """Get processing results for a file."""
        results = self.repo.get_results(file_id)

        if not results:
            raise HTTPException(status_code=404, detail=f"Results not found for file_id: {file_id}")

        return results

    def list_files(self):
        """List all processed files."""
        files = self.repo.list_all_files()
        return {"files": files}

    def get_download_path(self, file_id: str) -> Path:
        """Get file path for download."""
        output_path = self.repo.get_output_path(file_id)

        if not output_path:
            raise HTTPException(status_code=404, detail=f"File not found for file_id: {file_id}")

        return output_path
