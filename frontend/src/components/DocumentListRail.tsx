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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const StatusBadge: React.FC<{ status: DocumentItem['status'] }> = ({ status }) => {
  const config = {
    ready: { label: 'READY', class: 'bg-success/10 text-success border-success/20' },
    processing: { label: 'PARSING', class: 'bg-accent-soft text-accent border-accent-border animate-pulse' },
    embedding: { label: 'INDEXING', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' },
    failed: { label: 'FAILED', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const c = config[status] || config.failed;
  return (
    <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border ${c.class}`}>
      {c.label}
    </span>
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
      className="w-[280px] flex-shrink-0 bg-surface-1 border-r border-border-theme flex flex-col h-full select-none"
    >
      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="p-4 border-b border-border-theme">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-10 px-4 rounded-xl font-medium text-sm flex items-center justify-between gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group gradient-bg text-white hover:opacity-90 glow-sm"
        >
          <div className="flex items-center gap-2">
            <UploadIcon />
            <span>{isUploading ? 'Processing...' : 'Upload PDF'}</span>
          </div>
          <span className="font-mono text-[10px] opacity-70">PDF</span>
        </button>

        <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted px-1">
          <span>ARXML indexing</span>
          <span className="italic opacity-60">coming soon</span>
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <div className="text-xs text-red-400 leading-snug flex-1">
            <span className="font-semibold">Upload failed:</span> {uploadError}
          </div>
          <button
            onClick={onClearUploadError}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 mt-0.5"
          >
            <XIcon />
          </button>
        </div>
      )}

      {/* Section label */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Source Specifications</span>
        <span className="font-mono text-xs text-text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border-theme">
          {documents.length}
        </span>
      </div>

      {/* Document list */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">

        {/* In-progress upload row */}
        {isUploading && uploadingFilename && (
          <div className="p-3 rounded-xl border border-accent-border bg-accent-soft">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-sm font-medium text-text-primary leading-snug break-words flex-1">
                {uploadingFilename}
              </div>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-accent-border text-accent bg-surface-0 flex-shrink-0 animate-pulse">
                INGESTING
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-accent font-medium">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping flex-shrink-0" />
              <span>Parsing, chunking &amp; embedding...</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 rounded-full bg-surface-0 overflow-hidden">
              <div className="h-full rounded-full gradient-bg animate-shimmer" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {documents.length === 0 && !isUploading && (
          <div className="m-2 p-6 text-center rounded-xl border border-dashed border-border-strong bg-surface-2/30">
            <div className="w-12 h-12 rounded-2xl gradient-bg-subtle border border-accent-border flex items-center justify-center mx-auto mb-3">
              <UploadIcon />
            </div>
            <div className="text-sm font-semibold text-text-primary mb-1">No specifications indexed</div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Upload an AUTOSAR specification PDF to begin grounded technical retrieval.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg gradient-bg text-white hover:opacity-90 transition-all duration-200 glow-sm"
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
              className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                isSelected
                  ? 'bg-accent-soft border-accent-border glow-sm'
                  : 'border-transparent hover:bg-surface-2 hover:border-border-theme'
              } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 gradient-bg rounded-full" />
              )}

              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'gradient-bg text-white' : 'bg-surface-2 text-text-muted border border-border-theme'}`}>
                    <FileIcon />
                  </div>
                  <span className={`text-sm font-medium leading-snug break-all ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {doc.filename.replace(/\.pdf$/i, '')}
                  </span>
                </div>
                <button
                  onClick={(e) => onDeleteDocument(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                  aria-label={`Delete ${doc.filename}`}
                  title="Delete document"
                >
                  <TrashIcon />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1">
                <StatusBadge status={doc.status} />
                <span className="text-[11px] text-text-muted font-mono">{doc.pageCount} pp</span>
              </div>

              {doc.status === 'failed' && doc.errorMessage && (
                <p className="mt-1.5 text-[11px] text-red-400 leading-snug truncate">{doc.errorMessage}</p>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border-theme">
        <div className="text-[11px] text-text-muted flex items-center justify-between">
          <span className="gradient-text font-semibold text-xs">Datum</span>
          <span className="opacity-60">AUTOSAR Classic &amp; Adaptive</span>
        </div>
      </div>
    </aside>
  );
};
