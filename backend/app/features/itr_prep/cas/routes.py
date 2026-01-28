"""
CAS (Capital Account Statement) API Routes.

Endpoints for uploading CAS files, listing files, and retrieving capital gains data.
"""

import asyncio
import logging
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile, Form, Depends

from app.dependencies import get_cas_service

from .service import CASService
from .schemas import (
    CASCapitalGains,
    CASUploadResponse,
    CASFileResult,
    CASFileInfo,
    CASFilesResponse,
)
from .parsers import PasswordRequiredError
from .exceptions import CASParserError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ITR Prep"])


@router.post("/upload-cas", response_model=CASUploadResponse)
async def upload_cas_excel(
    file: UploadFile = File(None),
    files: List[UploadFile] = File(None),
    password: str = Form(None),
    cas_service: CASService = Depends(get_cas_service)
):
        """
        Upload CAS (Capital Account Statement) Excel files (CAMS .xls or KFINTECH .xlsx).

        Supports batch upload of multiple files. Returns results for each file.
        Password-protected files are marked as password_required in the response.
        Re-upload individual files with password to complete processing.
        """
        # Combine single file and multiple files into one list
        all_files: List[UploadFile] = []
        if file and file.filename:
            all_files.append(file)
        if files:
            all_files.extend([f for f in files if f.filename])

        if not all_files:
            raise HTTPException(status_code=400, detail="No files provided")

        results: List[CASFileResult] = []

        for upload_file in all_files:
            filename = upload_file.filename or "unknown"
            file_ext = filename.lower().split('.')[-1]

            # Validate file extension
            if file_ext not in ['xls', 'xlsx']:
                results.append(CASFileResult(
                    filename=filename,
                    success=False,
                    error="Only Excel files (.xls or .xlsx) are allowed"
                ))
                continue

            try:
                contents = await upload_file.read()
                financial_year, _ = await asyncio.to_thread(
                    cas_service.parse_and_save_excel,
                    contents,
                    password
                )
                results.append(CASFileResult(
                    filename=filename,
                    success=True,
                    financial_year=financial_year
                ))

            except PasswordRequiredError:
                results.append(CASFileResult(
                    filename=filename,
                    success=False,
                    password_required=True
                ))

            except CASParserError as e:
                results.append(CASFileResult(
                    filename=filename,
                    success=False,
                    error=str(e)
                ))

            except Exception as e:
                logger.error(f"Failed to process CAS file {filename}: {e}")
                results.append(CASFileResult(
                    filename=filename,
                    success=False,
                    error=f"Failed to process: {str(e)}"
                ))

        return CASUploadResponse(results=results)


@router.get("/cas-files", response_model=CASFilesResponse)
async def list_cas_files(cas_service: CASService = Depends(get_cas_service)):
        """List all uploaded CAS JSON files with metadata."""
        files_data = cas_service.repository.list_files_with_metadata()
        files = [CASFileInfo(**f) for f in files_data]
        return CASFilesResponse(files=files)


@router.get("/capital-gains-cas", response_model=CASCapitalGains)
async def get_capital_gains_cas(
    fy: str = None,
    cas_service: CASService = Depends(get_cas_service)
):
        """
        Get CAS (Capital Account Statement) capital gains data.

        Args:
            fy: Financial year in format "2024-25" (optional, defaults to latest)

        Returns structured data with 4 categories:
        - Equity Short-term
        - Equity Long-term
        - Debt Short-term
        - Debt Long-term

        Returns zeros if no CAS files have been uploaded yet.
        """
        try:
            return await asyncio.to_thread(cas_service.get_capital_gains, fy)
        except FileNotFoundError as e:
            # No files uploaded yet - return empty data (200) instead of 404
            # This allows frontend to show empty state without error handling
            if not fy:
                return cas_service.get_empty_capital_gains()
            # Specific FY requested but not found - this is a real 404
            raise HTTPException(status_code=404, detail=str(e))
        except CASParserError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            logger.error(f"Failed to retrieve CAS capital gains: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve CAS capital gains: {str(e)}"
            )
