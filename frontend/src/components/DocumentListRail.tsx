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
    if (file) {
      onUploadFile(file);
    }
    // Reset so the same file can be picked again if desired
    e.target.value = '';
  };

  return (
    <aside
      aria-label="Document Navigation"
      className="w-[280px] flex-shrink-0 bg-surface-1 border-r border-border-theme flex flex-col h-full select-none"
    >
      {/* Hidden file picker strictly restricted to .pdf */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top action: Upload document */}
      <div className="p-4 border-b border-border-theme">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-9 px-3 text-scale-15 font-medium text-text-primary bg-surface-2 border border-border-theme hover:border-accent focus-visible:border-accent transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isUploading ? 'Uploading...' : 'Upload document'}</span>
          <span className="font-mono text-[11px] text-text-muted">PDF</span>
        </button>

        {/* Small coming soon note for ARXML */}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted px-0.5">
          <span>ARXML indexing</span>
          <span className="italic font-mono">coming soon</span>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mx-3 mt-3 p-2.5 bg-surface-2 border border-flag-amber/50 text-scale-13 flex items-start justify-between gap-2">
          <div className="text-flag-amber leading-snug flex-1">
            <span className="font-medium">Upload error:</span> {uploadError}
          </div>
          <button
            type="button"
            onClick={onClearUploadError}
            className="text-text-muted hover:text-text-primary font-mono text-scale-13 px-1"
            aria-label="Dismiss upload error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Rail Section Title */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-scale-13 font-normal text-text-muted">
          Source specifications
        </span>
        <span className="font-mono text-scale-13 text-text-muted">
          {documents.length}
        </span>
      </div>

      {/* Document List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1.5">
        {/* Visible In-Progress Upload Row */}
        {isUploading && uploadingFilename && (
          <div className="w-full text-left p-3 border-l-2 border-accent bg-surface-2/80 animate-pulse motion-reduce:animate-none">
            <div className="flex items-start justify-between gap-2">
              <div className="text-scale-15 font-medium text-text-primary leading-snug break-words flex-1">
                {uploadingFilename}
              </div>
              <span className="font-mono text-[11px] font-semibold leading-none px-2 py-1 border border-accent text-accent bg-surface-0 flex-shrink-0 mt-0.5 tracking-wider">
                INGESTING
              </span>
            </div>
            <div className="mt-3 flex flex-col space-y-1 text-scale-13">
              <div className="flex items-center space-x-2 text-accent font-mono text-scale-13">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping motion-reduce:animate-none flex-shrink-0" />
                <span>Processing & embedding...</span>
              </div>
              <span className="text-[11px] text-text-muted">
                Section-aware chunking & vector store indexing
              </span>
            </div>
          </div>
        )}

        {/* Empty State: No documents uploaded yet */}
        {documents.length === 0 && !isUploading ? (
          <div className="p-4 text-center border border-dashed border-border-theme bg-surface-2/40 my-2 mx-1">
            <div className="text-scale-15 text-text-primary font-medium">
              No specifications indexed
            </div>
            <p className="mt-1.5 text-scale-13 text-text-muted leading-relaxed">
              Upload an AUTOSAR specification PDF to begin grounded technical retrieval.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center justify-center px-3 py-1.5 text-scale-13 bg-accent text-surface-0 font-medium hover:opacity-90 transition-opacity select-none"
            >
              Upload first PDF
            </button>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = doc.id === selectedDocumentId;
            const isProcessing = doc.status === 'processing' || doc.status === 'embedding';
            const isFailed = doc.status === 'failed';
            const isDeleting = deletingDocId === doc.id;

            let statusBadge = null;
            if (isProcessing) {
              statusBadge = (
                <span className="font-mono text-[11px] px-1.5 py-0.5 border border-border-theme text-text-muted bg-surface-0 animate-pulse motion-reduce:animate-none">
                  {doc.status === 'embedding' ? 'Embedding...' : 'Processing...'}
                </span>
              );
            } else if (isFailed) {
              statusBadge = (
                <span
                  title={doc.errorMessage || 'Ingestion failed'}
                  className="font-mono text-[11px] px-1.5 py-0.5 border border-flag-amber/60 text-flag-amber bg-surface-0"
                >
                  Failed
                </span>
              );
            }

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDocument(doc.id);
                  }
                }}
                className={`w-full text-left p-3 transition-colors cursor-pointer select-none group ${
                  isSelected
                    ? 'border-l-2 border-accent bg-surface-2'
                    : 'border-l-2 border-transparent hover:bg-surface-2/60'
                } ${isProcessing ? 'opacity-80' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-scale-15 font-medium text-text-primary leading-snug break-words flex-1">
                    {doc.filename}
                  </div>
                  <span className="font-mono text-[11px] font-semibold leading-none px-2 py-1 border border-border-theme bg-surface-0 text-text-primary flex-shrink-0 mt-0.5 tracking-wider">
                    PDF
                  </span>
                </div>

                <div className="mt-3 flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-scale-13">
                    <span className="text-text-muted">Length</span>
                    <span className="font-mono text-text-primary">
                      {doc.pageCount > 0 ? `${doc.pageCount} pages` : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-scale-13">
                    <span className="text-text-muted">Status</span>
                    {statusBadge || (
                      <span className="font-mono text-text-primary text-scale-13">
                        Ready
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-scale-13">
                    <span className="text-text-muted">Uploaded</span>
                    <span className="font-mono text-text-muted">{doc.uploadDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-scale-13 pt-2 border-t border-border-theme">
                    <span className="font-mono text-[11px] text-text-muted truncate max-w-[140px]" title={doc.id}>
                      {doc.id.slice(0, 8)}...
                    </span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="text-scale-13 text-text-muted hover:text-flag-amber transition-colors focus-visible:outline-accent py-0.5 px-1"
                      aria-label={`Remove document ${doc.filename}`}
                    >
                      {isDeleting ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </nav>

      {/* Rail footer info */}
      <div className="p-4 border-t border-border-theme text-scale-13 text-text-muted bg-surface-1">
        <div>AUTOSAR Classic & Adaptive</div>
        <div className="font-mono text-text-primary mt-0.5">High-Level Design Ingestion</div>
      </div>
    </aside>
  );
};
