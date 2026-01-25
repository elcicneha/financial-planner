# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # Runs on http://localhost:8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev    # Runs on http://localhost:3000
npm run build  # Production build
npm run lint   # ESLint
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

### Data Flow
1. User uploads PDF via frontend
2. Backend saves PDF to `data/uploads/{date}/{file_id}_{filename}.pdf`
3. PDF extraction pipeline processes the file
4. Final CSV saved to `data/outputs/{date}/transactions_{file_id}.csv`
5. User downloads CSV via `/api/download/{file_id}`

### API Endpoints
- `POST /api/upload` - Upload PDF and process
- `GET /api/results/{file_id}` - Get processing results
- `GET /api/download/{file_id}` - Download CSV
- `GET /api/files` - List all processed CSV files
- `GET /api/health` - Health check

### Key Files
- Backend entry: `backend/app/main.py`
- API routes: `backend/app/api/routes.py`
- Pydantic schemas: `backend/app/models/schemas.py`
- PDF extraction entry: `backend/app/services/pdf_extractor/__init__.py` (calls `extract_transactions()`)
- Frontend home: `frontend/app/page.tsx`
- Upload component: `frontend/components/FileUpload.tsx`
- Transaction data hook: `frontend/hooks/useTransactionData.ts`
- API proxy config: `frontend/next.config.js` (rewrites `/api/*` to `BACKEND_URL`)

### Frontend Structure
- Pages: `/` (home), `/upload` (upload interface), `/playground` (dev mode)
- TypeScript with path aliases (`@/` imports configured in `tsconfig.json`)
- Styling: Tailwind CSS with custom theme in `tailwind.config.js`, supports dark mode

### Environment Variables
- `BACKEND_URL` (frontend) - Backend API base URL for rewrites, defaults to `http://localhost:8000`
- `CORS_ORIGINS` (backend) - Comma-separated origins allowed for CORS

### Reference Data
- `isin_ticker_db.csv` and `isin_ticker_links_db.csv` in backend are used in step 4 (processFundDeets.py) to standardize and validate fund identifiers
