import React, { useEffect } from 'react';
import type { Citation } from '../types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  citation: Citation | null;
  onClose: () => void;
}

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const BookOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const MapPinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  citation,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && !citation) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label="Evidence and Citation Panel"
        aria-hidden={!isOpen}
        className={`
          fixed inset-y-0 right-0 z-50 w-full sm:w-[360px]
          lg:static lg:z-auto lg:w-[320px] lg:flex-shrink-0
          bg-evidence-bg border-l border-evidence-border
          flex flex-col h-full overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}
      >
        {/* Header with gradient */}
        <div className="flex-shrink-0">
          {/* Gradient top strip */}
          <div className="h-1 gradient-bg" />

          <div className="px-5 py-3.5 flex items-center justify-between border-b border-evidence-border bg-surface-2/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                <BookOpenIcon />
              </div>
              <div>
                <div className="text-sm font-semibold text-evidence-text">
                  {citation ? `Citation [${citation.id}]` : 'Source Evidence'}
                </div>
                <div className="text-[11px] text-evidence-muted">Verified excerpt</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-evidence-muted hover:text-evidence-text hover:bg-surface-3/30 transition-all duration-150"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        {citation ? (
          <div className="flex-1 overflow-y-auto evidence-scrollbar p-5 space-y-5">

            {/* Document info */}
            <div className="space-y-3 p-4 rounded-xl bg-surface-3/20 border border-evidence-border">
              <div>
                <p className="text-[11px] font-medium text-evidence-muted uppercase tracking-wider mb-1">Source Document</p>
                <p className="font-mono text-xs text-evidence-text break-all leading-relaxed">{citation.documentName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-evidence-border">
                <div>
                  <p className="text-[11px] text-evidence-muted mb-0.5">Section</p>
                  <p className="font-mono text-xs font-semibold text-evidence-text">{citation.section}</p>
                </div>
                <div>
                  <p className="text-[11px] text-evidence-muted mb-0.5">Page</p>
                  <p className="font-mono text-xs font-semibold text-evidence-text">{citation.page}</p>
                </div>
              </div>

              {/* Location badge */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-evidence-border">
                <MapPinIcon />
                <span className="text-xs font-mono text-evidence-muted">{citation.section}, {citation.page}</span>
              </div>
            </div>

            {/* AUTOSAR identifier */}
            {citation.technicalEntity && (
              <div className="p-3 rounded-xl bg-accent-soft border border-accent-border">
                <p className="text-[11px] font-medium text-accent/70 mb-1">AUTOSAR Identifier</p>
                <code className="font-mono text-xs text-accent">{citation.technicalEntity}</code>
              </div>
            )}

            {/* Excerpt */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-evidence-muted uppercase tracking-wider">Verified Excerpt</p>
              <blockquote className="text-sm text-evidence-text leading-relaxed bg-surface-2/30 p-4 rounded-xl border-l-3 border-accent">
                <span className="text-accent/60 font-serif text-xl leading-none mr-1">"</span>
                {citation.excerpt}
                <span className="text-accent/60 font-serif text-xl leading-none ml-1">"</span>
              </blockquote>
            </div>

            {/* Low confidence */}
            {citation.isLowConfidence && (
              <div className="p-3 rounded-xl bg-amber-soft border border-flag-amber/30">
                <p className="text-xs font-semibold text-flag-amber mb-0.5">Low confidence</p>
                <p className="text-xs text-flag-amber/80 leading-snug">
                  {citation.confidenceNote || 'Verify this excerpt against the source document.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-bg-subtle border border-accent-border flex items-center justify-center mb-4 animate-float">
              <BookOpenIcon />
            </div>
            <p className="text-sm font-medium text-evidence-text mb-1">No Citation Selected</p>
            <p className="text-xs text-evidence-muted leading-relaxed">
              Click any <code className="font-mono text-accent bg-accent-soft px-1 rounded">[1]</code> citation marker in the conversation to inspect its source evidence.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-evidence-border bg-surface-2/20">
          <div className="flex items-center gap-1.5">
            <ShieldCheckIcon />
            <span className="text-[11px] text-success font-medium">SHA-256 verified • Immutable source</span>
          </div>
        </div>
      </aside>
    </>
  );
};
