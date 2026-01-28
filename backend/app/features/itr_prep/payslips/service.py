"""Service for payslip processing."""

from fastapi import UploadFile, HTTPException
from typing import List
from pathlib import Path
import uuid
import asyncio
from datetime import datetime

from .repository import FilePayslipRepository
from .extractor import extract_payslip_data
from .validators import is_duplicate_payslip, is_payslip_data_empty
from .schemas import (
    PayslipUploadResponse,
    PayslipFileResult,
    PayslipData,
    PayslipBreakdown,
    PayslipPayPeriod,
    PayslipRecord,
)


class PayslipService:
    """Service for payslip processing."""

    def __init__(self, repository: FilePayslipRepository, uploads_dir: Path, file_id_length: int = 8):
        """
        Initialize payslip service.

        Args:
            repository: Repository for payslip data persistence
            uploads_dir: Directory for temporary file uploads
            file_id_length: Length of generated file IDs
        """
        self.repo = repository
        self.uploads_dir = uploads_dir
        self.file_id_length = file_id_length

    async def process_uploads(self, files: List[UploadFile]) -> PayslipUploadResponse:
        """
        Process uploaded payslip files.

        Args:
            files: List of uploaded PDF files

        Returns:
            PayslipUploadResponse with results for each file
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        # Ensure uploads directory exists
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

        results: List[PayslipFileResult] = []
        temp_files = []

        # Load existing payslips once for duplicate checking
        existing_payslips = self.repo.get_all_payslips()

        try:
            for file in files:
                filename = file.filename or "unknown"

                # Validate file type
                if not filename.lower().endswith('.pdf'):
                    results.append(PayslipFileResult(
                        filename=filename,
                        success=False,
                        error="Only PDF files are allowed"
                    ))
                    continue

                # Save temporarily to process
                file_id = str(uuid.uuid4())[:self.file_id_length]
                temp_path = self.uploads_dir / f"temp_payslip_{file_id}.pdf"

                contents = await file.read()
                with open(temp_path, "wb") as f:
                    f.write(contents)
                temp_files.append(temp_path)

                # Extract payslip data
                try:
                    result = await asyncio.to_thread(extract_payslip_data, str(temp_path))

                    if result:
                        # Convert extracted data to Pydantic models
                        breakdown = None
                        if result.get('breakdown'):
                            breakdown = PayslipBreakdown(
                                monthly=result['breakdown'].get('monthly'),
                                annual=result['breakdown'].get('annual'),
                            )

                        pay_period = None
                        if result.get('pay_period'):
                            pay_period = PayslipPayPeriod(
                                month=result['pay_period']['month'],
                                year=result['pay_period']['year'],
                                period_key=result['pay_period']['period_key'],
                            )

                        payslip_data = PayslipData(
                            gross_pay=result.get('gross_pay'),
                            breakdown=breakdown,
                            pay_period=pay_period,
                            company_name=result.get('company_name'),
                            tds=result.get('tds'),
                        )

                        # Validate: check if data is empty
                        if is_payslip_data_empty(payslip_data):
                            results.append(PayslipFileResult(
                                filename=filename,
                                success=False,
                                error="Couldn't find any data. You might have to add manually, or try uploading another PDF."
                            ))
                            continue

                        # Validate: check for duplicates
                        if is_duplicate_payslip(payslip_data, existing_payslips):
                            results.append(PayslipFileResult(
                                filename=filename,
                                success=False,
                                error="Duplicate payslip (same month, company, and amount)"
                            ))
                            continue

                        # Save payslip record
                        record_id = str(uuid.uuid4())
                        record = PayslipRecord(
                            id=record_id,
                            filename=filename,
                            upload_date=datetime.now().isoformat(),
                            payslip_data=payslip_data
                        )

                        # Add to existing list
                        existing_payslips.append(record.model_dump())

                        results.append(PayslipFileResult(
                            filename=filename,
                            success=True,
                            payslip=payslip_data
                        ))
                    else:
                        results.append(PayslipFileResult(
                            filename=filename,
                            success=False,
                            error=f"No data found in {filename}"
                        ))
                except Exception as e:
                    results.append(PayslipFileResult(
                        filename=filename,
                        success=False,
                        error=str(e)
                    ))

        finally:
            # Clean up temp files
            for temp_path in temp_files:
                try:
                    if temp_path.exists():
                        temp_path.unlink()
                except Exception:
                    pass  # Ignore cleanup errors

            # Save all payslips (batch save)
            self.repo.save_payslips(existing_payslips)

        return PayslipUploadResponse(results=results)

    def get_all_payslips(self) -> List[PayslipRecord]:
        """
        Get all saved payslips.

        Returns:
            List of PayslipRecord sorted by pay period (newest first)
        """
        data = self.repo.get_all_payslips()
        payslips = [PayslipRecord(**p) for p in data]

        # Sort by pay period (newest first)
        payslips.sort(
            key=lambda p: (
                p.payslip_data.pay_period.year if p.payslip_data.pay_period else 0,
                p.payslip_data.pay_period.month if p.payslip_data.pay_period else 0
            ),
            reverse=True
        )

        return payslips

    def delete_payslip(self, payslip_id: str) -> dict:
        """
        Delete a specific payslip.

        Args:
            payslip_id: ID of the payslip to delete

        Returns:
            Success message dict

        Raises:
            HTTPException: If payslip not found
        """
        # Check if payslip exists
        payslips = self.repo.get_all_payslips()
        found = any(p.get("id") == payslip_id for p in payslips)

        if not found:
            raise HTTPException(status_code=404, detail="Payslip not found")

        self.repo.delete_payslip(payslip_id)
        return {"message": "Payslip deleted successfully", "id": payslip_id}

    def delete_all_payslips(self) -> dict:
        """
        Delete all payslips.

        Returns:
            Success message dict
        """
        self.repo.delete_all_payslips()
        return {"message": "All payslips deleted successfully"}
