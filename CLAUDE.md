# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
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
- `GET /api/health` - Health check

### Key Files
- Backend entry: `backend/app/main.py`
- API routes: `backend/app/api/routes.py`
- Pydantic schemas: `backend/app/models/schemas.py`
- Frontend page: `frontend/app/page.tsx`
- Upload component: `frontend/components/FileUpload.tsx`
