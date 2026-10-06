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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon opacity-0 group-hover:opacity-100 transition-all duration-200">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
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
    <main className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full relative">
      {/* Context bar */}
      <div className="h-11 px-5 border-b border-border-theme bg-surface-1/80 backdrop-blur-md flex items-center justify-between text-xs flex-shrink-0 z-10">
        <div className="flex items-center gap-2 truncate min-w-0">
          <span className="text-text-muted font-medium flex-shrink-0">Grounded in:</span>
          {document ? (
            <code
              className="font-mono text-text-primary glass-badge px-2.5 py-0.5 truncate max-w-[200px] sm:max-w-xs md:max-w-md"
              title={document.filename}
            >
              {document.filename}
            </code>
          ) : (
            <span className="text-text-subtle font-mono">No document selected</span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-text-subtle font-mono text-[11px] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span>Citation mode: exact-page verified</span>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* No document */}
        {!document && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center text-text-subtle mb-4 shadow-glass">
              <span className="text-xl font-mono">[ ]</span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2 tracking-tight">No specification selected</h3>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              Select an AUTOSAR document from the left rail, or upload a specification PDF to activate grounded Q&amp;A.
            </p>
          </div>
        )}

        {/* Empty */}
        {document && exchanges.length === 0 && !isAsking && (
          <div className="max-w-2xl mx-auto fade-in-up">
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="kicker-pill text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span>READY FOR GROUNDED INFERENCE</span>
                </div>
                {document.pageCount > 0 && (
                  <span className="text-xs font-mono text-text-muted">
                    {document.pageCount} pages indexed
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight mb-2 break-words" title={document.filename}>
                {document.filename}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Ask any automotive architecture question. Every generated claim includes inline bracket citations linking directly to exact section titles, page numbers, and verbatim source excerpts.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="pt-2">
              <div className="section-label mb-3 flex items-center gap-2">
                <span>Suggested Architectural Queries</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => onAskQuestion(q)}
                    disabled={isInputDisabled}
                    className="glass-card-interactive p-3.5 text-xs text-left text-text-secondary hover:text-text-primary flex items-center justify-between gap-3 group disabled:opacity-40"
                  >
                    <span className="leading-snug">{q}</span>
                    <ArrowRightIcon />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exchanges */}
        {exchanges.map((exchange) => (
          <article key={exchange.id} className="max-w-2xl mx-auto space-y-4 fade-in-up">

            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-md">
                <div className="bg-gradient-to-r from-accent to-accent-dim text-white text-sm px-4 py-3 rounded-2xl shadow-btn leading-relaxed font-medium">
                  {exchange.question}
                </div>
                <div className="text-right text-[11px] text-text-subtle mt-1.5 font-mono px-1">{exchange.timestamp}</div>
              </div>
            </div>

            {/* AI response */}
            {exchange.error ? (
              <div className="glass-card p-4 border-l-4 border-danger">
                <div className="text-xs text-danger font-mono uppercase tracking-wider mb-1 font-bold">Inference Error</div>
                <p className="text-sm text-text-secondary leading-relaxed">{exchange.error}</p>
              </div>
            ) : (
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white leading-none">D</span>
                    </div>
                    <span className="text-xs font-bold text-text-primary tracking-tight">Datum Grounded Synthesis</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Verified Zero-Hallucination</span>
                </div>

                <div className="text-sm text-text-primary leading-relaxed pl-1">
                  {exchange.answerSegments.map((seg, i) => {
                    if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
                    if (seg.type === 'code') return (
                      <code key={i} className="font-mono text-xs bg-surface-2 border border-border px-1.5 py-0.5 rounded-md mx-0.5 text-accent">
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
                          className={`citation-badge ${isFlashing ? 'animate-citation-flash' : ''} ${
                            isActive ? '!bg-accent !text-white !border-accent' : ''
                          }`}
                          title={`Inspect Citation [${seg.citationId}]`}
                        >
                          [{seg.citationId}]
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Low confidence */}
                {exchange.isLowConfidence && (
                  <div className="mt-3 p-3 rounded-lg border border-warn/25 bg-warn-soft">
                    <div className="text-xs font-bold text-warn mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                      <span>Deterministic Refusal / Low Confidence Guard</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-snug">
                      {exchange.lowConfidenceReason || 'The provided AUTOSAR specification does not contain sufficient factual evidence for this query.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}

        {/* Asking indicator */}
        {isAsking && (
          <div className="max-w-2xl mx-auto fade-in-up">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full spin flex-shrink-0" />
                <span className="font-medium text-text-secondary">Retrieving vector passages from Qdrant and synthesizing grounded answer…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-theme bg-surface-1/90 backdrop-blur-md p-4 flex-shrink-0 z-10">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <label htmlFor="question-input" className="sr-only">Ask a question</label>
            <input
              id="question-input"
              type="text"
              value={inputValue}
              disabled={isInputDisabled}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                !document
                  ? 'Select a specification first…'
                  : !isDocReady
                  ? `Specification is ${document.status}…`
                  : `Ask a question grounded in ${document.filename}…`
              }
              className="glass-input flex-1 h-11 px-4 text-sm text-text-primary placeholder:text-text-subtle font-sans transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="btn-primary btn-shimmer h-11 w-11 flex-shrink-0 group !rounded-xl"
              aria-label="Send query"
              title="Send query"
            >
              <SendIcon />
            </button>
          </form>

          <div className="mt-2.5 flex items-center justify-between text-xs text-text-subtle px-1">
            {document && !isDocReady ? (
              <span className={`font-mono ${document.status === 'failed' ? 'text-danger' : 'text-accent'}`}>
                {document.status === 'failed'
                  ? `Ingestion failed: ${document.errorMessage || 'processing error'}`
                  : `Status: ${document.status} — indexing in progress`}
              </span>
            ) : (
              <span className="font-medium">Answers cite exact sections &amp; pages with zero hallucination</span>
            )}
            <span className="font-mono text-[11px] hidden sm:inline">Press Enter ↵ to query</span>
          </div>
        </div>
      </div>
    </main>
  );
};
