export type DocumentStatus = 'processing' | 'embedding' | 'ready' | 'failed';

export interface DocumentItem {
  id: string;
  filename: string;
  pageCount: number;
  uploadDate: string;
  status: DocumentStatus;
  chunkCount?: number;
  errorMessage?: string | null;
  description?: string;
  standardVersion?: string;
}

export interface Citation {
  id: number;
  documentId: string;
  documentName: string;
  section: string;
  page: string;
  excerpt: string;
  technicalEntity?: string;
  isLowConfidence?: boolean;
  confidenceNote?: string;
}

export interface QAExchange {
  id: string;
  question: string;
  answerSegments: AnswerSegment[];
  timestamp: string;
  isLowConfidence?: boolean;
  lowConfidenceReason?: string | null;
  error?: string | null;
  isPending?: boolean;
  citations?: Record<number, Citation>;
}

export type AnswerSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string }
  | { type: 'citation'; citationId: number };

export type EntityType = 'component' | 'port' | 'interface' | 'signal' | 'other';

export interface ExtractedEntity {
  name: string;
  entity_type: EntityType;
  description: string;
  section_title?: string | null;
  page_start: number;
  page_end: number;
  source_chunk_id: string;
}

export interface ExtractionResult {
  document_id: string;
  entities: ExtractedEntity[];
  generated_at: string;
}
