import { useState } from 'react';
import { Header } from '../components/Header';
import { DocumentListRail } from '../components/DocumentListRail';
import { ConversationView } from '../components/ConversationView';
import { EvidenceDrawer } from '../components/EvidenceDrawer';
import { mockDocuments, mockCitations, initialExchanges } from '../data/mockData';
import type { QAExchange } from '../types';

export const WorkspacePage: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>('DOC-AUTOSAR-4.4.0');
  const [exchanges, setExchanges] = useState<QAExchange[]>(initialExchanges);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const activeDocument =
    mockDocuments.find((d) => d.id === selectedDocId) || mockDocuments[0];

  const activeCitation = activeCitationId ? mockCitations[activeCitationId] ?? null : null;

  const handleCitationClick = (citationId: number) => {
    setActiveCitationId(citationId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveCitationId(null);
  };

  const handleAskQuestion = (questionText: string) => {
    const newId = `qa-${Date.now()}`;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newExchange: QAExchange = {
      id: newId,
      question: questionText,
      timestamp: timeString,
      answerSegments: [
        {
          type: 'text',
          content: 'According to the Software Component Template specifications for this component, the execution budget for ',
        },
        {
          type: 'code',
          content: 'RE_SampleEngineSpeed',
        },
        {
          type: 'text',
          content: ' is allocated at 350 microseconds within the target microcontroller timing envelope ',
        },
        {
          type: 'citation',
          citationId: 4,
        },
        {
          type: 'text',
          content: '. Any task invocation exceeding this duration will trigger an OsIsr latency threshold violation in the BSW OS scheduler.',
        },
      ],
    };

    setExchanges((prev) => [...prev, newExchange]);
  };

  const handleUploadClick = () => {
    setUploadNotice('Document upload: Drop AUTOSAR XML (ARXML) or HLD PDF here to index.');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-0 text-text-primary overflow-hidden font-sans relative">
      {/* Top Header Bar with restrained glass */}
      <Header activeDocument={activeDocument} />

      {/* Upload Dialog / Modal with restrained glassmorphic overlay */}
      {uploadNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="glass-chrome border border-glass-border p-6 max-w-md w-full shadow-2xl text-text-primary">
            <div className="flex items-center justify-between pb-3 border-b border-border-theme">
              <span className="text-scale-17 font-medium">Specification Ingestion</span>
              <button
                type="button"
                onClick={() => setUploadNotice(null)}
                className="text-scale-13 text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>
            <p className="mt-4 text-scale-15 text-text-muted leading-relaxed">
              {uploadNotice}
            </p>
            <div className="mt-4 p-4 border border-dashed border-border-theme bg-surface-2/60 text-center text-scale-13 text-text-muted">
              Select or drag .pdf or .arxml file
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setUploadNotice(null)}
                className="h-9 px-4 text-scale-13 bg-accent text-surface-0 font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Three-Pane Workspace Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Pane 1: Left Rail (Document List) */}
        <DocumentListRail
          documents={mockDocuments}
          selectedDocumentId={selectedDocId}
          onSelectDocument={(id) => setSelectedDocId(id)}
          onUploadClick={handleUploadClick}
        />

        {/* Pane 2: Center Pane (Conversation View) */}
        <ConversationView
          document={activeDocument}
          exchanges={exchanges}
          activeCitationId={activeCitationId}
          onCitationClick={handleCitationClick}
          onAskQuestion={handleAskQuestion}
        />

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
