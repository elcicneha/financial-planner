"""ITR Prep feature router."""

from fastapi import APIRouter


def create_router() -> APIRouter:
    """
    Create and configure ITR Prep feature router.

    Returns:
        Configured APIRouter with all ITR Prep sub-domain routers
    """
    router = APIRouter(prefix="/api", tags=["ITR Prep"])

    # Import sub-domain routers
    from .payslips.routes import router as payslip_router

    # Register sub-domains
    router.include_router(payslip_router)

    return router
