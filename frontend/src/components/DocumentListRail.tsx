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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:-translate-y-0.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    ready: 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    processing: 'bg-accent animate-pulse shadow-[0_0_6px_rgba(217,119,6,0.6)]',
    embedding: 'bg-blue-400 animate-pulse shadow-[0_0_6px_rgba(96,165,250,0.6)]',
    failed: 'bg-danger shadow-[0_0_6px_rgba(248,113,113,0.5)]',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} title={status} />
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
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-200 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        aria-label="Document Navigation"
        className={`
          fixed inset-y-0 left-0 z-40 w-[270px]
          md:static md:z-20 md:w-[270px] md:flex-shrink-0
          bg-surface-1/95 backdrop-blur-md border-r border-border-theme flex flex-col h-full select-none
          transition-transform duration-200 ease-out
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={handleFileChange} />

        {/* Upload button & mobile close */}
        <div className="p-3.5 border-b border-border-theme">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-primary btn-shimmer flex-1 h-10 px-3.5 flex items-center justify-between gap-2 text-xs font-semibold !rounded-xl group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UploadIcon />
                <span className="truncate">{isUploading ? 'Ingesting PDF…' : 'Upload Specification'}</span>
              </div>
              {!isUploading && (
                <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-bold flex-shrink-0">PDF</span>
              )}
            </button>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden w-10 h-10 btn-icon !rounded-xl text-text-muted hover:text-text-primary"
                title="Close Document Rail"
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-text-subtle font-mono">
            <span>ARXML Parser</span>
            <span className="text-accent/80">Active Engine</span>
          </div>
        </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mx-3 mt-2.5 p-3 rounded-xl bg-danger-soft border border-danger/25 flex items-start gap-2 text-xs fade-in-up">
          <span className="text-danger leading-snug flex-1 font-medium">
            <span className="font-bold">Upload failed:</span> {uploadError}
          </span>
          <button onClick={onClearUploadError} className="text-danger/70 hover:text-danger transition-colors flex-shrink-0">
            <XIcon />
          </button>
        </div>
      )}

      {/* Section label */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="section-label">AUTOSAR Specifications</span>
        <span className="font-mono text-xs text-text-muted glass-badge px-2 py-0.5">{documents.length}</span>
      </div>

      {/* Doc list */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 pb-3 space-y-1.5">

        {/* In-flight upload row */}
        {isUploading && uploadingFilename && (
          <div className="glass-card p-3 border-accent-border bg-accent-soft/30 fade-in-up">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
              <span className="text-xs font-bold text-text-primary leading-snug truncate">{uploadingFilename}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
              <span>Section parsing &amp; vectors…</span>
              <span className="font-bold text-accent">INGESTING</span>
            </div>
            {/* Simple progress bar */}
            <div className="mt-2.5 h-1 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full bg-accent w-2/3 origin-left animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {documents.length === 0 && !isUploading && (
          <div className="mx-1 my-4 p-5 text-center rounded-2xl border border-dashed border-border-strong glass-card">
            <div className="text-text-subtle mb-3 flex justify-center">
              <UploadIcon />
            </div>
            <div className="text-xs font-bold text-text-secondary mb-1 tracking-tight">No specifications indexed</div>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Upload an AUTOSAR HLD PDF to begin grounded Q&amp;A.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Upload PDF
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
              onClick={() => {
                onSelectDocument(doc.id);
                onCloseMobile?.();
              }}
              className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'glass-card-interactive !border-accent-border !bg-surface-2 shadow-card'
                  : 'hover:bg-surface-hover/80 border border-transparent'
              } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {/* Selected left accent indicator */}
              {isSelected && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-accent shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`mt-0.5 flex-shrink-0 transition-colors duration-150 ${isSelected ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'}`}>
                    <FileIcon />
                  </div>
                  <span
                    className={`text-xs leading-snug break-words [word-break:break-word] font-medium tracking-tight ${isSelected ? 'text-text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}
                    title={doc.filename}
                  >
                    {doc.filename.replace(/\.pdf$/i, '')}
                  </span>
                </div>

                <button
                  onClick={(e) => onDeleteDocument(doc.id, e)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-lg text-text-subtle hover:text-danger hover:bg-danger-soft transition-all duration-150 mt-0.5"
                  aria-label={`Delete ${doc.filename}`}
                  title="Delete specification"
                >
                  <TrashIcon />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 pl-[22px]">
                <StatusDot status={doc.status} />
                <span className="text-[11px] text-text-subtle font-mono capitalize">{doc.status}</span>
                <span className="text-[11px] text-text-subtle ml-auto font-mono glass-badge px-1.5 py-0.5">
                  {doc.pageCount} pp
                </span>
              </div>

              {doc.status === 'failed' && doc.errorMessage && (
                <p className="mt-1 pl-[22px] text-xs text-danger leading-snug truncate font-mono" title={doc.errorMessage}>{doc.errorMessage}</p>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-theme bg-surface-1/50 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-text-subtle">
          <div className="w-4 h-4 rounded-md bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[8px] font-bold text-white leading-none">D</span>
          </div>
          <span className="font-mono text-[11px]">AUTOSAR CP &amp; AP Standards</span>
        </div>
      </div>
    </aside>
  </>
  );
};
