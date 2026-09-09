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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4M8 15h.01M12 15h.01M16 15h.01"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.64 5.64l.71.71M17.66 17.66l.71.71M5.64 18.36l.71-.71M17.66 6.34l.71-.71"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

export const ConversationView: React.FC<ConversationViewProps> = ({
  document,
  exchanges,
  activeCitationId,
  onCitationClick,
  onAskQuestion,
  isAsking,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [pulsingCitationId, setPulsingCitationId] = useState<number | null>(null);
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

  const handleCitationSelect = (citationId: number, exchangeId: string) => {
    setPulsingCitationId(citationId);
    onCitationClick(citationId, exchangeId);
    setTimeout(() => setPulsingCitationId(null), 700);
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, isAsking]);

  return (
    <main className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full relative">

      {/* Context bar */}
      <div className="h-11 px-5 border-b border-border-theme flex items-center justify-between text-xs bg-surface-1/50 flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-text-muted">Grounded in:</span>
          {document ? (
            <span className="font-mono text-accent bg-accent-soft border border-accent-border px-2 py-0.5 rounded-md truncate max-w-xs">
              {document.filename}
            </span>
          ) : (
            <span className="font-mono text-text-muted bg-surface-2 border border-border-theme px-2 py-0.5 rounded-md">
              None selected
            </span>
          )}
        </div>
        <span className="text-text-muted hidden sm:block font-mono">Citation mode: exact-page</span>
      </div>

      {/* Thread area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-8 bg-surface-0">

        {/* Empty: no document */}
        {!document && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl gradient-bg-subtle border border-accent-border flex items-center justify-center mb-4 animate-float">
              <SparkleIcon />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">No Specification Selected</h3>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
              Select a document from the left rail or upload an AUTOSAR specification PDF to begin asking grounded engineering questions.
            </p>
          </div>
        )}

        {/* Empty: doc selected but no exchanges */}
        {document && exchanges.length === 0 && !isAsking && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center mb-4 glow animate-float">
              <BotIcon />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Ready to Answer</h3>
            <p className="text-sm text-text-muted max-w-md leading-relaxed mb-6">
              Ask anything about{' '}
              <code className="font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded">
                {document.filename}
              </code>
              . Every answer is synthesized with cited evidence — exact sections and page boundaries from your specification.
            </p>
            {document.pageCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-success font-medium bg-success/10 border border-success/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {document.pageCount} pages indexed and ready
              </div>
            )}

            {/* Suggested questions */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg text-left">
              {[
                'What components are defined in this specification?',
                'What ports does the main component expose?',
                'What interfaces are referenced in this document?',
                'Summarize the key constraints defined here.',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => onAskQuestion(q)}
                  disabled={isInputDisabled}
                  className="text-xs text-left p-3 rounded-xl glass border border-border-theme hover:border-accent-border hover:bg-accent-soft text-text-muted hover:text-text-primary transition-all duration-200 disabled:opacity-40"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exchanges */}
        {exchanges.map((exchange) => (
          <article key={exchange.id} className="space-y-4 max-w-3xl mx-auto">

            {/* User question */}
            <div className="flex justify-end">
              <div className="max-w-lg">
                <div className="gradient-bg rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm font-medium shadow-glow-sm">
                  {exchange.question}
                </div>
                <div className="text-right text-xs text-text-muted mt-1 font-mono pr-1">
                  {exchange.timestamp}
                </div>
              </div>
            </div>

            {/* AI answer */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                  <BotIcon />
                </div>
                <span className="text-xs text-text-muted font-medium">Datum</span>
              </div>

              {exchange.error ? (
                <div className="glass-card rounded-2xl rounded-tl-sm p-4 border-l-2 border-flag-amber">
                  <div className="flex items-center gap-2 mb-1 text-flag-amber font-mono text-xs font-semibold">
                    <AlertIcon />
                    Unable to answer
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{exchange.error}</p>
                </div>
              ) : (
                <>
                  <div className="glass-card rounded-2xl rounded-tl-sm p-4">
                    <div className="text-sm text-text-primary leading-relaxed">
                      {exchange.answerSegments.map((segment, idx) => {
                        if (segment.type === 'text') {
                          return <span key={idx}>{segment.content}</span>;
                        }
                        if (segment.type === 'code') {
                          return (
                            <code key={idx} className="font-mono text-xs text-accent bg-surface-3 px-1.5 py-0.5 rounded border border-accent-border mx-0.5">
                              {segment.content}
                            </code>
                          );
                        }
                        if (segment.type === 'citation') {
                          const isCurrent = activeCitationId === segment.citationId;
                          const isPulsing = pulsingCitationId === segment.citationId;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCitationSelect(segment.citationId, exchange.id)}
                              className={`inline-flex items-center font-mono text-[11px] font-semibold mx-0.5 px-1.5 py-0.5 rounded-md border transition-all duration-200 cursor-pointer ${
                                isPulsing ? 'animate-citation-glow' : ''
                              } ${
                                isCurrent
                                  ? 'text-white gradient-bg border-transparent glow-sm'
                                  : 'text-accent border-accent-border bg-accent-soft hover:bg-accent hover:text-white hover:border-transparent'
                              }`}
                              aria-label={`Open citation reference ${segment.citationId}`}
                            >
                              [{segment.citationId}]
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {/* Low confidence warning */}
                  {exchange.isLowConfidence && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-soft border border-flag-amber/30 flex items-start gap-2">
                      <AlertIcon />
                      <div>
                        <div className="text-xs font-semibold text-flag-amber mb-0.5">Low confidence</div>
                        <p className="text-xs text-flag-amber/80 leading-snug">
                          {exchange.lowConfidenceReason || 'Retrieved passages have lower similarity. Verify against source text.'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        ))}

        {/* Thinking / loading state */}
        {isAsking && (
          <article className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 animate-pulse-ring">
                <BotIcon />
              </div>
              <span className="text-xs text-text-muted font-medium">Datum is thinking...</span>
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
              </div>
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-surface-3 animate-pulse w-3/4" />
                <div className="h-3 rounded-full bg-surface-3 animate-pulse w-1/2" />
                <div className="h-3 rounded-full bg-surface-3 animate-pulse w-5/6" />
              </div>
              <p className="text-xs text-text-muted mt-3 font-mono">Retrieving passages &amp; synthesizing with Groq...</p>
            </div>
          </article>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border-theme bg-surface-1 p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <label htmlFor="question-input" className="sr-only">
              Ask a question about this document
            </label>
            <input
              id="question-input"
              type="text"
              value={inputValue}
              disabled={isInputDisabled}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                !document
                  ? 'Select a document to ask questions...'
                  : !isDocReady
                  ? `Document is ${document.status} — available once ready`
                  : `Ask anything about ${document.filename}...`
              }
              className="flex-1 h-11 px-4 rounded-xl bg-surface-2 border border-border-theme text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="h-11 w-11 flex-shrink-0 rounded-xl flex items-center justify-center gradient-bg text-white hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed glow-sm"
              aria-label="Send question"
            >
              <SendIcon />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
            {document && !isDocReady ? (
              <span className={`font-mono ${document.status === 'failed' ? 'text-red-400' : 'text-accent'}`}>
                {document.status === 'failed'
                  ? `Ingestion failed: ${document.errorMessage || 'processing error'}`
                  : `Status: ${document.status} — indexing in progress`}
              </span>
            ) : (
              <span>All answers cite exact sections and page numbers from your document</span>
            )}
            <span className="font-mono hidden sm:inline">↵ Enter to send</span>
          </div>
        </div>
      </div>
    </main>
  );
};
