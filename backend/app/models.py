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


class InconsistencyIssue(BaseModel):
    severity: Literal["warning", "notice", "critical"]
    category: str
    entity_name: str
    description: str
    recommendation: Optional[str] = None


class ComparisonResult(BaseModel):
    doc_a_id: str
    doc_a_name: str
    doc_b_id: str
    doc_b_name: str
    total_entities_a: int
    total_entities_b: int
    shared_entities: list[ExtractedEntity]
    unique_to_a: list[ExtractedEntity]
    unique_to_b: list[ExtractedEntity]
    inconsistencies: list[InconsistencyIssue]
    compatibility_score: float
    summary: str
    generated_at: str

    model_config = ConfigDict(from_attributes=True)


class DependencyNode(BaseModel):
    component: str
    ports: list[str]
    interfaces: list[str]
    signals: list[str]
    flow_type: Literal["provided", "required", "bidirectional", "internal"]
    page_references: list[int]
    section: Optional[str] = None


class DependencyMapResult(BaseModel):
    document_id: str
    filename: str
    nodes: list[DependencyNode]
    total_components: int
    total_interfaces: int
    total_connections: int
    generated_at: str


class CompletenessAuditResult(BaseModel):
    document_id: str
    filename: str
    health_score: int
    total_components: int
    total_ports: int
    total_interfaces: int
    total_signals: int
    issues: list[InconsistencyIssue]
    generated_at: str


