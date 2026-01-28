# Backend Refactoring Implementation Guide

**Status**: Phase 0-2 ✅ Complete | Phase 3-7 Pending

This guide provides step-by-step instructions for completing the backend refactoring from Phase 1 onwards. Phase 0 (infrastructure setup) is already complete.

---

## Phase 0: Infrastructure Setup ✅ COMPLETED

**What was done:**
- Created directory structure: `core/`, `shared/`, `features/`
- Created all subdirectories for features
- Created base modules:
  - `exceptions.py` - Custom exception classes
  - `dependencies.py` - Dependency injection (placeholder)
  - `shared/persistence.py` - Repository interfaces
  - `shared/calculator_registry.py` - Registry pattern
  - `shared/file_manager.py` - File utilities
  - `core/utils.py` - Copied from app/utils.py
  - `core/tax_rules.py` - Copied from app/tax_rules.py

**Next**: Proceed to Phase 1

---

## Phase 1: Extract Health Check Feature ✅ COMPLETED

**Goal**: Validate the pattern with the simplest feature

**What was done:**
- Created `backend/app/features/health/schemas.py` - HealthResponse model
- Created `backend/app/features/health/routes.py` - Health check endpoint with System tag
- Updated `backend/app/main.py` - Added health_router import and registration
- Removed health endpoint from `backend/app/api/routes.py` (deleted lines 105-108)
- Tested successfully: `/api/health` returns `{"status":"healthy","timestamp":"2026-01-28T11:15:10.789811"}`

**Files created:**
- `backend/app/features/health/schemas.py`
- `backend/app/features/health/routes.py`

**Files modified:**
- `backend/app/main.py` (added health_router import and include_router call)
- `backend/app/api/routes.py` (removed health endpoint)

**Pattern validated**: The feature extraction pattern works correctly. Health check is now a standalone module with clean separation of concerns.

**Next**: Proceed to Phase 2

---

## Phase 2: Extract Investment Aggregator ✅ COMPLETED

**Goal**: Migrate PDF extraction feature with all 5 endpoints

**What was done:**
- ✓ Step 2.1: Moved PDF extractor from `backend/app/services/pdf_extractor/` to `backend/app/features/investment_aggregator/extractor/` (excluding payslip_extractor.py)
- ✓ Step 2.2: Created `backend/app/features/investment_aggregator/repository.py` - FileTransactionRepository with date-based folder management, JSON file handling
- ✓ Step 2.3: Created `backend/app/features/investment_aggregator/service.py` - PDFTransactionService with async processing via asyncio.to_thread
- ✓ Step 2.4: Created `backend/app/features/investment_aggregator/schemas.py` - UploadResponse, ProcessingResult, FileInfo, AvailableFinancialYear
- ✓ Step 2.5: Created `backend/app/features/investment_aggregator/routes.py` - 5 endpoints with Investment Aggregator tag
- ✓ Step 2.6: Updated `backend/app/dependencies.py` - Added dependency injection for repository and service
- ✓ Step 2.7: Updated `backend/app/main.py` - Registered investment aggregator router
- ✓ Step 2.8: Verified extractor imports (already using relative imports, no changes needed)
- ✓ Step 2.9: Removed old code from `backend/app/api/routes.py` - Deleted lines 72-245 (helper functions + 5 endpoints + unused imports)
- ✓ Step 2.10: Tested all 5 endpoints successfully

**Files created:**
- `backend/app/features/investment_aggregator/repository.py`
- `backend/app/features/investment_aggregator/service.py`
- `backend/app/features/investment_aggregator/schemas.py`
- `backend/app/features/investment_aggregator/routes.py`

**Files modified:**
- `backend/app/dependencies.py` (added investment aggregator dependencies)
- `backend/app/main.py` (registered invest_router)
- `backend/app/api/routes.py` (removed endpoints, helper functions, and imports)

**Endpoints migrated:**
1. `POST /api/upload` - Upload and process PDF statements ✓
2. `GET /api/results/{file_id}` - Get extraction results with transactions ✓
3. `GET /api/download/{file_id}` - Download processed JSON file ✓
4. `GET /api/files` - List all processed files ✓
5. `GET /api/available-financial-years` - Get financial years from FIFO data ✓ (will be moved to capital_gains in Phase 4)

