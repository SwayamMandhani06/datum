import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { DocumentListRail } from '../components/DocumentListRail';
import { ConversationView } from '../components/ConversationView';
import { StructureView } from '../components/StructureView';
import { DependencyMapView } from '../components/DependencyMapView';
import { DocumentComparisonView } from '../components/DocumentComparisonView';
import { CompletenessAuditView } from '../components/CompletenessAuditView';
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

type WorkspaceTab = 'conversation' | 'structure' | 'dependencies' | 'comparison' | 'audit';

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('conversation');
  const [isMobileRailOpen, setIsMobileRailOpen] = useState<boolean>(false);

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

    if (exchangesByDoc[activeDocument.id] === undefined) {
      getDocumentHistory(activeDocument.id)
        .then((history: BackendChatHistoryItem[]) => {
          const loadedExchanges: QAExchange[] = history.map((item) => {
            let timeStr = 'Past';
            try {
              const d = new Date(item.created_at);
              timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            } catch {
              // Ignore
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
        .catch((err) => {
          console.error('Failed to load conversation history:', err);
        });
    }
  }, [activeDocument, exchangesByDoc]);

  // 3. Document selection
  const handleSelectDocument = (docId: string) => {
    setSelectedDocId(docId);
    handleCloseDrawer();
  };

  // 4. File upload
  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadingFilename(file.name);
    setUploadError(null);

    try {
      const uploadedDoc = await uploadDocument(file);
      await fetchDocs(uploadedDoc.id);
    } catch (err: any) {
      setUploadError(err.message || 'Upload and indexing failed.');
    } finally {
      setIsUploading(false);
      setUploadingFilename(null);
    }
  };

  // 5. File delete
  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this specification and its vector embeddings?')) {
      return;
    }

    setDeletingDocId(docId);
    try {
      await deleteDocument(docId);
      setExchangesByDoc((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      await fetchDocs();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  // 6. Ask question
  const handleAskQuestion = async (questionText: string) => {
    if (!activeDocument) return;

    const exchangeId = `ex-${Date.now()}`;
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
    <div className="h-screen w-full flex flex-col bg-surface-0 text-text-primary overflow-hidden font-sans relative">
      {/* Top Header Bar */}
      <Header
        activeDocument={activeDocument}
        onToggleSidebar={() => setIsMobileRailOpen((prev) => !prev)}
        isSidebarOpen={isMobileRailOpen}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Pane 1: Document Rail */}
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
          isMobileOpen={isMobileRailOpen}
          onCloseMobile={() => setIsMobileRailOpen(false)}
        />

        {/* Pane 2: Primary Center Workspace with Multi-View Tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Engineering Navigation Tabs */}
          <div className="h-12 border-b border-border-theme px-4 flex items-center gap-1.5 bg-surface-1/90 backdrop-blur-md flex-shrink-0 select-none z-10 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('conversation')}
              className={`tab-pill ${activeTab === 'conversation' ? 'active' : ''}`}
            >
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">1</span>
              <span>Grounded Q&amp;A</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('structure')}
              className={`tab-pill ${activeTab === 'structure' ? 'active' : ''}`}
            >
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Architecture Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dependencies')}
              className={`tab-pill ${activeTab === 'dependencies' ? 'active' : ''}`}
            >
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">3</span>
              <span>Traceability &amp; Dependencies</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`tab-pill ${activeTab === 'comparison' ? 'active' : ''}`}
            >
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">4</span>
              <span>Cross-Spec Comparison</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`tab-pill ${activeTab === 'audit' ? 'active' : ''}`}
            >
              <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] flex items-center justify-center font-bold">5</span>
              <span>Completeness Audit</span>
            </button>
          </div>

          {/* Active View Content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {activeTab === 'conversation' && (
              <ConversationView
                document={activeDocument}
                exchanges={activeExchanges}
                activeCitationId={activeCitationId}
                onCitationClick={handleCitationClick}
                onAskQuestion={handleAskQuestion}
                isAsking={isAsking}
              />
            )}

            {activeTab === 'structure' && (
              <StructureView document={activeDocument} />
            )}

            {activeTab === 'dependencies' && (
              <DependencyMapView document={activeDocument} />
            )}

            {activeTab === 'comparison' && (
              <DocumentComparisonView
                documents={documents}
                activeDocument={activeDocument}
              />
            )}

            {activeTab === 'audit' && (
              <CompletenessAuditView document={activeDocument} />
            )}
          </div>
        </div>

        {/* Pane 3: Evidence Panel (Active during Conversation citation click) */}
        {activeTab === 'conversation' && (
          <EvidenceDrawer
            isOpen={isDrawerOpen}
            citation={activeCitation}
            onClose={handleCloseDrawer}
          />
        )}
      </div>
    </div>
  );
};
