from typing import Optional, Literal
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


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResultItem(BaseModel):
    chunk_id: str
    section_title: Optional[str] = None
    page_start: int
    page_end: int
    text: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResultItem]


class CitationItem(BaseModel):
    marker: int
    chunk_id: str
    section_title: Optional[str] = None
    page_start: int
    page_end: int
    excerpt: str

    model_config = ConfigDict(from_attributes=True)


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    citations: list[CitationItem]
    confidence: str
    low_confidence_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChatHistoryItem(BaseModel):
    id: str
    document_id: str
    question: str
    answer: str
    citations: list[CitationItem]
    confidence: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class ExtractedEntity(BaseModel):
    name: str
    entity_type: Literal["component", "port", "interface", "signal", "other"]
    description: str
    section_title: Optional[str] = None
    page_start: int
    page_end: int
    source_chunk_id: str

    model_config = ConfigDict(from_attributes=True)


class ExtractionResult(BaseModel):
    document_id: str
    entities: list[ExtractedEntity]
    generated_at: str

    model_config = ConfigDict(from_attributes=True)


