import React, { useEffect } from 'react';
import type { Citation } from '../types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  citation: Citation | null;
  onClose: () => void;
}

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ isOpen, citation, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen && !citation) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        aria-label="Source Evidence"
        aria-hidden={!isOpen}
        className={`
          fixed inset-y-0 right-0 z-50 w-full sm:w-[340px]
          lg:static lg:z-auto lg:w-[300px] lg:flex-shrink-0
          bg-evidence-bg border-l border-evidence-border
          flex flex-col h-full overflow-hidden
          transition-transform duration-250 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-evidence-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-[7px] font-bold text-white leading-none">D</span>
            </div>
            <span className="text-sm font-semibold text-evidence-text">
              {citation ? `Citation [${citation.id}]` : 'Source evidence'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-evidence-muted hover:text-evidence-text hover:bg-surface-3/20 transition-colors duration-150"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        {citation ? (
          <div className="flex-1 overflow-y-auto evidence-scrollbar p-4 space-y-5">

            {/* Document + location */}
            <div className="space-y-3">
              <div>
                <div className="section-label text-evidence-muted mb-1">Document</div>
                <code className="font-mono text-xs text-evidence-text break-all leading-relaxed">{citation.documentName}</code>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-evidence-border">
                <div>
                  <div className="section-label text-evidence-muted mb-0.5">Section</div>
                  <div className="font-mono text-xs font-medium text-evidence-text">{citation.section}</div>
                </div>
                <div>
                  <div className="section-label text-evidence-muted mb-0.5">Page</div>
                  <div className="font-mono text-xs font-medium text-evidence-text">{citation.page}</div>
                </div>
              </div>
            </div>

            {/* AUTOSAR identifier */}
            {citation.technicalEntity && (
              <div className="pt-3 border-t border-evidence-border">
                <div className="section-label text-evidence-muted mb-1">AUTOSAR identifier</div>
                <code className="font-mono text-xs text-accent">{citation.technicalEntity}</code>
              </div>
            )}

            {/* Excerpt */}
            <div className="pt-3 border-t border-evidence-border">
              <div className="section-label text-evidence-muted mb-2">Verified excerpt</div>
              <blockquote className="text-sm text-evidence-text leading-relaxed bg-surface-0/20 p-3 rounded-sm border-l-2 border-accent/50">
                "{citation.excerpt}"
              </blockquote>
            </div>

            {/* Low confidence */}
            {citation.isLowConfidence && (
              <div className="pt-3 border-t border-evidence-border">
                <div className="text-xs font-semibold text-flag-amber mb-0.5">Low confidence</div>
                <p className="text-xs text-flag-amber/80 leading-snug">
                  {citation.confidenceNote || 'Verify this excerpt against the source document.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-2xl text-evidence-muted mb-3">[ ]</div>
            <p className="text-sm font-medium text-evidence-text mb-1">No citation selected</p>
            <p className="text-xs text-evidence-muted leading-relaxed">
              Click any <code className="font-mono text-accent bg-accent-soft px-1 rounded-sm">[1]</code> marker in the conversation to inspect the source.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-evidence-border">
          <div className="text-xs text-evidence-muted font-mono">SHA-256 verified · immutable source</div>
        </div>
      </aside>
    </>
  );
};
