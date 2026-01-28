"""
API Routes for the Financial Planner application.

Handles PDF upload, transaction extraction, and capital gains calculations.
"""

import asyncio
import json
import logging
import re
import shutil
import uuid
from datetime import datetime

from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile, Body, Form
from fastapi.responses import FileResponse

from app.config import (
    BASE_DIR,
    UPLOADS_DIR,
    OUTPUTS_DIR,
    CAS_DIR,
    FILE_ID_LENGTH,
    ensure_directories,
)
from app.models.schemas import (
    CASCapitalGains,
    CASUploadResponse,
    CASFileResult,
    CASFileInfo,
    CASFilesResponse,
)
from app.services.cas_parser import (
    CASParserError,
    PasswordRequiredError,
    load_and_parse_cas,
    validate_and_save_cas_excel,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload-cas", response_model=CASUploadResponse)
async def upload_cas_excel(
    file: UploadFile = File(None),
    files: List[UploadFile] = File(None),
    password: str = Form(None)
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

    ensure_directories()

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
                validate_and_save_cas_excel,
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
async def list_cas_files():
    """List all uploaded CAS JSON files with metadata."""
    files = []

    if CAS_DIR.exists():
        # Get JSON files (combined data from Excel uploads)
        cas_files = list(CAS_DIR.glob("FY*.json"))

        for cas_file in sorted(cas_files, reverse=True):
            # Parse FY from filename like "FY2024-25.json"
            stem = cas_file.stem
            fy = stem[2:] if stem.startswith("FY") else stem

            stat = cas_file.stat()

            files.append(
                CASFileInfo(
                    financial_year=fy,
                    file_path=str(cas_file.relative_to(BASE_DIR)),
                    upload_date=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    file_size=stat.st_size
                )
            )

    return CASFilesResponse(files=files)


def _empty_cas_capital_gains() -> CASCapitalGains:
    """Return empty CAS capital gains with all zeros when no files uploaded."""
    from app.models.schemas import CASCategoryData
    empty_category = CASCategoryData(sale_consideration=0, acquisition_cost=0, gain_loss=0)
    return CASCapitalGains(
        equity_short_term=empty_category,
        equity_long_term=empty_category,
        debt_short_term=empty_category,
        debt_long_term=empty_category,
        has_files=False,
        last_updated=datetime.now().isoformat(),
    )


@router.get("/capital-gains-cas", response_model=CASCapitalGains)
async def get_capital_gains_cas(fy: str = None):
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
        return await asyncio.to_thread(load_and_parse_cas, fy)
    except FileNotFoundError as e:
        # No files uploaded yet - return empty data (200) instead of 404
        # This allows frontend to show empty state without error handling
        if not fy:
            return _empty_cas_capital_gains()
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
