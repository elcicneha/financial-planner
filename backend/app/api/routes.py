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
    FIFOResponse,
    FIFOGainRow,
    FIFOSummary,
    CASCapitalGains,
    CASUploadResponse,
    CASFileResult,
    CASFileInfo,
    CASFilesResponse,
    FundTypeOverrideRequest,
    FundTypeOverridesBatchRequest,
)
from app.services.fifo_calculator import (
    get_cached_gains,
    get_last_updated as get_fifo_last_updated,
    save_fund_type_override,
    save_fund_type_overrides_batch,
    invalidate_fifo_cache,
    recalculate_and_cache_fifo,
)
from app.services.cas_parser import (
    CASParserError,
    PasswordRequiredError,
    load_and_parse_cas,
    validate_and_save_cas_excel,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/capital-gains", response_model=FIFOResponse)
async def get_capital_gains(fy: str = None, force_recalculate: bool = False):
    """
    Get FIFO capital gains calculations.

    Args:
        fy: Optional financial year filter in format "2024-25"
        force_recalculate: If True, invalidates cache and forces full recalculation

    Checks if cached results are valid, recalculates if needed,
    and returns all realized capital gains with summary statistics.
    """
    try:
        # Force recalculation if requested
        if force_recalculate:
            logger.info("Force recalculation requested, invalidating cache...")
            await asyncio.to_thread(invalidate_fifo_cache)
            fresh_gains = await asyncio.to_thread(recalculate_and_cache_fifo)
            gains_data = [g.to_dict() for g in fresh_gains]
        else:
            gains_data = await asyncio.to_thread(get_cached_gains)

        if not gains_data:
            return FIFOResponse(
                gains=[],
                summary=FIFOSummary(
                    total_stcg=0.0,
                    total_ltcg=0.0,
                    total_gains=0.0,
                    total_transactions=0,
                    date_range="N/A"
                ),
                last_updated=get_fifo_last_updated()
            )

        try:
            # Try to parse cached data with current schema
            gains = [FIFOGainRow(**g) for g in gains_data]
        except Exception as validation_error:
            # If validation fails (e.g., schema mismatch), invalidate cache and recalculate
            logger.warning(f"Cache schema mismatch, recalculating: {validation_error}")
            await asyncio.to_thread(invalidate_fifo_cache)
            fresh_gains = await asyncio.to_thread(recalculate_and_cache_fifo)
            gains_data = [g.to_dict() for g in fresh_gains]
            gains = [FIFOGainRow(**g) for g in gains_data]

        # Filter by financial year if specified
        if fy:
            gains = [g for g in gains if g.financial_year == fy]

        total_stcg = sum(g.gain for g in gains if g.term == "Short-term")
        total_ltcg = sum(g.gain for g in gains if g.term == "Long-term")
        total_gains = sum(g.gain for g in gains)

        if gains:
            dates = sorted([g.sell_date for g in gains])
            date_range = f"{dates[0]} to {dates[-1]}"
        else:
            date_range = "N/A"

        summary = FIFOSummary(
            total_stcg=round(total_stcg, 2),
            total_ltcg=round(total_ltcg, 2),
            total_gains=round(total_gains, 2),
            total_transactions=len(gains),
            date_range=date_range
        )

        return FIFOResponse(gains=gains, summary=summary, last_updated=get_fifo_last_updated())

    except Exception as e:
        logger.error(f"Failed to calculate capital gains: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate capital gains: {str(e)}"
        )


@router.put("/fund-type-override")
async def update_fund_type_override(request: FundTypeOverrideRequest = Body(...)):
    """
    Update manual fund type override for a ticker.

    Allows users to manually classify a fund as 'equity' or 'debt',
    overriding the automatic classification. The override persists
    and invalidates the FIFO cache.
    """
    try:
        await asyncio.to_thread(save_fund_type_override, request.ticker, request.fund_type)

        return {
            "success": True,
            "message": f"Fund type updated for {request.ticker}",
            "ticker": request.ticker,
            "fund_type": request.fund_type
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update fund type override: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update fund type override: {str(e)}"
        )


@router.put("/fund-type-overrides")
async def update_fund_type_overrides_batch(request: FundTypeOverridesBatchRequest = Body(...)):
    """
    Update manual fund type overrides for multiple tickers in a single atomic operation.

    Accepts a dictionary of ticker symbols to fund types. All changes are applied
    and saved atomically to avoid race conditions when updating multiple funds.
    Invalidates the FIFO cache once for all changes.
    """
    if not request.overrides:
        raise HTTPException(status_code=400, detail="No overrides provided")

    try:
        await asyncio.to_thread(save_fund_type_overrides_batch, request.overrides)

        return {
            "success": True,
            "message": f"Updated {len(request.overrides)} fund type override{'s' if len(request.overrides) != 1 else ''}",
            "count": len(request.overrides),
            "tickers": list(request.overrides.keys())
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update fund type overrides: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update fund type overrides: {str(e)}"
        )


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
