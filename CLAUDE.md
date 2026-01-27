# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Quick Start (Both Services)

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip3 install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000

# Terminal 2: Frontend
cd frontend
pnpm install  # Use pnpm (preferred over npm)
pnpm run dev  # http://localhost:3000
```

### Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip3 install -r requirements.txt
uvicorn app.main:app --reload  # Runs on http://localhost:8000
```

**Available during development:**
- API docs (interactive): http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json
- Health check: http://localhost:8000/api/health

### Frontend (Next.js)

Development:
```bash
cd frontend
pnpm install  # Use pnpm as package manager
pnpm run dev  # Runs on http://localhost:3000 with hot reload
```

Production:
```bash
pnpm run build  # Build optimized bundle
pnpm run start  # Run production server
```

Linting & Code Quality:
```bash
pnpm run lint  # Run ESLint
```

### Testing

Tax rules validation:
```bash
cd backend
python3 test_tax_rules.py  # Validates equity/debt fund holding period rules
```

All tests pass when FIFO calculations are working correctly.

## Architecture

This is a full-stack application for extracting mutual fund transaction data from PDF statements.

### Frontend → Backend Communication
- Next.js proxies `/api/*` requests to FastAPI backend (configured in `next.config.js`)
- Frontend runs on port 3000, backend on port 8000
- UI built with Shadcn/ui components (Radix UI primitives + Tailwind CSS)

### PDF Extraction Pipeline (5-step process)
Located in `backend/app/services/pdf_extractor/`:

1. **pdfToTxt.py** - Converts PDF to text using PyMuPDF
2. **extractTextToCSV.py** - Parses text into fund details and dates data CSVs
3. **processDatesData.py** - Processes dates data
4. **processFundDeets.py** - Cleans fund details using ISIN-ticker database (`isin_ticker_db.csv`)
5. **finalCombine.py** - Combines processed data into final CSV

Entry point: `extract_transactions()` in `__init__.py`

### ITR Prep Feature

The `/itr-prep` page provides capital gains calculations for Income Tax Return preparation using a variant switching UI pattern.

**Variants:**
- **CAS** (default): Displays capital gains from CAS Excel uploads (CAMS/KFINTECH formats)
  - Shows 4 categories: Equity/Debt × Short-term/Long-term
  - Supports password-protected Excel files
  - Supports multiple financial years (FY2024-25, etc.)
- **FIFO**: Transaction-level capital gains using First-In-First-Out method
  - Calculates gains from all transaction CSVs in `data/outputs/`
  - Cached in `data/fifo_cache.json` for performance
  - Manual fund type override stored in `data/fund_type_overrides.json`
  - Cache invalidates when transactions or overrides change

**Variant System:**
- Each variant is a standalone component in `frontend/app/itr-prep/variants/`
- Variant selection persisted in localStorage (`itr-prep-variant` key)
- Variant switcher available in dev mode: On the ITR Prep page, click the gear icon (⚙️) in the top-right corner to toggle between CAS/FIFO variants
- Dev mode is enabled via `DevModeProvider` context and persisted in localStorage

### Data Flow

**PDF Processing:**
1. User uploads PDF via frontend
2. Backend saves PDF to `data/uploads/{date}/{file_id}_{filename}.pdf`
3. PDF extraction pipeline processes the file
4. Final CSV saved to `data/outputs/{date}/transactions_{file_id}.csv`
5. User downloads CSV via `/api/download/{file_id}`

**CAS Processing:**
1. User uploads CAS Excel file (.xls from CAMS or .xlsx from KFINTECH) via `/itr-prep` page
2. Backend detects format (CAMS vs KFINTECH) and decrypts if password-protected
3. Financial year inferred from redemption dates in transactions
4. Parsed data merged with existing data (deduplicates transactions) and saved to `data/cas/FY{year}.json`
5. Capital gains extracted from summary sheets (OVERALL_SUMMARY_EQUITY/NONEQUITY for CAMS)

**FIFO Calculations:**
1. Backend reads all CSVs from `data/outputs/`
2. Applies fund type classification (with manual overrides from `data/fund_type_overrides.json`)
3. Calculates FIFO gains and caches in `data/fifo_cache.json`
4. Cache invalidates when transactions or overrides change

