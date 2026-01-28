"""
API routes for capital gains calculations.

Provides FIFO capital gains calculations and fund type override management.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Body, Depends

from app.dependencies import get_capital_gains_service

from .schemas import (
    FIFOResponse,
    FIFOGainRow,
    FIFOSummary,
    FundTypeOverrideRequest,
    FundTypeOverridesBatchRequest,
)
from .service import CapitalGainsService

router = APIRouter(tags=["ITR Prep"])
logger = logging.getLogger(__name__)


@router.get("/capital-gains", response_model=FIFOResponse)
async def get_capital_gains(
    fy: str = None,
    force_recalculate: bool = False,
    service: CapitalGainsService = Depends(get_capital_gains_service)
):
    """
    Get FIFO capital gains calculations.

    Args:
        fy: Optional financial year filter in format "2024-25"
        force_recalculate: If True, invalidates cache and forces full recalculation

    Checks if cached results are valid, recalculates if needed,
    and returns all realized capital gains with summary statistics.
    """
    try:
        # Get gains from service
        gains = await asyncio.to_thread(service.get_capital_gains, force_recalculate)

        if not gains:
            return FIFOResponse(
                gains=[],
                summary=FIFOSummary(
                    total_stcg=0.0,
                    total_ltcg=0.0,
                    total_gains=0.0,
                    total_transactions=0,
                    date_range="N/A"
                ),
                last_updated=service.get_last_updated()
            )

        # Convert FIFOGain objects to FIFOGainRow Pydantic models
        gains_data = [g.to_dict() for g in gains]

        try:
            gain_rows = [FIFOGainRow(**g) for g in gains_data]
        except Exception as validation_error:
            # If validation fails (e.g., schema mismatch), force recalculation
            logger.warning(f"Cache schema mismatch, recalculating: {validation_error}")
            gains = await asyncio.to_thread(service.get_capital_gains, force_recalculate=True)
            gains_data = [g.to_dict() for g in gains]
            gain_rows = [FIFOGainRow(**g) for g in gains_data]

        # Filter by financial year if specified
        if fy:
            gain_rows = [g for g in gain_rows if g.financial_year == fy]

        total_stcg = sum(g.gain for g in gain_rows if g.term == "Short-term")
        total_ltcg = sum(g.gain for g in gain_rows if g.term == "Long-term")
        total_gains = sum(g.gain for g in gain_rows)

        if gain_rows:
            dates = sorted([g.sell_date for g in gain_rows])
            date_range = f"{dates[0]} to {dates[-1]}"
        else:
            date_range = "N/A"

        summary = FIFOSummary(
            total_stcg=round(total_stcg, 2),
            total_ltcg=round(total_ltcg, 2),
            total_gains=round(total_gains, 2),
            total_transactions=len(gain_rows),
            date_range=date_range
        )

        return FIFOResponse(
            gains=gain_rows,
            summary=summary,
            last_updated=service.get_last_updated()
        )

    except Exception as e:
        logger.error(f"Failed to calculate capital gains: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate capital gains: {str(e)}"
        )


@router.put("/fund-type-override")
async def update_fund_type_override(
    request: FundTypeOverrideRequest = Body(...),
    service: CapitalGainsService = Depends(get_capital_gains_service)
):
    """
    Update manual fund type override for a ticker.

    Allows users to manually classify a fund as 'equity' or 'debt',
    overriding the automatic classification. The override persists
    and invalidates the FIFO cache.
    """
    try:
        await asyncio.to_thread(service.save_fund_type_override, request.ticker, request.fund_type)

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
async def update_fund_type_overrides_batch(
    request: FundTypeOverridesBatchRequest = Body(...),
    service: CapitalGainsService = Depends(get_capital_gains_service)
):
    """
    Update manual fund type overrides for multiple tickers in a single atomic operation.

    Accepts a dictionary of ticker symbols to fund types. All changes are applied
    and saved atomically to avoid race conditions when updating multiple funds.
    Invalidates the FIFO cache once for all changes.
    """
    if not request.overrides:
        raise HTTPException(status_code=400, detail="No overrides provided")

    try:
        await asyncio.to_thread(service.save_fund_type_overrides_batch, request.overrides)

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
