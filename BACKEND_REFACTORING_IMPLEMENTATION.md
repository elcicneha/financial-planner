# Backend Refactoring Implementation Guide

**Status**: Phase 0 ✅ Complete | Phase 1-7 Pending

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

## Phase 1: Extract Health Check Feature (30 minutes)

**Goal**: Validate the pattern with the simplest feature

**Current Code**: `backend/app/api/routes.py` lines 105-108

### Steps:

#### 1.1 Create Health Schemas

Create `backend/app/features/health/schemas.py`:

```python
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    timestamp: str
```

#### 1.2 Create Health Routes

Create `backend/app/features/health/routes.py`:

```python
from fastapi import APIRouter
from datetime import datetime
from .schemas import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat()
    )
```

#### 1.3 Update main.py

Read `backend/app/main.py` and add the health router:

```python
# Add this import at the top
from app.features.health.routes import router as health_router

# Add this after app creation, before existing routes
app.include_router(health_router, prefix="/api")
```

#### 1.4 Remove from routes.py

Read `backend/app/api/routes.py` and delete lines 105-108 (the health endpoint).

#### 1.5 Testing

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test in another terminal
curl http://localhost:8000/api/health
```

Expected output: `{"status":"healthy","timestamp":"2026-01-28T..."}`

---

## Phase 2: Extract Investment Aggregator (3 hours)

**Goal**: Migrate PDF extraction feature with all 5 endpoints

**Current Code**:
- Routes: `backend/app/api/routes.py` lines 111-221
- Extractor: `backend/app/services/pdf_extractor/*`

### Steps:

#### 2.1 Move PDF Extractor

```bash
cd backend/app
mv services/pdf_extractor/* features/investment_aggregator/extractor/
```

#### 2.2 Create Repository

Create `backend/app/features/investment_aggregator/repository.py`:

```python
from pathlib import Path
from fastapi import UploadFile
import shutil
import json
from datetime import datetime
from typing import Dict, Any, List, Optional


class FileTransactionRepository:
    """File-based repository for transaction data."""

    def __init__(self, uploads_dir: Path, outputs_dir: Path):
        self.uploads_dir = uploads_dir
        self.outputs_dir = outputs_dir

    async def save_upload(self, file: UploadFile, file_id: str) -> Path:
        """Save uploaded PDF file."""
        from app.shared.file_manager import sanitize_filename

        filename = sanitize_filename(file.filename)
        file_path = self.uploads_dir / f"{file_id}_{filename}"

        # Ensure directory exists
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)

        return file_path

    def cleanup_upload(self, file_path: Path) -> None:
        """Delete uploaded PDF after processing."""
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass

    def get_output_path(self, file_id: str) -> Optional[Path]:
        """Get path to processed output file."""
        # Search for file in outputs directory
        for date_dir in self.outputs_dir.glob("*/"):
            output_file = date_dir / f"transactions_{file_id}.csv"
            if output_file.exists():
                return output_file
        return None

    def list_all_files(self) -> List[Dict[str, Any]]:
        """List all processed transaction files."""
        files = []
        for date_dir in sorted(self.outputs_dir.glob("*/"), reverse=True):
            for csv_file in date_dir.glob("transactions_*.csv"):
                file_id = csv_file.stem.replace("transactions_", "")
                files.append({
                    "file_id": file_id,
                    "filename": csv_file.name,
                    "date": date_dir.name,
                    "path": str(csv_file)
                })
        return files
```

#### 2.3 Create Service

Create `backend/app/features/investment_aggregator/service.py`:

```python
from pathlib import Path
from fastapi import UploadFile, HTTPException
from .repository import FileTransactionRepository
from .extractor import extract_transactions
import logging

logger = logging.getLogger(__name__)