**Test results:**
- All endpoints return correct responses
- Error handling works (404 for non-existent file_id)
- OpenAPI spec updated correctly
- No import errors on server startup

**Pattern validated**: Repository-Service-Routes architecture works well for multi-step processing workflows. Dependency injection provides clean separation and testability.

**Next**: Proceed to Phase 3

---

## Phase 3: Extract Payslips Sub-Domain (2 hours)

**Goal**: Consolidate scattered payslip logic into ITR feature

**Current Code**:
- Routes: `backend/app/api/routes.py` lines 547-846
- Extractor: `backend/app/services/pdf_extractor/payslip_extractor.py`

### Steps:

#### 3.1 Move Payslip Extractor

```bash
cd backend/app
mv services/pdf_extractor/payslip_extractor.py features/itr_prep/payslips/extractor.py
```

#### 3.2 Create Validators

Create `backend/app/features/itr_prep/payslips/validators.py`:

Extract validation logic from routes.py:

```python
from typing import List, Dict, Any


def is_duplicate_payslip(
    new_payslip: Dict[str, Any],
    existing_payslips: List[Dict[str, Any]]
) -> bool:
    """Check if payslip is duplicate."""
    # Extract logic from routes.py
    # Check for duplicates based on pay_period and company
    for existing in existing_payslips:
        if (existing.get("pay_period") == new_payslip.get("pay_period") and
            existing.get("company_name") == new_payslip.get("company_name")):
            return True
    return False


def is_payslip_data_empty(data: Dict[str, Any]) -> bool:
    """Check if payslip data is empty."""
    return not data or len(data.get("payslips", [])) == 0
```

#### 3.3 Create Repository

Create `backend/app/features/itr_prep/payslips/repository.py`:

```python
from pathlib import Path
import json
from typing import List, Dict, Any
from app.shared.persistence import IPayslipRepository


class FilePayslipRepository(IPayslipRepository):
    """File-based repository for payslip data."""

    def __init__(self, data_file: Path):
        self.data_file = data_file

    def get_all_payslips(self) -> List[Dict[str, Any]]:
        """Get all saved payslips."""
        if self.data_file.exists():
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                return data.get("payslips", [])
        return []

    def save_payslips(self, payslips: List[Dict[str, Any]]) -> None:
        """Save payslips."""
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_file, 'w') as f:
            json.dump({"payslips": payslips}, f, indent=2)

    def delete_payslip(self, payslip_id: str) -> None:
        """Delete a payslip by ID."""
        payslips = self.get_all_payslips()
        payslips = [p for p in payslips if p.get("id") != payslip_id]
        self.save_payslips(payslips)

    def delete_all_payslips(self) -> None:
        """Delete all payslips."""
        self.save_payslips([])
```

#### 3.4 Create Service

Create `backend/app/features/itr_prep/payslips/service.py`:

```python
from fastapi import UploadFile, HTTPException
from typing import List
import uuid
from .repository import FilePayslipRepository
from .extractor import extract_payslip_data
from .validators import is_duplicate_payslip


class PayslipService:
    """Service for payslip processing."""

    def __init__(self, repository: FilePayslipRepository):
        self.repo = repository

    async def process_uploads(self, files: List[UploadFile]):
        """Process uploaded payslip files."""
        results = []
        existing_payslips = self.repo.get_all_payslips()

        for file in files:
            # Read file content
            content = await file.read()

            # Extract data
            extracted_data = extract_payslip_data(content)

            # Check for duplicates
            if is_duplicate_payslip(extracted_data, existing_payslips):
                results.append({
                    "filename": file.filename,
                    "status": "duplicate",
                    "message": "Duplicate payslip"
                })
                continue

            # Add unique ID
            extracted_data["id"] = str(uuid.uuid4())[:8]

            # Save
            existing_payslips.append(extracted_data)
            results.append({
                "filename": file.filename,
                "status": "success",
                "data": extracted_data
            })

        # Save all
        self.repo.save_payslips(existing_payslips)

        return {
            "success": True,
            "processed": len(results),
            "results": results
        }

    def get_all_payslips(self):
        """Get all saved payslips."""
        return self.repo.get_all_payslips()

    def delete_payslip(self, payslip_id: str):
        """Delete a payslip."""
        self.repo.delete_payslip(payslip_id)
        return {"success": True, "message": "Payslip deleted"}

    def delete_all_payslips(self):
        """Delete all payslips."""
        self.repo.delete_all_payslips()
        return {"success": True, "message": "All payslips deleted"}
```

