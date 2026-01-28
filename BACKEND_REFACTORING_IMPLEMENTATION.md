# Backend Refactoring Implementation Guide

**Status**: Phase 0-6 ✅ Complete | Phase 7 Pending

This guide provides step-by-step instructions for completing the backend refactoring from Phase 1 onwards. Phase 0 (infrastructure setup) is already complete.

## Summary of Completed Work

**Phases Completed**: 0-6 (Infrastructure, Health, Investment Aggregator, Payslips, Capital Gains, CAS Parser, Playground)

**Files Refactored**:
- 827-line `cas_parser.py` → 10 focused CAS modules
- 689-line `fifo_calculator.py` → 8 focused capital gains modules
- Payslips feature → 7 modules with Repository-Service-Routes pattern
- Investment Aggregator → 5 modules with clean architecture
- Playground feature → 4 modules with calculator registry pattern
- Health check → 2 modules

**Key Achievements**:
- ✅ All 18 endpoints migrated and tested (15 existing + 3 new playground)
- ✅ Repository-Service-Routes architecture established
- ✅ Dependency injection implemented
- ✅ Calculator registry pattern for dynamic discovery
- ✅ No API contract changes
- ✅ Zero import errors
- ✅ Clean separation of concerns

**Files Deleted**:
- `backend/app/api/routes.py`
- `backend/app/services/cas_parser.py`
- `backend/app/services/fifo_calculator.py`

**Next**: Phase 7 (Final Cleanup)

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

## Phase 3: Extract Payslips Sub-Domain ✅ COMPLETED

**Goal**: Consolidate scattered payslip logic into ITR feature

**What was done:**
- ✓ Moved payslip extractor to `backend/app/features/itr_prep/payslips/extractor.py` (updated import for pdfToTxt)
- ✓ Created `backend/app/features/itr_prep/payslips/validators.py` - Validation logic for empty/duplicate payslips
- ✓ Created `backend/app/features/itr_prep/payslips/repository.py` - FilePayslipRepository implementing IPayslipRepository
- ✓ Created `backend/app/features/itr_prep/payslips/service.py` - PayslipService with upload processing, validation, and CRUD operations
- ✓ Created `backend/app/features/itr_prep/payslips/schemas.py` - Pydantic models (PayslipData, PayslipRecord, PayslipUploadResponse, PayslipsListResponse, etc.)
- ✓ Created `backend/app/features/itr_prep/payslips/routes.py` - 4 payslip endpoints with ITR Prep tag
- ✓ Created `backend/app/features/itr_prep/__init__.py` - ITR router registration with payslips sub-domain
- ✓ Updated `backend/app/dependencies.py` - Added payslip repository and service dependencies with file_id_length parameter
- ✓ Updated `backend/app/main.py` - Registered ITR router via create_itr_router()
- ✓ Removed old code from `backend/app/api/routes.py` - Deleted payslip helper functions and endpoints (lines 363-662)
- ✓ Removed payslip-related imports from `backend/app/api/routes.py` (PAYSLIPS_DIR, PAYSLIPS_DATA_FILE, payslip schemas, payslip_extractor)
- ✓ Tested all 4 endpoints successfully

**Files created:**
- `backend/app/features/itr_prep/__init__.py`
- `backend/app/features/itr_prep/payslips/extractor.py` (moved from services/pdf_extractor/)
- `backend/app/features/itr_prep/payslips/validators.py`
- `backend/app/features/itr_prep/payslips/repository.py`
- `backend/app/features/itr_prep/payslips/service.py`
- `backend/app/features/itr_prep/payslips/schemas.py`
- `backend/app/features/itr_prep/payslips/routes.py`

**Files modified:**
- `backend/app/dependencies.py` (added payslip dependencies)
- `backend/app/main.py` (registered ITR router)
- `backend/app/api/routes.py` (removed payslip endpoints, helper functions, and imports)

