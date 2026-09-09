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
    setTimeout(() => {
      setPulsingCitationId(null);
    }, 650);
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, isAsking]);

  return (
    <main className="flex-1 min-w-0 bg-surface-0 flex flex-col h-full relative">
      {/* Top pane bar: context header with distinct surface-1 background */}
      <div className="h-11 px-8 border-b border-border-theme flex items-center justify-between text-scale-13 bg-surface-1 flex-shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-text-muted">Grounded in specification:</span>
          {document ? (
            <span className="font-mono text-text-primary bg-surface-2 px-1.5 py-0.5 border border-border-theme truncate max-w-sm">
              {document.filename}
            </span>
          ) : (
            <span className="font-mono text-text-muted bg-surface-2 px-1.5 py-0.5 border border-border-theme">
              None selected
            </span>
          )}
        </div>
        <div className="text-text-muted font-mono text-scale-13 hidden sm:block">
          Exact-page citation mode
        </div>
      </div>

      {/* Scrollable Conversation Thread on solid surface-0 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8 bg-surface-0">
        {/* Empty States */}
        {!document ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-3">
              <div className="text-scale-17 font-medium text-text-primary">
                No Specification Selected
              </div>
              <p className="text-scale-15 text-text-muted leading-relaxed">
                Select a document from the left rail or upload an AUTOSAR specification PDF to begin asking questions.
              </p>
            </div>
          </div>
        ) : exchanges.length === 0 && !isAsking ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-lg space-y-4">
              <div className="text-scale-17 font-medium text-text-primary">
                Grounded Specification Assistant
              </div>
              <p className="text-scale-15 text-text-muted leading-relaxed">
                Ask questions about <span className="font-mono text-text-primary">{document.filename}</span>. Every answer is synthesized with evidence citations referencing exact sections and page boundaries.
              </p>
              {document.pageCount > 0 && (
                <div className="pt-2 text-scale-13 text-text-muted font-mono">
                  {document.pageCount} pages indexed and ready for retrieval
                </div>
              )}
            </div>
          </div>
        ) : (
          exchanges.map((exchange) => (
            <article key={exchange.id} className="space-y-4 max-w-3xl mx-auto">
              {/* User Question: Simple right-aligned text, no bubble chrome */}
              <div className="flex flex-col items-end">
                <div className="text-right text-scale-17 font-normal text-text-primary leading-relaxed max-w-xl">
                  {exchange.question}
                </div>
                <div className="text-scale-13 text-text-muted mt-1 font-mono">
                  {exchange.timestamp}
                </div>
              </div>

              {/* AI Answer: Left-aligned prose with inline citation markers */}
              <div className="pt-3 border-t border-border-theme">
                {exchange.error ? (
                  <div className="p-3 bg-surface-1 border-l-2 border-flag-amber text-scale-13 text-flag-amber space-y-1">
                    <div className="font-mono font-medium">Unable to answer query:</div>
                    <div className="leading-relaxed">{exchange.error}</div>
                  </div>
                ) : (
                  <>
                    <div className="text-scale-15 text-text-primary leading-relaxed font-normal">
                      {exchange.answerSegments.map((segment, idx) => {
                        if (segment.type === 'text') {
                          return <span key={idx}>{segment.content}</span>;
                        }

                        if (segment.type === 'code') {
                          return (
                            <span
                              key={idx}
                              className="font-mono text-scale-13 text-text-primary bg-surface-1 px-1 py-0.5 border border-border-theme"
                            >
                              {segment.content}
                            </span>
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
                              aria-label={`Open citation reference ${segment.citationId}`}
                              className={`inline-flex items-baseline font-mono text-scale-13 mx-0.5 px-0.5 transition-all cursor-pointer rounded-xs ${
                                isPulsing ? 'animate-citation-glow' : ''
                              } ${
                                isCurrent
                                  ? 'text-accent font-medium underline decoration-accent decoration-2 underline-offset-4 bg-surface-2'
                                  : 'text-accent underline decoration-accent underline-offset-2 hover:opacity-80'
                              }`}
                            >
                              [{segment.citationId}]
                            </button>
                          );
                        }

                        return null;
                      })}
                    </div>

                    {/* Low-confidence warning callout */}
                    {exchange.isLowConfidence && (
                      <div className="mt-3 p-3 bg-surface-1 border-l-2 border-flag-amber text-scale-13 text-flag-amber space-y-1">
                        <div className="font-mono font-medium">Low confidence warning:</div>
                        <div className="leading-relaxed">
                          {exchange.lowConfidenceReason ||
                            'Retrieved passages have lower similarity or may not fully cover all aspects of this question. Please verify against source text.'}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))
        )}

        {/* Loading Indicator for Question answering */}
        {isAsking && (
          <article className="space-y-4 max-w-3xl mx-auto pt-3 border-t border-border-theme">
            <div className="flex items-center space-x-2 text-scale-13 text-accent font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping motion-reduce:animate-none flex-shrink-0" />
              <span>Retrieving vector passages & synthesizing answer with Groq LLM...</span>
            </div>
            <div className="h-16 w-full bg-surface-1/60 border border-border-theme animate-pulse motion-reduce:animate-none p-4 space-y-2">
              <div className="h-3 bg-surface-2 w-3/4" />
              <div className="h-3 bg-surface-2 w-1/2" />
            </div>
          </article>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input Area: Solid matte surface-1, single-line text input on surface-2 with plain text "Ask" button */}
      <div className="border-t border-border-theme bg-surface-1 p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <label htmlFor="question-input" className="sr-only">
              Ask a question about this AUTOSAR document
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
                  ? `Document is ${document.status} — questions enabled once ready.`
                  : `Ask a question grounded in ${document.filename}...`
              }
              className="flex-1 h-10 px-3.5 bg-surface-2 border border-border-theme text-scale-15 text-text-primary placeholder-text-muted focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputValue.trim()}
              className="h-10 px-5 text-scale-15 font-medium bg-accent text-surface-0 hover:opacity-90 active:opacity-80 transition-opacity select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAsking ? 'Thinking...' : 'Ask'}
            </button>
          </form>

          <div className="mt-2 text-scale-13 text-text-muted flex items-center justify-between">
            {document && !isDocReady ? (
              <span className="text-flag-amber font-mono text-[12px]">
                {document.status === 'failed'
                  ? `Ingestion failed: ${document.errorMessage || 'Server processing error'}`
                  : `Document status: ${document.status}. Ingestion must complete before queries.`}
              </span>
            ) : (
              <span>Answers provide direct section and page evidence from source HLD</span>
            )}
            <span className="font-mono text-scale-13 hidden sm:inline">Press Enter to submit</span>
          </div>
        </div>
      </div>
    </main>
  );
};
