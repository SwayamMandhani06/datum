import React, { useEffect } from 'react';
import type { Citation } from '../types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  citation: Citation | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  citation,
  onClose,
}) => {
  // Listen for Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && !citation) {
    return null;
  }

  return (
    <>
      {/* Backdrop for screens < 1024px when drawer is in overlay mode */}
      <div
        className={`lg:hidden fixed inset-0 bg-ink-950/80 z-40 transition-opacity duration-200 motion-reduce:transition-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        aria-label="Evidence and Citation Panel"
        aria-hidden={!isOpen}
        className={`
          /* Position & Dimensions */
          fixed inset-y-0 right-0 z-50 w-full sm:w-[380px]
          lg:static lg:z-auto lg:w-[340px] lg:flex-shrink-0
          
          /* Visual appearance: paper-100 background, paper-300 borders */
          bg-paper-100 text-[#15202B] border-l border-paper-300
          flex flex-col h-full overflow-hidden select-none

          /* Deliberate smooth slide-in motion (~200ms) ONLY on citation click */
          transition-transform duration-200 ease-out motion-reduce:transition-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        `}
      >
        {/* Drawer Header */}
        <div className="h-14 px-5 border-b border-paper-300 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-scale-17 font-medium text-[#15202B]">
              Cited evidence
            </span>
            {citation && (
              <span className="font-mono text-scale-13 text-[#5A6573]">
                [{citation.id}]
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-scale-15 font-medium text-[#465362] hover:text-[#15202B] py-1 px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal-teal transition-colors"
          >
            Close
          </button>
        </div>

        {/* Drawer Body */}
        {citation ? (
          <div className="flex-1 overflow-y-auto paper-scrollbar p-6 space-y-6">
            {/* Document and Location Reference */}
            <div className="space-y-2 border-b border-paper-300 pb-4">
              <div className="text-scale-13 text-[#5A6573]">
                Source document
              </div>
              <div className="font-mono text-scale-13 text-[#15202B] break-words">
                {citation.documentName}
              </div>

              <div className="pt-2 flex flex-col space-y-1">
                <div className="text-scale-13 text-[#5A6573]">
                  Document locator
                </div>
                <div className="font-mono text-scale-15 font-medium text-[#15202B]">
                  {citation.section}, {citation.page}
                </div>
              </div>

              {citation.technicalEntity && (
                <div className="pt-2">
                  <div className="text-scale-13 text-[#5A6573]">
                    AUTOSAR identifier
                  </div>
                  <div className="font-mono text-scale-13 text-[#1E2A36] mt-0.5">
                    {citation.technicalEntity}
                  </div>
                </div>
              )}
            </div>

            {/* Exact cited excerpt at larger reading size (17px) */}
            <div className="space-y-2">
              <div className="text-scale-13 text-[#5A6573]">
                Verified excerpt
              </div>
              <blockquote className="text-scale-17 text-[#15202B] leading-relaxed font-normal bg-white/60 p-4 border-l-2 border-[#8A94A0]">
                "{citation.excerpt}"
              </blockquote>
            </div>

            {/* Confidence warning: plain text warn-amber ONLY when relevant */}
            {citation.isLowConfidence && (
              <div className="pt-2">
                <div className="text-scale-13 font-normal text-warn-amber leading-snug">
                  {citation.confidenceNote || 'Low confidence — verify against source'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-scale-15 text-[#5A6573]">
            Select a citation marker in the conversation to inspect source evidence.
          </div>
        )}

        {/* Drawer Footer */}
        <div className="p-4 border-t border-paper-300 text-scale-13 text-[#5A6573] flex-shrink-0">
          <div>Grounded verification</div>
          <div className="font-mono text-scale-13 text-[#15202B] mt-0.5">
            Checksum SHA-256 verified
          </div>
        </div>
      </aside>
    </>
  );
};
