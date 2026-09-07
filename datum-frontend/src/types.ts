export interface DocumentItem {
  id: string;
  filename: string;
  pageCount: number;
  uploadDate: string;
  description: string;
  standardVersion: string;
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
}

export type AnswerSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string }
  | { type: 'citation'; citationId: number };
