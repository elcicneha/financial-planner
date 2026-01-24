import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.models.schemas import ProcessingResult, UploadResponse
from app.services.pdf_extractor import extract_transactions

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
OUTPUTS_DIR = DATA_DIR / "outputs"


def ensure_directories():
    """Create data directories if they don't exist."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and process it to extract mutual fund transactions."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    ensure_directories()

    # Generate unique ID for this upload
    file_id = str(uuid.uuid4())[:8]
    date_folder = datetime.now().strftime("%Y-%m-%d")

    # Create date-based subdirectories
    upload_folder = UPLOADS_DIR / date_folder
    output_folder = OUTPUTS_DIR / date_folder
    upload_folder.mkdir(parents=True, exist_ok=True)
    output_folder.mkdir(parents=True, exist_ok=True)

    # Save uploaded PDF
    pdf_filename = f"{file_id}_{file.filename}"
    pdf_path = upload_folder / pdf_filename

    contents = await file.read()
    with open(pdf_path, "wb") as f:
        f.write(contents)

    # Process PDF and extract transactions
    try:
        csv_path = extract_transactions(pdf_path, output_folder, file_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    return UploadResponse(
        success=True,
        message="File uploaded successfully",
        file_id=file_id,
        pdf_path=str(pdf_path.relative_to(BASE_DIR)),
        csv_path=str(csv_path.relative_to(BASE_DIR)),
    )


@router.get("/results/{file_id}", response_model=ProcessingResult)
async def get_results(file_id: str):
    """Retrieve processing results for a given file ID."""
    # Search for the CSV file across date folders
    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir():
            for csv_file in date_folder.glob(f"transactions_{file_id}.csv"):
                # Read CSV content
                with open(csv_file, "r") as f:
                    content = f.read()

                return ProcessingResult(
                    file_id=file_id,
                    csv_path=str(csv_file.relative_to(BASE_DIR)),
                    content=content,
                )

    raise HTTPException(status_code=404, detail=f"Results not found for file_id: {file_id}")


@router.get("/download/{file_id}")
async def download_csv(file_id: str):
    """Download the processed CSV file."""
    for date_folder in OUTPUTS_DIR.iterdir():
        if date_folder.is_dir():
            for csv_file in date_folder.glob(f"transactions_{file_id}.csv"):
                return FileResponse(
                    path=csv_file,
                    filename=f"transactions_{file_id}.csv",
                    media_type="text/csv",
                )

    raise HTTPException(status_code=404, detail=f"CSV not found for file_id: {file_id}")


@router.get("/files")
async def list_files():
    """List all processed CSV files."""
    files = []

    if OUTPUTS_DIR.exists():
        for date_folder in sorted(OUTPUTS_DIR.iterdir(), reverse=True):
            if date_folder.is_dir():
                for csv_file in date_folder.glob("transactions_*.csv"):
                    file_id = csv_file.stem.replace("transactions_", "")
                    files.append({
                        "file_id": file_id,
                        "date": date_folder.name,
                        "csv_path": str(csv_file.relative_to(BASE_DIR)),
                    })

    return {"files": files}