**Payslips Processing:**
1. User uploads payslip PDF(s) via `/itr-prep` (Other Information) page
2. Backend extracts salary data (gross pay, breakdown, pay period, company name) using `payslip_extractor.py`
3. Extracted data saved to `data/payslips/payslips_data.json` with unique ID (PDF not retained)
4. Frontend auto-loads saved payslips on page load via `/api/payslips`
5. Users can delete individual payslips or clear all via DELETE endpoints

### API Endpoints

**PDF Processing:**
- `POST /api/upload` - Upload PDF and process
- `GET /api/results/{file_id}` - Get processing results
- `GET /api/download/{file_id}` - Download CSV
- `GET /api/files` - List all processed CSV files

**ITR Prep - FIFO Calculations:**
- `GET /api/capital-gains` - Get FIFO capital gains calculations (cached, recalculates if invalid)
- `PUT /api/fund-type-override` - Manually override fund type (equity/debt) for a ticker

**ITR Prep - CAS (Capital Account Statement):**
- `POST /api/upload-cas` - Upload CAS Excel file (.xls/.xlsx, supports password-protected files)
- `GET /api/cas-files` - List all uploaded CAS files
- `GET /api/capital-gains-cas?fy={FY}` - Get CAS capital gains data (4 categories: equity/debt × short/long term)

**ITR Prep - Payslips:**
- `POST /api/upload-payslips` - Upload payslip PDF files and extract salary data (batch upload supported)
- `GET /api/payslips` - Retrieve all saved payslips with extracted data
- `DELETE /api/payslips/{payslip_id}` - Delete a specific payslip by ID
- `DELETE /api/payslips` - Delete all payslips

**Misc:**
- `GET /api/health` - Health check

### Key Files

**Backend:**
- Entry point: `backend/app/main.py`
- API routes: `backend/app/api/routes.py`
- Pydantic schemas: `backend/app/models/schemas.py`
- PDF extraction: `backend/app/services/pdf_extractor/__init__.py` (calls `extract_transactions()`)
- Payslip extractor: `backend/app/services/pdf_extractor/payslip_extractor.py` (extracts salary data from payslip PDFs)
- FIFO calculator: `backend/app/services/fifo_calculator.py` (caching, fund type overrides)
- **Tax rules: `backend/app/tax_rules.py` (capital gains tax rules - easy to modify when tax laws change)**
- CAS parser: `backend/app/services/cas_parser.py` (Excel parsing for CAMS/KFINTECH formats)

**Frontend:**
- Home: `frontend/app/page.tsx`
- Upload page: `frontend/app/upload/page.tsx`
- ITR prep page: `frontend/app/itr-prep/page.tsx`
- ITR variants: `frontend/app/itr-prep/variants/` (VariantCAS.tsx, VariantFIFO.tsx, VariantOtherInfo.tsx)
- Components: `frontend/components/` (VariantSwitcher, CapitalGainsTable, PayslipUploadDialog, etc.)
- Dev mode context: `frontend/components/dev/DevModeProvider.tsx`
- Transaction data hook: `frontend/hooks/useTransactionData.ts`
- API proxy config: `frontend/next.config.js` (rewrites `/api/*` to `BACKEND_URL`)

### Frontend Structure
- Pages: `/` (home), `/upload` (upload interface), `/itr-prep` (ITR preparation with variants), `/playground` (dev mode)
- TypeScript with path aliases (`@/` imports configured in `tsconfig.json`)
- Styling: Tailwind CSS with custom theme in `tailwind.config.js`, supports dark mode
- Dev mode: Toggled via localStorage flag, enabled/disabled via `DevModeProvider` context

### Debugging & Development

**Backend:**
- Interactive API docs available at http://localhost:8000/docs (Swagger UI)
- Review `backend/app/config.py` for all path constants and configuration
- Data directories are automatically created on first request (via `ensure_directories()` in config.py)
- Common issues:
  - Port 8000 already in use: Change in uvicorn command or kill existing process
  - CORS errors: Check `CORS_ORIGINS` environment variable matches frontend URL
  - PDF extraction fails: Verify PDF format is supported (PyMuPDF handles standard PDFs)

