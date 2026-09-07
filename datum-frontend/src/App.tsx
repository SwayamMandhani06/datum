import { useState } from 'react';
import { Header } from './components/Header';
import { DocumentListRail } from './components/DocumentListRail';
import { ConversationView } from './components/ConversationView';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { mockDocuments, mockCitations, initialExchanges } from './data/mockData';
import type { QAExchange } from './types';

export function App() {
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

    // Add user question and realistic mock AUTOSAR answer grounded with citation 4
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
    setTimeout(() => {
      setUploadNotice(null);
    }, 4000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-ink-950 text-ink-text overflow-hidden font-sans">
      {/* Top Header Bar */}
      <Header activeDocument={activeDocument} />

      {/* Upload Banner / Toast if triggered */}
      {uploadNotice && (
        <div
          role="status"
          className="bg-ink-800 border-b border-signal-teal px-6 py-2 text-scale-13 text-ink-text flex items-center justify-between"
        >
          <span>{uploadNotice}</span>
          <button
            type="button"
            onClick={() => setUploadNotice(null)}
            className="text-graphite-400 hover:text-ink-text font-mono text-scale-13"
          >
            Dismiss
          </button>
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
}

export default App;