**Endpoints migrated:**
1. `POST /api/upload-payslips` - Upload and extract payslip data ✓
2. `GET /api/payslips` - Get all saved payslips (sorted by pay period) ✓
3. `DELETE /api/payslips/{payslip_id}` - Delete specific payslip ✓
4. `DELETE /api/payslips` - Delete all payslips ✓

**Test results:**
- All endpoints return correct responses
- Error handling works (404 for non-existent payslip_id)
- OpenAPI spec updated correctly with "ITR Prep" tag
- No import errors on server startup
- Existing payslips preserved and accessible
- Verified deletion endpoint with test payslip

**Pattern validated**: ITR Prep feature now has clean sub-domain structure. Payslips module uses Repository-Service-Routes pattern with dependency injection, matching investment aggregator architecture.

**Next**: Proceed to Phase 4

---

## Phase 4: Split FIFO Calculator ✅ COMPLETED

**Goal**: Break 689-line monolith into focused modules

**What was done:**
- ✓ Created `models.py` with Transaction, BuyLot, FIFOGain classes and decimal helpers (120 lines)
- ✓ Created `classifier.py` with fund type classification logic (130 lines)
- ✓ Created `calculator.py` with core FIFO algorithm (135 lines)
- ✓ Created `cache_manager.py` with cache validation logic (75 lines)
- ✓ Created `repository.py` with FileCapitalGainsRepository implementing ICapitalGainsRepository (285 lines)
- ✓ Created `service.py` with CapitalGainsService orchestration layer (125 lines)
- ✓ Created `schemas.py` with FIFO-related Pydantic models (55 lines)
- ✓ Created `routes.py` with 3 capital gains endpoints (175 lines)
- ✓ Updated `backend/app/features/itr_prep/__init__.py` to include capital_gains router
- ✓ Updated `backend/app/dependencies.py` with capital gains repository and service dependencies
- ✓ Updated `backend/app/shared/persistence.py` ICapitalGainsRepository interface to match implementation
- ✓ Tested all 3 endpoints successfully (GET /capital-gains, PUT /fund-type-override, PUT /fund-type-overrides)
- ✓ Deleted `backend/app/services/fifo_calculator.py` (689 lines)
- ✓ Removed capital gains endpoints and imports from `backend/app/api/routes.py`

**Endpoints migrated:**
1. `GET /api/capital-gains` - Get FIFO capital gains with optional FY filter ✓
2. `PUT /api/fund-type-override` - Update single fund type override ✓
3. `PUT /api/fund-type-overrides` - Batch update fund type overrides ✓

**Files created:**
- `backend/app/features/itr_prep/capital_gains/models.py`
- `backend/app/features/itr_prep/capital_gains/classifier.py`
- `backend/app/features/itr_prep/capital_gains/calculator.py`
- `backend/app/features/itr_prep/capital_gains/cache_manager.py`
- `backend/app/features/itr_prep/capital_gains/repository.py`
- `backend/app/features/itr_prep/capital_gains/service.py`
- `backend/app/features/itr_prep/capital_gains/schemas.py`
- `backend/app/features/itr_prep/capital_gains/routes.py`

**Files modified:**
- `backend/app/features/itr_prep/__init__.py` (added capital_gains router)
- `backend/app/dependencies.py` (added capital gains dependencies)
- `backend/app/shared/persistence.py` (updated ICapitalGainsRepository interface)
- `backend/app/api/routes.py` (removed FIFO endpoints and imports)

**Test results:**
- All endpoints return correct responses
- Summary calculation works correctly (total_stcg, total_ltcg, total_gains)
- Fund type overrides work (single and batch)
- No import errors on server startup

**Pattern validated**: Successfully split 689-line monolith into 8 focused modules with clear separation of concerns. Repository-Service-Routes architecture with dependency injection works well for complex calculation workflows.

**Next**: Proceed to Phase 5

---

## Phase 5: Split CAS Parser ✅ COMPLETED

**Goal**: Break 827-line file into format-specific parsers

