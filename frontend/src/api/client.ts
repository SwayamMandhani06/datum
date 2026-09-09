import type { DocumentItem, ExtractionResult } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}


export interface BackendDocument {
  id: string;
  filename: string;
  upload_date: string;
  page_count: number;
  status: 'processing' | 'embedding' | 'ready' | 'failed';
  chunk_count: number;
  error_message: string | null;
}

export interface BackendUploadResponse {
  id: string;
  filename: string;
  page_count: number;
  status: 'processing' | 'embedding' | 'ready' | 'failed';
  chunk_count: number;
  error_message: string | null;
}

export interface BackendCitation {
  marker: number;
  chunk_id: string;
  section_title: string | null;
  page_start: number;
  page_end: number;
  excerpt: string;
}

export interface BackendAskResponse {
  answer: string;
  citations: BackendCitation[];
  confidence: 'high' | 'low';
  low_confidence_reason: string | null;
}

export interface BackendChatHistoryItem {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  citations: BackendCitation[];
  confidence: 'high' | 'low';
  created_at: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    let detail: string | undefined;

    try {
      const body = await res.json();
      detail = body.detail || body.error_message || body.message;
      if (detail) {
        errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    } catch {
      const text = await res.text().catch(() => null);
      if (text) errorMessage = text;
    }

    throw new ApiError(errorMessage, res.status, detail);
  }
  return res.json();
}

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return {
      signal: (AbortSignal as any).timeout(timeoutMs),
      cleanup: () => {},
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export function mapBackendDocToItem(doc: BackendDocument | BackendUploadResponse): DocumentItem {
  // Format upload date nicely if ISO
  let rawDate = 'upload_date' in doc && doc.upload_date ? doc.upload_date : new Date().toISOString().split('T')[0];
  let formattedDate = rawDate;
  try {
    if (formattedDate.includes('T')) {
      formattedDate = formattedDate.split('T')[0];
    }
  } catch {
    // Keep as is
  }


  return {
    id: doc.id,
    filename: doc.filename,
    pageCount: doc.page_count,
    uploadDate: formattedDate,
    status: doc.status,
    chunkCount: doc.chunk_count,
    errorMessage: doc.error_message,
  };
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const { signal, cleanup } = createTimeoutSignal(30000);
  try {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    const data = await handleResponse<BackendDocument[]>(res);
    return data.map(mapBackendDocToItem);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError('Fetching document list timed out.', 408);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  // Synchronous upload pipeline with parsing + chunking + embeddings can take up to 90-120s
  const { signal, cleanup } = createTimeoutSignal(150000); // 150s generous timeout
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      signal,
    });
    const data = await handleResponse<BackendUploadResponse>(res);
    return mapBackendDocToItem(data);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError(
        'Document upload and embedding timed out after 120 seconds. Large documents may still be processing on the server.',
        408
      );
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function deleteDocument(id: string): Promise<{ message: string; id: string }> {
  const { signal, cleanup } = createTimeoutSignal(30000);
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal,
    });
    return await handleResponse<{ message: string; id: string }>(res);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError('Document deletion timed out.', 408);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function askQuestion(documentId: string, question: string): Promise<BackendAskResponse> {
  const { signal, cleanup } = createTimeoutSignal(90000); // 90s timeout for Groq synthesis
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ question: question.trim() }),
      signal,
    });
    return await handleResponse<BackendAskResponse>(res);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError('Answering timed out. The LLM synthesis service took too long to respond.', 408);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function getDocumentHistory(documentId: string): Promise<BackendChatHistoryItem[]> {
  const { signal, cleanup } = createTimeoutSignal(30000);
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/history`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    return await handleResponse<BackendChatHistoryItem[]>(res);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError('Fetching document conversation history timed out.', 408);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export async function extractDocument(
  documentId: string,
  forceRefresh: boolean = false
): Promise<ExtractionResult> {
  const { signal, cleanup } = createTimeoutSignal(120000); // 120s timeout for full-document extraction
  try {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/extract${
      forceRefresh ? '?force_refresh=true' : ''
    }`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    return await handleResponse<ExtractionResult>(res);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new ApiError('Document entity extraction timed out after 120 seconds.', 408);
    }
    throw err;
  } finally {
    cleanup();
  }
}

export function getExportUrl(documentId: string, format: 'csv' | 'json'): string {
  return `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/extract/export?format=${format}`;
}
