import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { DocumentListRail } from '../components/DocumentListRail';
import { ConversationView } from '../components/ConversationView';
import { StructureView } from '../components/StructureView';
import { EvidenceDrawer } from '../components/EvidenceDrawer';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  askQuestion,
  getDocumentHistory,
  type BackendChatHistoryItem,
  type BackendCitation,
} from '../api/client';
import type { DocumentItem, Citation, QAExchange, AnswerSegment } from '../types';

function parseAnswerSegments(text: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  const pattern = /(\[\d+\]|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    const token = match[0];
    if (token.startsWith('[') && token.endsWith(']')) {
      const markerNum = parseInt(token.slice(1, -1), 10);
      segments.push({
        type: 'citation',
        citationId: markerNum,
      });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({
        type: 'code',
        content: token.slice(1, -1),
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return segments;
}

function buildCitationsMap(
  citations: BackendCitation[],
  docId: string,
  docName: string,
  isLowConf: boolean,
  confReason?: string | null
): Record<number, Citation> {
  const map: Record<number, Citation> = {};
  for (const c of citations) {
    map[c.marker] = {
      id: c.marker,
      documentId: docId,
      documentName: docName,
      section: c.section_title || 'General Section',
      page: c.page_start === c.page_end ? `Page ${c.page_start}` : `Pages ${c.page_start}–${c.page_end}`,
      excerpt: c.excerpt,
      isLowConfidence: isLowConf,
      confidenceNote: confReason || undefined,
    };
  }
  return map;
}

export const WorkspacePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [exchangesByDoc, setExchangesByDoc] = useState<Record<string, QAExchange[]>>({});
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'conversation' | 'structure'>('conversation');

  // Loading & error states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Active document resolution
  const activeDocument = selectedDocId
    ? documents.find((d) => d.id === selectedDocId) || null
    : documents[0] || null;

  // Active exchanges for active document
  const activeExchanges = activeDocument ? exchangesByDoc[activeDocument.id] || [] : [];

  // 1. Fetch document list
  const fetchDocs = useCallback(async (autoSelectId?: string) => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);

      if (autoSelectId) {
        setSelectedDocId(autoSelectId);
      } else if (docs.length > 0) {
        setSelectedDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      } else {
        setSelectedDocId(null);
      }
    } catch (err: any) {
      console.error('Failed to list documents:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // 2. Load conversation history when active document changes
  useEffect(() => {
    if (!activeDocument) return;

    // Only load if not already loaded in memory
    if (exchangesByDoc[activeDocument.id] === undefined) {
      getDocumentHistory(activeDocument.id)
        .then((history: BackendChatHistoryItem[]) => {
          const loadedExchanges: QAExchange[] = history.map((item) => {
            let timeStr = 'Past';
            try {
              const d = new Date(item.created_at);
              timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            } catch {
              // Ignore format error
            }

            const isLowConf = item.confidence === 'low';
            const citationsMap = buildCitationsMap(
              item.citations,
              activeDocument.id,
              activeDocument.filename,
              isLowConf,
              null
            );

            return {
              id: item.id,
              question: item.question,
              timestamp: timeStr,
              answerSegments: parseAnswerSegments(item.answer),
              isLowConfidence: isLowConf,
              citations: citationsMap,
            };
          });

          setExchangesByDoc((prev) => ({
            ...prev,
            [activeDocument.id]: loadedExchanges,
          }));
        })
        .catch(() => {
          // If history fails, initialize empty
          setExchangesByDoc((prev) => ({
            ...prev,
            [activeDocument.id]: [],
          }));
        });
    }
  }, [activeDocument, exchangesByDoc]);

  // 3. Document selection
  const handleSelectDocument = (id: string) => {
    setSelectedDocId(id);
    setIsDrawerOpen(false);
    setActiveCitation(null);
    setActiveCitationId(null);
  };

  // 4. Document upload
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadingFilename(file.name);
    setUploadError(null);

    try {
      const newDoc = await uploadDocument(file);
      await fetchDocs(newDoc.id);
      // Initialize empty exchange list for the new document
      setExchangesByDoc((prev) => ({
        ...prev,
        [newDoc.id]: [],
      }));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload and process document.');
    } finally {
      setIsUploading(false);
      setUploadingFilename(null);
    }
  };

  // 5. Document deletion
  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingDocId) return;

    setDeletingDocId(id);
    try {
      await deleteDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);

      // Clean up local exchanges
      setExchangesByDoc((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (selectedDocId === id) {
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setSelectedDocId(nextId);
        setIsDrawerOpen(false);
        setActiveCitation(null);
        setActiveCitationId(null);
      }
    } catch (err: any) {
      alert(`Could not delete document: ${err.message}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  // 6. Asking a question
  const handleAskQuestion = async (questionText: string) => {
    if (!activeDocument || activeDocument.status !== 'ready' || isAsking) return;

    const exchangeId = `qa-${Date.now()}`;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    setIsAsking(true);

    try {
      const response = await askQuestion(activeDocument.id, questionText);
      const isLowConf = response.confidence === 'low';

      const citationsMap = buildCitationsMap(
        response.citations,
        activeDocument.id,
        activeDocument.filename,
        isLowConf,
        response.low_confidence_reason
      );

      const newExchange: QAExchange = {
        id: exchangeId,
        question: questionText,
        timestamp: timeString,
        answerSegments: parseAnswerSegments(response.answer),
        isLowConfidence: isLowConf,
        lowConfidenceReason: response.low_confidence_reason,
        citations: citationsMap,
      };

      setExchangesByDoc((prev) => ({
        ...prev,
        [activeDocument.id]: [...(prev[activeDocument.id] || []), newExchange],
      }));
    } catch (err: any) {
      const errorExchange: QAExchange = {
        id: exchangeId,
        question: questionText,
        timestamp: timeString,
        answerSegments: [],
        error: err.message || 'An unexpected error occurred while communicating with the QA service.',
      };

      setExchangesByDoc((prev) => ({
        ...prev,
        [activeDocument.id]: [...(prev[activeDocument.id] || []), errorExchange],
      }));
    } finally {
      setIsAsking(false);
    }
  };

  // 7. Citation click
  const handleCitationClick = (citationId: number, exchangeId: string) => {
    const currentList = activeExchanges;
    const targetExchange = currentList.find((ex) => ex.id === exchangeId);
    const citation = targetExchange?.citations?.[citationId] || null;

    setActiveCitationId(citationId);
    setActiveCitation(citation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveCitationId(null);
    setActiveCitation(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-0 text-text-primary overflow-hidden font-sans relative">
      {/* Top Header Bar */}
      <Header activeDocument={activeDocument} />

      {/* Three-Pane Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Pane 1: Left Rail (Document List) */}
        <DocumentListRail
          documents={documents}
          selectedDocumentId={selectedDocId}
          onSelectDocument={handleSelectDocument}
          onUploadFile={handleUploadFile}
          onDeleteDocument={handleDeleteDocument}
          isUploading={isUploading}
          uploadingFilename={uploadingFilename}
          uploadError={uploadError}
          deletingDocId={deletingDocId}
          onClearUploadError={() => setUploadError(null)}
        />

        {/* Pane 2: Center Pane (Conversation View or Structure View) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Tab Switcher Bar */}
          <div className="h-10 border-b border-border-theme px-4 flex items-center gap-0 bg-surface-1 flex-shrink-0 select-none z-10">
            <button
              type="button"
              onClick={() => setActiveTab('conversation')}
              className={`h-10 px-4 text-sm transition-colors duration-150 border-b-2 -mb-px ${
                activeTab === 'conversation'
                  ? 'border-accent text-text-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              Conversation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('structure')}
              className={`h-10 px-4 text-sm transition-colors duration-150 border-b-2 -mb-px ${
                activeTab === 'structure'
                  ? 'border-accent text-text-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              Structure
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'conversation' ? (
            <ConversationView
              document={activeDocument}
              exchanges={activeExchanges}
              activeCitationId={activeCitationId}
              onCitationClick={handleCitationClick}
              onAskQuestion={handleAskQuestion}
              isAsking={isAsking}
            />
          ) : (
            <StructureView document={activeDocument} />
          )}
        </div>

        {/* Pane 3: Right Drawer (Evidence Panel) */}
        <EvidenceDrawer
          isOpen={isDrawerOpen}
          citation={activeCitation}
          onClose={handleCloseDrawer}
        />
      </div>
    </div>
  );
};
