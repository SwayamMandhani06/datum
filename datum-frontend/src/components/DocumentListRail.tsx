import React from 'react';
import type { DocumentItem } from '../types';

interface DocumentListRailProps {
  documents: DocumentItem[];
  selectedDocumentId: string;
  onSelectDocument: (docId: string) => void;
  onUploadClick: () => void;
}

export const DocumentListRail: React.FC<DocumentListRailProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onUploadClick,
}) => {
  return (
    <aside
      aria-label="Document Navigation"
      className="w-[260px] flex-shrink-0 bg-ink-800 border-r border-ink-600 flex flex-col h-full select-none"
    >
      {/* Top action: Upload document */}
      <div className="p-4 border-b border-ink-600">
        <button
          type="button"
          onClick={onUploadClick}
          className="w-full h-9 px-3 text-scale-15 font-medium text-ink-text bg-ink-950 border border-ink-600 hover:border-signal-teal focus-visible:border-signal-teal transition-colors text-left flex items-center justify-between"
        >
          <span>Upload document</span>
          <span className="font-mono text-scale-13 text-graphite-400">PDF / ARXML</span>
        </button>
      </div>

      {/* Rail Section Title */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-scale-13 font-normal text-graphite-400">
          Source documents
        </span>
      </div>

      {/* Document List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocumentId;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDocument(doc.id)}
              className={`w-full text-left p-3 transition-colors ${
                isSelected
                  ? 'border-l-2 border-signal-teal bg-ink-950/60'
                  : 'border-l-2 border-transparent hover:bg-ink-950/30'
              }`}
            >
              <div className="text-scale-15 font-medium text-ink-text leading-snug break-words">
                {doc.filename}
              </div>

              <div className="mt-2 flex flex-col space-y-1">
                <div className="flex items-center justify-between text-scale-13">
                  <span className="text-graphite-400">Length</span>
                  <span className="font-mono text-ink-text">{doc.pageCount} pages</span>
                </div>

                <div className="flex items-center justify-between text-scale-13">
                  <span className="text-graphite-400">Uploaded</span>
                  <span className="font-mono text-graphite-400">{doc.uploadDate}</span>
                </div>

                <div className="flex items-center justify-between text-scale-13 pt-1 border-t border-ink-600/40">
                  <span className="text-graphite-400">Identifier</span>
                  <span className="font-mono text-scale-13 text-graphite-400">{doc.id}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Rail footer info */}
      <div className="p-4 border-t border-ink-600 text-scale-13 text-graphite-400">
        <div>Specification standard</div>
        <div className="font-mono text-ink-text mt-0.5">AUTOSAR Classic 4.4.0</div>
      </div>
    </aside>
  );
};