**What was done:**
- ✓ Created `parsers/base.py` - Abstract parser interface with shared summary parsing logic
- ✓ Created `parsers/cams_parser.py` - CAMS format parser with specific column mappings
- ✓ Created `parsers/kfintech_parser.py` - KFINTECH format parser with asset type inference
- ✓ Created `parsers/utils.py` - Shared utilities (date/number parsing, deduplication, FY inference)
- ✓ Created `parsers/__init__.py` - Parser factory with format auto-detection and Excel file opening
- ✓ Created `repository.py` - FileCASRepository for JSON file operations by financial year
- ✓ Created `service.py` - CASService with parsing, merging, and deduplication logic
- ✓ Created `schemas.py` - CAS Pydantic models (CASCapitalGains, CASTransaction, etc.)
- ✓ Created `exceptions.py` - CAS-specific exceptions (CASParserError, CASFormatError, PasswordRequiredError)
- ✓ Created `routes.py` - 3 CAS endpoints with dependency injection
- ✓ Updated `backend/app/features/itr_prep/__init__.py` to include CAS router
- ✓ Updated `backend/app/dependencies.py` with CAS repository and service dependencies
- ✓ Updated `backend/app/main.py` - Removed old routes import
- ✓ Deleted `backend/app/services/cas_parser.py` (827 lines → distributed across 10 focused modules)
- ✓ Deleted `backend/app/api/routes.py` (only contained CAS endpoints)
- ✓ Tested all 3 endpoints successfully

**Endpoints migrated:**
1. `POST /api/upload-cas` - Upload and parse CAS Excel files (CAMS/KFINTECH) ✓
2. `GET /api/cas-files` - List all CAS files with metadata ✓
3. `GET /api/capital-gains-cas` - Get CAS capital gains data (4 categories) ✓

**Files created:**
- `backend/app/features/itr_prep/cas/parsers/base.py`
- `backend/app/features/itr_prep/cas/parsers/cams_parser.py`
- `backend/app/features/itr_prep/cas/parsers/kfintech_parser.py`
- `backend/app/features/itr_prep/cas/parsers/utils.py`
- `backend/app/features/itr_prep/cas/parsers/__init__.py`
- `backend/app/features/itr_prep/cas/repository.py`
- `backend/app/features/itr_prep/cas/service.py`
- `backend/app/features/itr_prep/cas/schemas.py`
- `backend/app/features/itr_prep/cas/exceptions.py`
- `backend/app/features/itr_prep/cas/routes.py`

**Files modified:**
- `backend/app/features/itr_prep/__init__.py` (added CAS router)
- `backend/app/dependencies.py` (added CAS dependencies)
- `backend/app/main.py` (removed old routes import)

**Files deleted:**
- `backend/app/services/cas_parser.py` (827 lines)
- `backend/app/api/routes.py` (only contained CAS endpoints)

**Test results:**
- All endpoints return correct responses
- `/api/cas-files` returns file list with metadata
- `/api/capital-gains-cas` returns structured capital gains (equity/debt × short/long term)
- `/api/upload-cas` validates input correctly
- No import errors on server startup

**Pattern validated**: Successfully split 827-line monolith into 10 focused modules. Parser factory pattern with format auto-detection works well. Repository-Service-Routes architecture with dependency injection provides clean separation.

**Next**: Proceed to Phase 6

---

## Phase 6: Setup Playground ✅ COMPLETED

**Goal**: Prepare playground with calculator registry

**What was done:**
- ✓ Discovered existing frontend Break Calculator (client-side only in TypeScript)
- ✓ Created `backend/app/features/playground/schemas.py` - Input/output schemas for Break Calculator and generic calculator execution
- ✓ Created `backend/app/features/playground/calculators/break_calculator.py` - Backend implementation with `@register_calculator` decorator
- ✓ Created `backend/app/features/playground/calculators/__init__.py` - Imports all calculators to trigger registration
- ✓ Created `backend/app/features/playground/routes.py` - 3 playground endpoints (list, generic execute, typed break calculator)
- ✓ Updated `backend/app/features/playground/__init__.py` - Exports playground_router
- ✓ Updated `backend/app/main.py` - Registered playground router
- ✓ Tested all 3 endpoints successfully