#### 3.5 Create Schemas

Create `backend/app/features/itr_prep/payslips/schemas.py`:

```python
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class PayslipData(BaseModel):
    id: str
    company_name: Optional[str]
    pay_period: Optional[str]
    gross_pay: Optional[float]
    net_pay: Optional[float]
    breakdown: Optional[Dict[str, Any]]


class PayslipUploadResponse(BaseModel):
    success: bool
    processed: int
    results: List[Dict[str, Any]]


class PayslipDeleteResponse(BaseModel):
    success: bool
    message: str
```

#### 3.6 Create Routes

Create `backend/app/features/itr_prep/payslips/routes.py`:

```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
from .schemas import PayslipUploadResponse, PayslipData, PayslipDeleteResponse
from .service import PayslipService
from app.dependencies import get_payslip_service

router = APIRouter()


@router.post("/upload-payslips", response_model=PayslipUploadResponse)
async def upload_payslips(
    files: List[UploadFile] = File(...),
    service: PayslipService = Depends(get_payslip_service)
):
    """Upload and process payslip PDFs."""
    return await service.process_uploads(files)


@router.get("/payslips", response_model=List[PayslipData])
async def get_payslips(
    service: PayslipService = Depends(get_payslip_service)
):
    """Get all saved payslips."""
    return service.get_all_payslips()


@router.delete("/payslips/{payslip_id}", response_model=PayslipDeleteResponse)
async def delete_payslip(
    payslip_id: str,
    service: PayslipService = Depends(get_payslip_service)
):
    """Delete a specific payslip."""
    return service.delete_payslip(payslip_id)


@router.delete("/payslips", response_model=PayslipDeleteResponse)
async def delete_all_payslips(
    service: PayslipService = Depends(get_payslip_service)
):
    """Delete all payslips."""
    return service.delete_all_payslips()
```

#### 3.7 Create ITR Router Registration

Create `backend/app/features/itr_prep/__init__.py`:

```python
from fastapi import APIRouter


def create_router():
    """Create and configure ITR Prep feature router."""
    router = APIRouter(prefix="/api", tags=["ITR Prep"])

    # Import sub-domain routers
    from .payslips.routes import router as payslip_router

    # Register sub-domains
    router.include_router(payslip_router)

    return router
```

#### 3.8 Update Dependencies

Add to `backend/app/dependencies.py`:

```python
from app.config import PAYSLIPS_DATA_FILE


# Payslip Dependencies
@lru_cache()
def get_payslip_repository():
    """Get payslip repository instance."""
    from app.features.itr_prep.payslips.repository import FilePayslipRepository
    return FilePayslipRepository(data_file=Path(PAYSLIPS_DATA_FILE))


def get_payslip_service(
    repo=Depends(get_payslip_repository)
):
    """Get payslip service instance."""
    from app.features.itr_prep.payslips.service import PayslipService
    return PayslipService(repository=repo)
```

#### 3.9 Update main.py

```python
from app.features.itr_prep import create_router as create_itr_router

# Add after investment aggregator
app.include_router(create_itr_router())
```

#### 3.10 Delete from routes.py

Delete lines 547-846 from `backend/app/api/routes.py`.

#### 3.11 Testing

```bash
# Test upload
curl -X POST -F "files=@payslip.pdf" http://localhost:8000/api/upload-payslips

# Test get all
curl http://localhost:8000/api/payslips

# Test delete
curl -X DELETE http://localhost:8000/api/payslips/{id}
```

