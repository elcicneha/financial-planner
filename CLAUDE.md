# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Terminal 1: Backend (FastAPI)
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip3 install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000

# Terminal 2: Frontend (Next.js)
cd frontend
pnpm install
pnpm run dev  # http://localhost:3000
```

**Development URLs:**
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

---

## Architecture Overview

**Comprehensive personal financial planner** for Indian investors, designed to simplify tax preparation and investment tracking.

**Core capabilities:**
- **Investment Aggregator** - Extract mutual fund transactions from broker PDF statements
- **Capital Gains Calculator** - FIFO-based gains computation with Indian tax rules (equity/debt classification)
- **CAS Parser** - Import data from CAMS/KFINTECH Consolidated Account Statements
- **Salary Tracker** - Extract and organize payslip data for Form 16 preparation
- **Financial Calculators** - Tools like career break planning (more to come)

**Tech stack:**
- **Frontend**: Next.js + Tailwind CSS + Shadcn/ui
- **Backend**: FastAPI with feature-based architecture
- **Communication**: Next.js proxies `/api/*` to FastAPI

---

## Backend Structure

```
backend/app/
├── main.py              # FastAPI entry point
├── config.py            # Paths and configuration
├── dependencies.py      # Dependency injection
├── core/
│   ├── utils.py         # Shared utilities
│   └── tax_rules.py     # Capital gains tax rules
├── shared/
│   ├── persistence.py   # Repository interfaces
│   └── calculator_registry.py
└── features/
    ├── health/          # Health check
    ├── investment_aggregator/  # PDF processing
    ├── itr_prep/        # ITR preparation
    │   ├── capital_gains/  # FIFO calculator
    │   ├── cas/         # CAS Excel parser
    │   └── payslips/    # Payslip extraction
    └── playground/      # Dev calculators
```

### PDF Extraction Pipeline

Located in `backend/app/features/investment_aggregator/extractor/`:

1. **pdfToTxt.py** - PDF to text (PyMuPDF)
2. **extractTextToCSV.py** - Text to fund details + dates CSVs
3. **processDatesData.py** - Process dates
4. **processFundDeets.py** - Clean fund details (uses `isin_ticker_db.json`)
5. **finalCombine.py** - Combine into final JSON

Entry point: `extract_transactions()` in `__init__.py`

### API Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| **PDF Processing** | `POST /api/upload` | Upload and process PDF |
| | `GET /api/results/{file_id}` | Get extraction results |
| | `GET /api/download/{file_id}` | Download processed JSON |
| | `GET /api/files` | List all processed files |
| **Capital Gains (FIFO)** | `GET /api/capital-gains` | Get FIFO calculations |
| | `PUT /api/fund-type-override` | Override fund type |
| **CAS Parser** | `POST /api/upload-cas` | Upload CAS Excel file |
| | `GET /api/cas-files` | List CAS files |
| | `GET /api/capital-gains-cas?fy={FY}` | Get CAS capital gains |
| **Payslips** | `POST /api/upload-payslips` | Upload payslip PDFs |
| | `GET /api/payslips` | List all payslips |
| | `DELETE /api/payslips/{id}` | Delete specific payslip |
| | `DELETE /api/payslips` | Delete all payslips |
| **Playground** | `GET /api/playground/calculators` | List calculators |
| | `POST /api/playground/calculate` | Execute calculator |
| **System** | `GET /api/health` | Health check |

---

## Frontend Structure

```
frontend/
├── app/
│   ├── page.tsx         # Home
│   ├── upload/          # PDF upload interface
│   ├── itr-prep/        # ITR preparation
│   │   └── variants/    # CAS, FIFO, OtherInfo components
│   └── playground/      # Dev calculators
├── components/          # Shared components
└── hooks/               # Custom hooks
```

**Key patterns:**
- TypeScript with `@/` path aliases
- Tailwind CSS with dark mode support
- ITR variants: standalone components switched via `DevModeProvider`
- API proxy: `next.config.js` rewrites `/api/*` to backend

---

## Data & Configuration

### Data Directories (auto-created)

| Directory | Contents |
|-----------|----------|
| `data/uploads/{date}/` | Uploaded PDFs (temporary) |
| `data/outputs/{date}/` | Processed transaction JSONs |
| `data/cas/` | CAS data (`FY{year}.json`) |
| `data/payslips/` | Extracted payslip data |
| `data/fifo_cache/` | FIFO calculation cache |
| `data/fund_type_overrides.json` | Manual fund classifications |

### Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `BACKEND_URL` | Frontend | Backend URL (default: `http://localhost:8000`) |
| `CORS_ORIGINS` | Backend | Allowed CORS origins |

### Tax Rules

Located in `backend/app/core/tax_rules.py`:

**Equity Funds:**
- \> 365 days = Long-term (LTCG)
- ≤ 365 days = Short-term (STCG)

**Debt Funds:**
- Bought **on/after Apr 1, 2023**: Always STCG
- Bought **before Apr 1, 2023**: > 730 days = LTCG, else STCG

**Validate changes:** `python3 backend/test_tax_rules.py`

---

## Development Guide

### Debugging

**Backend:**
- Swagger UI: http://localhost:8000/docs
- Config: `backend/app/config.py`
- Common issues: port conflicts, CORS errors

**Frontend:**
- Browser DevTools for network/component inspection
- Check `BACKEND_URL` if API proxy fails

### Common Tasks

**Modify tax rules:**
1. Edit `backend/app/core/tax_rules.py`
2. Run `python3 backend/test_tax_rules.py`
3. FIFO cache auto-invalidates on next request

**Add PDF extraction step:**
1. Create/modify file in `features/investment_aggregator/extractor/`
2. Update `__init__.py` to include in pipeline
3. Test via upload endpoint

**Add playground calculator:**
1. Create file in `features/playground/calculators/`
2. Use `@register_calculator` decorator
3. Import in `calculators/__init__.py`
4. Auto-discoverable via `/api/playground/calculators`

**Update frontend components:**
- ITR variants: `frontend/app/itr-prep/variants/`
- Shared components: `frontend/components/`
- Use `@/` imports for clean paths

### Testing

```bash
# Tax rules validation
cd backend && python3 test_tax_rules.py

# Frontend linting
cd frontend && pnpm run lint
```