class PDFTransactionService:
    """Service for PDF transaction extraction."""

    def __init__(self, repository: FileTransactionRepository):
        self.repo = repository

    async def process_upload(self, file: UploadFile):
        """Process uploaded PDF and extract transactions."""
        import uuid

        # Generate unique file ID
        file_id = str(uuid.uuid4())[:8]

        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        # Save upload
        pdf_path = await self.repo.save_upload(file, file_id)

        try:
            # Extract transactions
            result = extract_transactions(str(pdf_path), file_id)

            # Cleanup
            self.repo.cleanup_upload(pdf_path)

            return {
                "success": True,
                "file_id": file_id,
                "message": "File processed successfully",
                "output_path": result.get("output_file")
            }

        except Exception as e:
            logger.error(f"Error processing file {file_id}: {str(e)}")
            self.repo.cleanup_upload(pdf_path)
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    def get_results(self, file_id: str):
        """Get processing results for a file."""
        output_path = self.repo.get_output_path(file_id)

        if not output_path:
            raise HTTPException(status_code=404, detail="File not found")

        return {
            "file_id": file_id,
            "output_file": str(output_path),
            "exists": True
        }

    def list_files(self):
        """List all processed files."""
        return self.repo.list_all_files()

    def get_download_path(self, file_id: str) -> Path:
        """Get file path for download."""
        output_path = self.repo.get_output_path(file_id)

        if not output_path:
            raise HTTPException(status_code=404, detail="File not found")

        return output_path
```

#### 2.4 Create Schemas

Create `backend/app/features/investment_aggregator/schemas.py`:

Extract relevant schemas from `backend/app/models/schemas.py`:

```python
from pydantic import BaseModel
from typing import Optional, List


class UploadResponse(BaseModel):
    success: bool
    file_id: str
    message: str
    output_path: Optional[str] = None


class ProcessingResult(BaseModel):
    file_id: str
    output_file: str
    exists: bool


class FileInfo(BaseModel):
    file_id: str
    filename: str
    date: str
    path: str


class AvailableFinancialYear(BaseModel):
    year: str
```

#### 2.5 Create Routes

Create `backend/app/features/investment_aggregator/routes.py`:

Extract from `backend/app/api/routes.py` lines 111-221:

```python
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List
from .schemas import UploadResponse, ProcessingResult, FileInfo, AvailableFinancialYear
from .service import PDFTransactionService
from app.dependencies import get_pdf_transaction_service

router = APIRouter(tags=["Investment Aggregator"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """Upload and process PDF statement."""
    return await service.process_upload(file)


@router.get("/results/{file_id}", response_model=ProcessingResult)
async def get_results(
    file_id: str,
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """Get processing results for a file."""
    return service.get_results(file_id)


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """Download processed CSV file."""
    file_path = service.get_download_path(file_id)
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="text/csv"
    )


@router.get("/files", response_model=List[FileInfo])
async def list_files(
    service: PDFTransactionService = Depends(get_pdf_transaction_service)
):
    """List all processed files."""
    return service.list_files()


@router.get("/available-financial-years", response_model=List[AvailableFinancialYear])
async def get_available_financial_years():
    """Get list of financial years with data."""
    from app.core.utils import get_available_financial_years
    years = get_available_financial_years()
    return [{"year": year} for year in years]
```

#### 2.6 Update Dependencies

Update `backend/app/dependencies.py`:

```python
"""Dependency injection configuration for FastAPI."""

from functools import lru_cache
from fastapi import Depends
from pathlib import Path
from app.config import UPLOADS_DIR, OUTPUTS_DIR


# Investment Aggregator Dependencies
@lru_cache()
def get_pdf_transaction_repository():
    """Get PDF transaction repository instance."""
    from app.features.investment_aggregator.repository import FileTransactionRepository
    return FileTransactionRepository(
        uploads_dir=Path(UPLOADS_DIR),
        outputs_dir=Path(OUTPUTS_DIR)
    )


def get_pdf_transaction_service(
    repo=Depends(get_pdf_transaction_repository)
):
    """Get PDF transaction service instance."""
    from app.features.investment_aggregator.service import PDFTransactionService
    return PDFTransactionService(repository=repo)
```

#### 2.7 Update main.py

Add investment aggregator router:

```python
from app.features.investment_aggregator.routes import router as invest_router

# Add after health router
app.include_router(invest_router, prefix="/api")
```

#### 2.8 Update Extractor Imports

Update `backend/app/features/investment_aggregator/extractor/__init__.py` to fix import paths (change from `app.services.pdf_extractor` to relative imports).

#### 2.9 Delete from routes.py

Delete lines 111-221 from `backend/app/api/routes.py`.

#### 2.10 Testing

```bash
# Test upload
curl -X POST -F "file=@test.pdf" http://localhost:8000/api/upload

# Test list files
curl http://localhost:8000/api/files

# Test download
curl http://localhost:8000/api/download/{file_id} --output output.csv
```

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
