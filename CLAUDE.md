# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip3 install -r requirements.txt
uvicorn app.main:app --reload  # Runs on http://localhost:8000
```

### Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm run dev    # Runs on http://localhost:3000
pnpm run build  # Production build
pnpm run lint   # ESLint
```

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
- Switcher shows in dev mode only (toggleable via gear icon)

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
- Dev mode: Toggle via `DevModeProvider` context, persisted in localStorage

### Environment Variables
- `BACKEND_URL` (frontend) - Backend API base URL for rewrites, defaults to `http://localhost:8000`
- `CORS_ORIGINS` (backend) - Comma-separated origins allowed for CORS

### Data Directory Structure
- `data/uploads/{date}/` - Uploaded PDF files (temporary, cleaned up after processing)
- `data/outputs/{date}/` - Generated transaction CSVs
- `data/cas/` - CAS JSON files (named `FY{year}.json`, e.g., `FY2024-25.json`) - parsed from Excel uploads
- `data/payslips/payslips_data.json` - All payslip records with extracted salary data (PDFs not retained)
- `data/fifo_cache.json` - Cached FIFO capital gains calculations
- `data/fund_type_overrides.json` - Manual fund type classifications

### Reference Data
- `isin_ticker_db.csv` and `isin_ticker_links_db.csv` in backend are used in step 4 (processFundDeets.py) to standardize and validate fund identifiers