---

## Phase 4: Split FIFO Calculator (4 hours)

**Goal**: Break 689-line monolith into focused modules

**Current Code**: `backend/app/services/fifo_calculator.py`

### Overview

Split into 6 focused files:
- `models.py` (~60 lines) - Data structures
- `classifier.py` (~120 lines) - Fund type classification
- `calculator.py` (~200 lines) - FIFO algorithm
- `cache_manager.py` (~100 lines) - Cache validation
- `repository.py` (~150 lines) - Data access
- `service.py` (~100 lines) - Orchestration

### Steps:

#### 4.1 Read Current FIFO Calculator

```bash
# Read the file to understand structure
cat backend/app/services/fifo_calculator.py
```

#### 4.2 Create Models

Create `backend/app/features/itr_prep/capital_gains/models.py`:

Extract dataclasses from fifo_calculator.py (Transaction, BuyLot, FIFOGain classes).

#### 4.3 Create Classifier

Create `backend/app/features/itr_prep/capital_gains/classifier.py`:

Extract `classify_fund_type()` and `get_fund_type_mapping()` functions.

#### 4.4 Create Calculator

Create `backend/app/features/itr_prep/capital_gains/calculator.py`:

Extract core `calculate_fifo_gains()` function.

#### 4.5 Create Cache Manager

Create `backend/app/features/itr_prep/capital_gains/cache_manager.py`:

Extract cache validation logic (`is_cache_valid()`, `invalidate_fifo_cache()`).

#### 4.6 Create Repository

Create `backend/app/features/itr_prep/capital_gains/repository.py`:

Implement `ICapitalGainsRepository` interface with file-based storage.

#### 4.7 Create Service

Create `backend/app/features/itr_prep/capital_gains/service.py`:

Create orchestration layer that uses classifier, calculator, cache_manager, and repository.

#### 4.8 Create Schemas

Create `backend/app/features/itr_prep/capital_gains/schemas.py`:

Extract FIFO-related schemas from models/schemas.py.

#### 4.9 Create Routes

Create `backend/app/features/itr_prep/capital_gains/routes.py`:

Extract 3 endpoints from routes.py lines 223-390.

#### 4.10 Update ITR Router

Update `backend/app/features/itr_prep/__init__.py`:

```python
def create_router():
    router = APIRouter(prefix="/api", tags=["ITR Prep"])

    from .capital_gains.routes import router as cg_router
    from .payslips.routes import router as payslip_router

    router.include_router(cg_router)
    router.include_router(payslip_router)

    return router
```

#### 4.11 Update Dependencies

Add capital gains dependencies to `dependencies.py`.

#### 4.12 Delete Old Files

```bash
rm backend/app/services/fifo_calculator.py
```

Delete capital gains code from routes.py (lines 223-390).

#### 4.13 Testing

Test all 3 capital gains endpoints.

---

## Phase 5: Split CAS Parser (4 hours)

**Goal**: Break 827-line file into format-specific parsers

**Current Code**: `backend/app/services/cas_parser.py`

### Overview

Split into format-specific parsers:
- `parsers/base.py` - Abstract base class
- `parsers/cams_parser.py` - CAMS format
- `parsers/kfintech_parser.py` - KFINTECH format
- `parsers/utils.py` - Shared utilities

### Steps:

#### 5.1 Create Parser Base Class

Create `backend/app/features/itr_prep/cas/parsers/base.py`.

#### 5.2 Create CAMS Parser

Create `backend/app/features/itr_prep/cas/parsers/cams_parser.py`.

#### 5.3 Create KFINTECH Parser

Create `backend/app/features/itr_prep/cas/parsers/kfintech_parser.py`.

#### 5.4 Create Parser Utils

Create `backend/app/features/itr_prep/cas/parsers/utils.py`.

#### 5.5 Create Parser Factory

Create `backend/app/features/itr_prep/cas/parsers/__init__.py` with `detect_and_parse_cas()`.

#### 5.6 Create Repository

Create `backend/app/features/itr_prep/cas/repository.py`.