**Frontend:**
- Next.js dev mode includes hot module replacement (HMR) for instant feedback
- Use browser DevTools to inspect component tree and network requests
- Check `frontend/.next/` for build artifacts (will be regenerated on dev restart)
- Development builds are slower than production builds (this is normal)
- Common issues:
  - API proxy not working: Verify backend is running and `BACKEND_URL` env var is correct
  - Styling not applied: Run `pnpm run lint` to check Tailwind configuration
  - Type errors: Run TypeScript compiler to check types across entire project

### Environment Variables
- `BACKEND_URL` (frontend) - Backend API base URL for rewrites, defaults to `http://localhost:8000`
- `CORS_ORIGINS` (backend) - Comma-separated origins allowed for CORS

### Data Directory Structure

**Automatic directories** (created on first request):
- `data/uploads/{date}/` - Uploaded PDF files (temporary, cleaned up after processing)
- `data/outputs/{date}/` - Generated transaction CSVs from PDF extraction
- `data/cas/` - CAS JSON files (named `FY{year}.json`, e.g., `FY2024-25.json`) - parsed from Excel uploads
- `data/payslips/` - Contains `payslips_data.json` with extracted salary data (PDFs not retained)
- `data/fifo_cache/` - Contains:
  - `capital_gains.json` - Cached FIFO calculations (auto-invalidates on transaction/override changes)
  - `cache_metadata.json` - Cache validity tracking
- `data/fund_type_overrides.json` - Manual fund type classifications (created on first override)

### Reference Data
- `isin_ticker_db.json` and `isin_ticker_links_db.json` in `backend/app/services/pdf_extractor/` are used in step 4 (processFundDeets.py) to standardize and validate fund identifiers (CSV versions also exist for backward compatibility)

### Tax Rules Configuration

Capital gains tax rules are maintained in `backend/app/tax_rules.py` for easy modification when tax laws change.

**Equity Mutual Funds:**
- Holding period > 1 year (365 days) = Long-term Capital Gains (LTCG)
- Holding period ≤ 1 year = Short-term Capital Gains (STCG)

**Debt Mutual Funds:**
- For investments made **on or after April 1, 2023**: ALL gains are STCG (regardless of holding period)
- For investments made **before April 1, 2023**:
  - Holding period > 24 months (730 days) = LTCG
  - Holding period ≤ 24 months = STCG

**Testing:**
- Run `python3 backend/test_tax_rules.py` to verify tax rules implementation
- FIFO cache is automatically invalidated when rules change

## Common Development Tasks

### Modifying Tax Rules

Tax rules are isolated in `backend/app/tax_rules.py` for easy updates when Indian tax laws change:
- `get_equity_fund_term(holding_days)` - Returns "Long-term" or "Short-term" for equity funds
- `get_debt_fund_term(buy_date, sell_date)` - Returns holding classification for debt funds
- After modifying rules, run `python3 backend/test_tax_rules.py` to validate
- FIFO cache automatically invalidates when rules change, recalculating on next request

### Adding New PDF Extraction Steps

The PDF extraction pipeline (in `backend/app/services/pdf_extractor/`) has 5 modular steps:
1. Modify individual step files (e.g., `processFundDeets.py` to add fund classification logic)
2. Update `__init__.py` to call the modified step in `extract_transactions()`
3. Test with a sample PDF via the upload endpoint
4. CSV output validates all changes worked correctly

### Updating Frontend Components

- Variant UI components live in `frontend/app/itr-prep/variants/` - modify to change ITR display
- Shared components in `frontend/components/` - modify for reusable UI changes
- All API calls proxied through Next.js (configured in `next.config.js`) - ensure BACKEND_URL env var is set
- Use TypeScript path aliases (`@/`) for clean imports

### Handling Large File Uploads

- Backend uses `python-multipart` for file streaming
- Frontend has file validation before upload (see `PayslipUploadDialog.tsx`)
- Large PDFs (>10MB) may take time to process - no timeout configured yet