**Endpoints added:**
1. `GET /api/playground/calculators` - List all registered calculators (dynamic discovery) ✓
2. `POST /api/playground/calculate` - Generic calculator execution endpoint ✓
3. `POST /api/playground/break-calculator` - Typed endpoint for Break Calculator ✓

**Files created:**
- `backend/app/features/playground/schemas.py`
- `backend/app/features/playground/calculators/break_calculator.py`
- `backend/app/features/playground/calculators/__init__.py`
- `backend/app/features/playground/routes.py`

**Files modified:**
- `backend/app/features/playground/__init__.py` (added router export)
- `backend/app/main.py` (registered playground_router)

**Test results:**
- Calculator registry works - "break" calculator discovered via decorator
- `/api/playground/calculators` returns list with 1 calculator
- `/api/playground/calculate` executes calculator with generic params
- `/api/playground/break-calculator` executes with typed inputs/outputs
- Error handling works (404 for non-existent calculator)
- OpenAPI spec updated with "Playground" tag
- No import errors on server startup

**Implementation notes:**
- Break Calculator backend logic matches frontend TypeScript implementation exactly
- Two-phase calculation: accumulation (with FV formulas) + spending (iterative simulation)
- Supports effective vs nominal rate conversion
- Supports ordinary annuity vs annuity due (month start vs month end investing)
- Calculator registry enables dynamic discovery without route modifications
- Generic endpoint allows frontend/bots to discover and execute calculators programmatically

**Pattern validated**: Calculator registry pattern works perfectly for extensible playground features. New calculators can be added with just a decorator, no route changes needed.

**Next**: Proceed to Phase 7

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
- [x] All affected endpoints return correct responses (Phases 1-5)
- [x] No import errors (Phases 1-5)
- [x] API docs at `/docs` reflect changes (Phases 1-5)
- [x] Manual testing of changed endpoints (Phases 1-5)

After all phases (6-7):
- [ ] All 15 endpoints work identically
- [ ] No API contract changes
- [ ] Performance unchanged
- [ ] Code is navigable

---

## Reference: Current File Structure

```
backend/app/
├── main.py
├── config.py
├── dependencies.py        # Dependency injection
├── exceptions.py          # Custom exceptions
│
├── core/
│   ├── utils.py
│   └── tax_rules.py
│
├── shared/
│   ├── persistence.py
│   ├── calculator_registry.py
│   └── file_manager.py
│
├── features/
│   ├── health/            # ✓ Phase 1
│   ├── investment_aggregator/  # ✓ Phase 2
│   ├── itr_prep/
│   │   ├── __init__.py    # ITR router
│   │   ├── capital_gains/ # ✓ Phase 4
│   │   ├── cas/           # ✓ Phase 5
│   │   │   ├── parsers/
│   │   │   │   ├── base.py
│   │   │   │   ├── cams_parser.py
│   │   │   │   ├── kfintech_parser.py
│   │   │   │   ├── utils.py
│   │   │   │   └── __init__.py
│   │   │   ├── repository.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   ├── exceptions.py
│   │   │   └── routes.py
│   │   ├── payslips/      # ✓ Phase 3
│   │   └── manual_entry/  # Future
│   └── playground/        # Phase 6
│
├── models/
│   └── schemas.py         # Legacy schemas (to be distributed)
└── services/              # Legacy (being phased out)
    └── pdf_extractor/     # Moved to investment_aggregator
```

**Deleted:**
- `backend/app/api/routes.py` (Phase 5)
- `backend/app/services/cas_parser.py` (Phase 5)
- `backend/app/services/fifo_calculator.py` (Phase 4)

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
3. **Use git** to track changes and enable rollback
4. **Update todos** to track progress through phases
