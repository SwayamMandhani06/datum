from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: str
    filename: str
    upload_date: str
    page_count: int
    status: str
    chunk_count: int = 0
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    page_count: int
    status: str
    chunk_count: int
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    section_title: Optional[str] = None
    page_start: int
    page_end: int
    word_count: int
    text: str

    model_config = ConfigDict(from_attributes=True)
