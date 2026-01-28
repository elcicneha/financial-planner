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
    from .capital_gains.routes import router as cg_router
    from .payslips.routes import router as payslip_router
    from .cas.routes import router as cas_router

    # Register sub-domains
    router.include_router(cg_router)
    router.include_router(payslip_router)
    router.include_router(cas_router)

    return router
