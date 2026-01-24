# Financial Planner

A web application for uploading mutual fund PDF statements and extracting transaction data.

## Project Structure

```
financial-planner/
├── frontend/           # Next.js application
├── backend/            # FastAPI application
│   └── app/services/pdf_extractor/  # Your PDF extraction code goes here
└── data/
    ├── uploads/        # Uploaded PDF files
    └── outputs/        # Generated CSV files
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

## API Endpoints

- `POST /api/upload` - Upload PDF and process
- `GET /api/results/{file_id}` - Get processing results
- `GET /api/download/{file_id}` - Download CSV
- `GET /api/health` - Health check

## Adding Your PDF Extraction Code

Place your Python files in `backend/app/services/pdf_extractor/` and update the import in `backend/app/api/routes.py`

