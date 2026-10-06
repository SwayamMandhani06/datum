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

export type SeverityType = 'warning' | 'notice' | 'critical';

export interface InconsistencyIssue {
  severity: SeverityType;
  category: string;
  entity_name: string;
  description: string;
  recommendation?: string | null;
}

export interface ComparisonResult {
  doc_a_id: string;
  doc_a_name: string;
  doc_b_id: string;
  doc_b_name: string;
  total_entities_a: number;
  total_entities_b: number;
  shared_entities: ExtractedEntity[];
  unique_to_a: ExtractedEntity[];
  unique_to_b: ExtractedEntity[];
  inconsistencies: InconsistencyIssue[];
  compatibility_score: number;
  summary: string;
  generated_at: string;
}

export type FlowType = 'provided' | 'required' | 'bidirectional' | 'internal';

export interface DependencyNode {
  component: string;
  ports: string[];
  interfaces: string[];
  signals: string[];
  flow_type: FlowType;
  page_references: number[];
  section?: string | null;
}

export interface DependencyMapResult {
  document_id: string;
  filename: string;
  nodes: DependencyNode[];
  total_components: number;
  total_interfaces: number;
  total_connections: number;
  generated_at: string;
}

export interface CompletenessAuditResult {
  document_id: string;
  filename: string;
  health_score: number;
  total_components: number;
  total_ports: number;
  total_interfaces: number;
  total_signals: number;
  issues: InconsistencyIssue[];
  generated_at: string;
}

