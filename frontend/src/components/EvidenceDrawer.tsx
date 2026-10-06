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
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-250 ${
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
          fixed inset-y-0 right-0 z-50 w-full sm:w-[350px]
          lg:static lg:z-auto lg:w-[320px] lg:flex-shrink-0
          bg-evidence-bg/95 backdrop-blur-xl border-l border-evidence-border
          flex flex-col h-full overflow-hidden shadow-2xl
          transition-transform duration-250 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}
      >
        {/* Header */}
        <div className="h-13 px-5 border-b border-evidence-border flex items-center justify-between flex-shrink-0 bg-surface-1/40">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[9px] font-bold text-white leading-none">D</span>
            </div>
            <span className="text-sm font-bold text-evidence-text tracking-tight">
              {citation ? `Evidence Citation [${citation.id}]` : 'Source Evidence'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 btn-icon !rounded-lg text-evidence-muted hover:text-evidence-text"
            title="Close Drawer"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        {citation ? (
          <div className="flex-1 overflow-y-auto evidence-scrollbar p-5 space-y-5 fade-in-up">

            {/* Document + location */}
            <div className="space-y-3">
              <div>
                <div className="section-label text-evidence-muted mb-1.5">Document Origin</div>
                <code
                  className="font-mono text-xs text-evidence-text break-words [word-break:break-word] leading-relaxed glass-badge px-2.5 py-1 block"
                  title={citation.documentName}
                >
                  {citation.documentName}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-evidence-border">
                <div className="glass-card p-3 min-w-0">
                  <div className="section-label text-evidence-muted mb-1">Section</div>
                  <div className="font-mono text-xs font-bold text-evidence-text truncate" title={citation.section}>
                    {citation.section}
                  </div>
                </div>
                <div className="glass-card p-3 min-w-0">
                  <div className="section-label text-evidence-muted mb-1">Page Evidence</div>
                  <div className="font-mono text-xs font-bold text-accent truncate" title={citation.page}>
                    {citation.page}
                  </div>
                </div>
              </div>
            </div>

            {/* AUTOSAR identifier */}
            {citation.technicalEntity && (
              <div className="pt-3 border-t border-evidence-border">
                <div className="section-label text-evidence-muted mb-1.5">AUTOSAR Identifier</div>
                <code
                  className="font-mono text-xs text-accent glass-badge px-2.5 py-1 block font-bold break-words [word-break:break-word]"
                  title={citation.technicalEntity}
                >
                  {citation.technicalEntity}
                </code>
              </div>
            )}

            {/* Excerpt */}
            <div className="pt-3 border-t border-evidence-border">
              <div className="section-label text-evidence-muted mb-2">Verbatim Source Excerpt</div>
              <blockquote className="text-xs text-evidence-text leading-relaxed p-3.5 rounded-xl border-l-4 border-accent bg-surface-0/40 glass-card">
                "{citation.excerpt}"
              </blockquote>
            </div>

            {/* Low confidence */}
            {citation.isLowConfidence && (
              <div className="p-3.5 rounded-xl border border-warn/30 bg-warn-soft fade-in-up">
                <div className="text-xs font-bold text-warn mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                  <span>Low Confidence Verification Note</span>
                </div>
                <p className="text-xs text-warn/90 leading-snug">
                  {citation.confidenceNote || 'Passages retrieved with low similarity score. Verify directly against primary PDF source.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-evidence-muted mb-3">
              <span className="text-lg font-mono">[ ]</span>
            </div>
            <p className="text-sm font-bold text-evidence-text mb-1 tracking-tight">No Citation Selected</p>
            <p className="text-xs text-evidence-muted leading-relaxed max-w-xs">
              Click any <code className="citation-badge">[1]</code> marker in the conversation thread to inspect verbatim evidence.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-evidence-border bg-surface-1/40">
          <div className="text-[11px] text-evidence-muted font-mono flex items-center justify-between">
            <span>SHA-256 Verified</span>
            <span className="text-emerald-400 font-bold">Immutable Spec</span>
          </div>
        </div>
      </aside>
    </>
  );
};
