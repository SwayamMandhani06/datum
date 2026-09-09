import React, { useState, useRef, useEffect } from 'react';
import type { QAExchange, DocumentItem } from '../types';

interface ConversationViewProps {
  document: DocumentItem | null;
  exchanges: QAExchange[];
  activeCitationId: number | null;
  onCitationClick: (citationId: number, exchangeId: string) => void;
  onAskQuestion: (question: string) => void;
  isAsking: boolean;
}

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const SUGGESTED = [
  'What components are defined in this specification?',
  'What ports does the main component expose?',
  'What interfaces are referenced?',
  'Summarize the key constraints defined here.',
];

export const ConversationView: React.FC<ConversationViewProps> = ({
  document,
  exchanges,
  activeCitationId,
  onCitationClick,
  onAskQuestion,
  isAsking,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [flashingCitationId, setFlashingCitationId] = useState<number | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const isDocReady = document?.status === 'ready';
  const isInputDisabled = !isDocReady || isAsking;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isInputDisabled) return;
    onAskQuestion(trimmed);
    setInputValue('');
  };

  const handleCitationClick = (citationId: number, exchangeId: string) => {
    setFlashingCitationId(citationId);
    onCitationClick(citationId, exchangeId);
    setTimeout(() => setFlashingCitationId(null), 600);
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, isAsking]);

  return (
    <main className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full">
      {/* Context bar */}
      <div className="h-10 px-5 border-b border-border-theme bg-surface-1 flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-text-muted">Grounded in:</span>
          {document ? (
            <code className="font-mono text-text-primary bg-surface-2 border border-border-theme px-2 py-0.5 rounded-sm truncate max-w-xs">
              {document.filename}
            </code>
          ) : (
            <span className="text-text-subtle">No document selected</span>
          )}
        </div>
        <span className="text-text-subtle hidden sm:block font-mono">Citation mode: exact-page</span>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-8">

        {/* No document */}
        {!document && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="text-3xl mb-4 text-text-subtle">—</div>
            <h3 className="text-base font-semibold text-text-primary mb-2">No specification selected</h3>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              Select a document from the left rail, or upload an AUTOSAR specification PDF to begin.
            </p>
          </div>
        )}

        {/* Empty */}
        {document && exchanges.length === 0 && !isAsking && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="text-xs text-text-muted mb-1 font-mono uppercase tracking-wider">Ready</div>
              <h3 className="text-base font-semibold text-text-primary">
                {document.filename}
              </h3>
              {document.pageCount > 0 && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {document.pageCount} pages indexed
                </div>
              )}
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Ask any technical question. Every answer will carry inline citation markers that link to the exact page and verbatim excerpt.
            </p>

            {/* Suggested questions */}
            <div className="border-t border-border-theme pt-5">
              <div className="section-label mb-3">Try asking</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => onAskQuestion(q)}
                    disabled={isInputDisabled}
                    className="text-xs text-left px-3 py-2.5 rounded border border-border-theme bg-surface-1 hover:bg-surface-2 hover:border-border-strong text-text-muted hover:text-text-primary transition-colors duration-150 disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exchanges */}
        {exchanges.map((exchange) => (
          <article key={exchange.id} className="max-w-2xl mx-auto space-y-4">

            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-sm">
                <div className="bg-accent text-white text-sm px-4 py-2.5 rounded-sm leading-relaxed">
                  {exchange.question}
                </div>
                <div className="text-right text-xs text-text-subtle mt-1 font-mono">{exchange.timestamp}</div>
              </div>
            </div>

            {/* AI response */}
            {exchange.error ? (
              <div className="border-l-2 border-danger/50 pl-4 py-1">
                <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1.5">Error</div>
                <p className="text-sm text-text-secondary leading-relaxed">{exchange.error}</p>
              </div>
            ) : (
              <div>
                <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Datum</div>
                <div className="border-l-2 border-border-strong pl-4">
                  <div className="text-sm text-text-primary leading-relaxed">
                    {exchange.answerSegments.map((seg, i) => {
                      if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
                      if (seg.type === 'code') return (
                        <code key={i} className="font-mono text-xs bg-surface-2 border border-border-theme px-1 py-0.5 rounded-sm mx-0.5">
                          {seg.content}
                        </code>
                      );
                      if (seg.type === 'citation') {
                        const isActive = activeCitationId === seg.citationId;
                        const isFlashing = flashingCitationId === seg.citationId;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleCitationClick(seg.citationId, exchange.id)}
                            className={`inline font-mono text-xs px-1 py-0.5 rounded-sm border mx-0.5 transition-all duration-150 cursor-pointer ${
                              isFlashing ? 'animate-citation-flash' : ''
                            } ${
                              isActive
                                ? 'bg-accent text-white border-accent'
                                : 'text-accent border-accent-border bg-accent-soft hover:bg-accent hover:text-white hover:border-accent'
                            }`}
                          >
                            [{seg.citationId}]
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                {/* Low confidence */}
                {exchange.isLowConfidence && (
                  <div className="mt-2 pl-4 py-2 border-l-2 border-warn-soft bg-warn-soft rounded-r-sm">
                    <div className="text-xs font-semibold text-flag-amber mb-0.5">Low confidence</div>
                    <p className="text-xs text-flag-amber/80 leading-snug">
                      {exchange.lowConfidenceReason || 'Retrieved passages had low relevance. Verify against source.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}

        {/* Asking indicator — no bouncing dots */}
        {isAsking && (
          <div className="max-w-2xl mx-auto">
            <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Datum</div>
            <div className="border-l-2 border-border-strong pl-4">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="w-3 h-3 border border-current rounded-full border-t-transparent spin" />
                Retrieving passages and synthesizing answer…
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-theme bg-surface-1 p-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label htmlFor="question-input" className="sr-only">Ask a question</label>
            <input
              id="question-input"
              type="text"
              value={inputValue}
              disabled={isInputDisabled}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                !document
                  ? 'Select a document first…'
                  : !isDocReady
                  ? `Document is ${document.status}…`
                  : `Ask a question grounded in ${document.filename}…`
              }
              className="flex-1 h-9 px-3 rounded bg-surface-2 border border-border-theme text-sm text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-border-strong transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded bg-accent text-white hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-xs text-text-subtle">
            {document && !isDocReady ? (
              <span className={`font-mono ${document.status === 'failed' ? 'text-danger' : 'text-accent'}`}>
                {document.status === 'failed'
                  ? `Ingestion failed: ${document.errorMessage || 'processing error'}`
                  : `Status: ${document.status} — indexing in progress`}
              </span>
            ) : (
              <span>Answers cite exact sections and pages from your document</span>
            )}
            <span className="font-mono hidden sm:inline">↵ to send</span>
          </div>
        </div>
      </div>
    </main>
  );
};
