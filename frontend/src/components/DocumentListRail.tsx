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
      className="w-[268px] flex-shrink-0 bg-surface-1 border-r border-border-theme flex flex-col h-full select-none"
    >
      {/* Top action: Upload document */}
      <div className="p-4 border-b border-border-theme">
        <button
          type="button"
          onClick={onUploadClick}
          className="w-full h-9 px-3 text-scale-15 font-medium text-text-primary bg-surface-2 border border-border-theme hover:border-accent focus-visible:border-accent transition-colors text-left flex items-center justify-between"
        >
          <span>Upload document</span>
          <span className="font-mono text-scale-13 text-text-muted">PDF / ARXML</span>
        </button>
      </div>

      {/* Rail Section Title */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-scale-13 font-normal text-text-muted">
          Source specifications
        </span>
      </div>

      {/* Document List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocumentId;
          const fileType = doc.filename.toLowerCase().endsWith('.arxml') ? 'ARXML' : 'PDF';

          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDocument(doc.id)}
              className={`w-full text-left p-3 transition-colors ${
                isSelected
                  ? 'border-l-2 border-accent bg-surface-2'
                  : 'border-l-2 border-transparent hover:bg-surface-2/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-scale-15 font-medium text-text-primary leading-snug break-words flex-1">
                  {doc.filename}
                </div>
                {/* File-type tag with distinct surface-0 background and clear visual contrast */}
                <span className="font-mono text-[11px] font-semibold leading-none px-2 py-1 border border-border-theme bg-surface-0 text-text-primary flex-shrink-0 mt-0.5 tracking-wider">
                  {fileType}
                </span>
              </div>

              <div className="mt-3 flex flex-col space-y-1.5">
                <div className="flex items-center justify-between text-scale-13">
                  <span className="text-text-muted">Length</span>
                  <span className="font-mono text-text-primary">{doc.pageCount} pages</span>
                </div>

                <div className="flex items-center justify-between text-scale-13">
                  <span className="text-text-muted">Uploaded</span>
                  <span className="font-mono text-text-muted">{doc.uploadDate}</span>
                </div>

                <div className="flex items-center justify-between text-scale-13 pt-1 border-t border-border-theme">
                  <span className="text-text-muted">Identifier</span>
                  <span className="font-mono text-scale-13 text-text-muted">{doc.id}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Rail footer info */}
      <div className="p-4 border-t border-border-theme text-scale-13 text-text-muted bg-surface-1">
        <div>AUTOSAR Classic Platform</div>
        <div className="font-mono text-text-primary mt-0.5">Release 4.4.0</div>
      </div>
    </aside>
  );
};