#### 5.7 Create Service

Create `backend/app/features/itr_prep/cas/service.py`.

#### 5.8 Create Schemas

Create `backend/app/features/itr_prep/cas/schemas.py`.

#### 5.9 Create Exceptions

Create `backend/app/features/itr_prep/cas/exceptions.py`.

#### 5.10 Create Routes

Create `backend/app/features/itr_prep/cas/routes.py` with 3 endpoints.

#### 5.11 Update ITR Router

Add CAS router to `features/itr_prep/__init__.py`.

#### 5.12 Update Dependencies

Add CAS dependencies.

#### 5.13 Delete Old Files

```bash
rm backend/app/services/cas_parser.py
```

Delete CAS code from routes.py (lines 392-544).

#### 5.14 Testing

Test all 3 CAS endpoints with both file formats.

---

## Phase 6: Setup Playground (1 hour)

**Goal**: Prepare playground with calculator registry

### Steps:

#### 6.1 Find Existing Calculators

Search for existing playground/calculator code in the codebase.

#### 6.2 Create Calculator Files

Move existing calculators to `features/playground/calculators/` and update with `@register_calculator` decorator.

#### 6.3 Create Playground Routes

Create `features/playground/routes.py` with generic calculator endpoint.

#### 6.4 Create Schemas

Create `features/playground/schemas.py`.

#### 6.5 Create Calculators Init

Create `features/playground/calculators/__init__.py` to import all calculators.

#### 6.6 Update main.py

Add playground router.

#### 6.7 Testing

Test calculator discovery and execution.

---

## Phase 7: Final Cleanup (1 hour)

**Goal**: Clean up old files and update documentation

### Steps:

#### 7.1 Verify routes.py is Empty

Check `backend/app/api/routes.py` - should have no endpoints left.

#### 7.2 Delete Old Files

```bash
rm backend/app/api/routes.py
rm -rf backend/app/services/  # If empty
```

#### 7.3 Update main.py

Ensure main.py only imports from features.

#### 7.4 Update CLAUDE.md

Update project documentation with new structure.

#### 7.5 Final Testing

Run full test suite and verify all endpoints work.

---

## Testing Checklist

After each phase:
- [ ] All affected endpoints return correct responses
- [ ] No import errors
- [ ] API docs at `/docs` reflect changes
- [ ] Manual testing of changed endpoints

After all phases:
- [ ] All 16 original endpoints work identically
- [ ] No API contract changes
- [ ] Performance unchanged
- [ ] Code is navigable

---

## Reference: Current File Structure

```
backend/app/
├── main.py
├── config.py
├── dependencies.py        # NEW
├── exceptions.py          # NEW
│
├── core/                  # NEW
│   ├── utils.py
│   └── tax_rules.py
│
├── shared/                # NEW
│   ├── persistence.py
│   ├── calculator_registry.py
│   └── file_manager.py
│
├── features/              # NEW
│   ├── health/
│   ├── investment_aggregator/
│   ├── itr_prep/
│   │   ├── capital_gains/
│   │   ├── cas/
│   │   ├── payslips/
│   │   └── manual_entry/
│   └── playground/
│
├── api/
│   └── routes.py          # TO BE DELETED
├── models/
│   └── schemas.py         # TO BE DISTRIBUTED
└── services/              # TO BE DELETED
    ├── fifo_calculator.py
    ├── cas_parser.py
    └── pdf_extractor/
```

---

## Quick Reference Commands

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test endpoint
curl http://localhost:8000/api/health

# View API docs
open http://localhost:8000/docs

# Check imports
python3 -c "from app.features import health; print('OK')"
```

---

## Tips for Next Session

1. **Always read files first** before editing or moving them
2. **Test after each phase** - don't batch multiple phases
3. **Keep old files** in archive/ folder until everything works
4. **Use git** to track changes and enable rollback
5. **Reference this file** for step-by-step instructions
6. **Update todos** to track progress through phases

---

## Contact Plan Location

Original detailed plan: `/Users/nehagupta/.claude/plans/swirling-hopping-pebble.md`
