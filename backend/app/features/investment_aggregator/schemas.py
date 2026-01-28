from pydantic import BaseModel
from typing import Optional, List


class UploadResponse(BaseModel):
    success: bool
    file_id: str
    message: str
    output_path: str


class ProcessingResult(BaseModel):
    file_id: str
    output_path: str
    transactions: List[dict]


class FileInfo(BaseModel):
    file_id: str
    date: str
    path: str


class AvailableFinancialYear(BaseModel):
    year: str
