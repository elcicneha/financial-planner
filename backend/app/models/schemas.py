from pydantic import BaseModel


class UploadResponse(BaseModel):
    success: bool
    message: str
    file_id: str
    pdf_path: str
    csv_path: str


class ProcessingResult(BaseModel):
    file_id: str
    csv_path: str
    content: str
