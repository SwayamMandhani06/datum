import React, { useRef } from 'react';
import type { DocumentItem } from '../types';

interface DocumentListRailProps {
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  onSelectDocument: (docId: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteDocument: (docId: string, e: React.MouseEvent) => void;
  isUploading: boolean;
  uploadingFilename: string | null;
  uploadError: string | null;
  deletingDocId: string | null;
  onClearUploadError: () => void;
}

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const FileIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const StatusDot: React.FC<{ status: DocumentItem['status'] }> = ({ status }) => {
  const colors: Record<DocumentItem['status'], string> = {
    ready: 'bg-success',
    processing: 'bg-accent animate-pulse',
    embedding: 'bg-blue-400 animate-pulse',
    failed: 'bg-danger',
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`} title={status} />
  );
};

export const DocumentListRail: React.FC<DocumentListRailProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onUploadFile,
  onDeleteDocument,
  isUploading,
  uploadingFilename,
  uploadError,
  deletingDocId,
  onClearUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  return (
    <aside
      aria-label="Document Navigation"
      className="w-[260px] flex-shrink-0 bg-surface-1 border-r border-border-theme flex flex-col h-full select-none"
    >
      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={handleFileChange} />

      {/* Upload button */}
      <div className="p-3 border-b border-border-theme">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-9 px-3 flex items-center justify-between gap-2 text-xs font-medium rounded bg-accent text-white hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <UploadIcon />
            {isUploading ? 'Processing…' : 'Upload PDF'}
          </div>
          {!isUploading && <span className="font-mono opacity-60">PDF</span>}
        </button>

        <div className="mt-1.5 flex items-center justify-between px-0.5 text-xs text-text-subtle">
          <span>ARXML indexing</span>
          <span className="italic">coming soon</span>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mx-3 mt-2 p-2.5 rounded bg-danger-soft border border-danger/20 flex items-start gap-2 text-xs">
          <span className="text-danger leading-snug flex-1">
            <span className="font-semibold">Upload failed:</span> {uploadError}
          </span>
          <button onClick={onClearUploadError} className="text-danger/70 hover:text-danger transition-colors flex-shrink-0">
            <XIcon />
          </button>
        </div>
      )}

      {/* Section label */}
      <div className="px-3 pt-4 pb-1.5 flex items-center justify-between">
        <span className="section-label">Specifications</span>
        <span className="font-mono text-xs text-text-subtle">{documents.length}</span>
      </div>

      {/* Doc list */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3 space-y-px">

        {/* In-flight upload row */}
        {isUploading && uploadingFilename && (
          <div className="px-3 py-2.5 rounded border border-accent-border bg-accent-soft">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
              <span className="text-xs font-medium text-text-primary leading-snug truncate">{uploadingFilename}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Parsing, chunking, embedding…</span>
              <span className="font-mono text-accent">INGESTING</span>
            </div>
            {/* Simple progress bar */}
            <div className="mt-2 h-0.5 rounded-full bg-border-strong overflow-hidden">
              <div className="h-full bg-accent w-1/2 origin-left animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {documents.length === 0 && !isUploading && (
          <div className="mx-1 my-3 px-4 py-6 text-center rounded border border-dashed border-border-strong">
            <div className="text-text-subtle mb-3 flex justify-center">
              <UploadIcon />
            </div>
            <div className="text-xs font-medium text-text-secondary mb-1">No specifications indexed</div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Upload an AUTOSAR HLD PDF to begin grounded Q&A.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent-dim transition-colors duration-150"
            >
              <UploadIcon />
              Upload first PDF
            </button>
          </div>
        )}

        {/* Document items */}
        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocumentId;
          const isDeleting = deletingDocId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className={`group relative px-3 py-2.5 rounded cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? 'bg-surface-2 border border-border-strong'
                  : 'hover:bg-surface-hover border border-transparent'
              } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {/* Selected left bar */}
              {isSelected && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="mt-0.5 flex-shrink-0 text-text-muted">
                    <FileIcon />
                  </div>
                  <span className={`text-xs leading-snug break-all ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {doc.filename.replace(/\.pdf$/i, '')}
                  </span>
                </div>

                <button
                  onClick={(e) => onDeleteDocument(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-text-subtle hover:text-danger hover:bg-danger-soft transition-all duration-150 mt-0.5"
                  aria-label={`Delete ${doc.filename}`}
                >
                  <TrashIcon />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1.5 pl-[20px]">
                <StatusDot status={doc.status} />
                <span className="text-xs text-text-subtle font-mono capitalize">{doc.status}</span>
                <span className="text-xs text-text-subtle ml-auto font-mono">{doc.pageCount} pp</span>
              </div>

              {doc.status === 'failed' && doc.errorMessage && (
                <p className="mt-1 pl-[20px] text-xs text-danger leading-snug truncate">{doc.errorMessage}</p>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-border-theme">
        <div className="flex items-center gap-1.5 text-xs text-text-subtle">
          <div className="w-3.5 h-3.5 rounded-sm bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-[7px] font-bold text-white leading-none">D</span>
          </div>
          <span>AUTOSAR Classic &amp; Adaptive</span>
        </div>
      </div>
    </aside>
  );
};
