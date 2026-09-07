import React, { useState, useRef, useEffect } from 'react';
import type { QAExchange, DocumentItem } from '../types';

interface ConversationViewProps {
  document: DocumentItem;
  exchanges: QAExchange[];
  activeCitationId: number | null;
  onCitationClick: (citationId: number) => void;
  onAskQuestion: (question: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  document,
  exchanges,
  activeCitationId,
  onCitationClick,
  onAskQuestion,
}) => {
  const [inputValue, setInputValue] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAskQuestion(trimmed);
    setInputValue('');
  };

  // Scroll to bottom when exchanges update
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges]);

  return (
    <main className="flex-1 min-w-0 bg-ink-950 flex flex-col h-full relative">
      {/* Top pane bar: context header */}
      <div className="h-11 px-8 border-b border-ink-600 flex items-center justify-between text-scale-13 bg-ink-950/80 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-graphite-400">Grounded in document:</span>
          <span className="font-mono text-ink-text">{document.filename}</span>
        </div>
        <div className="text-graphite-400">
          Formal citations enabled
        </div>
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-8">
        {exchanges.map((exchange) => (
          <article key={exchange.id} className="space-y-4 max-w-3xl mx-auto">
            {/* User Question: Simple right-aligned text, no bubble chrome */}
            <div className="flex flex-col items-end">
              <div className="text-right text-scale-17 font-normal text-ink-text leading-relaxed max-w-xl">
                {exchange.question}
              </div>
              <div className="text-scale-13 text-graphite-400 mt-1 font-mono">
                {exchange.timestamp}
              </div>
            </div>

            {/* AI Answer: Left-aligned prose with inline citation markers */}
            <div className="pt-2 border-t border-ink-600/30">
              <div className="text-scale-15 text-ink-text leading-relaxed font-normal">
                {exchange.answerSegments.map((segment, idx) => {
                  if (segment.type === 'text') {
                    return <span key={idx}>{segment.content}</span>;
                  }

                  if (segment.type === 'code') {
                    return (
                      <span
                        key={idx}
                        className="font-mono text-scale-13 text-ink-text bg-ink-800 px-1 py-0.5 border border-ink-600"
                      >
                        {segment.content}
                      </span>
                    );
                  }

                  if (segment.type === 'citation') {
                    const isCurrent = activeCitationId === segment.citationId;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onCitationClick(segment.citationId)}
                        aria-label={`Open citation reference ${segment.citationId}`}
                        className={`inline-flex items-baseline font-mono text-scale-13 mx-0.5 px-0.5 transition-colors cursor-pointer ${
                          isCurrent
                            ? 'text-white underline decoration-signal-teal decoration-2 underline-offset-4 bg-ink-800'
                            : 'text-signal-teal underline decoration-signal-teal underline-offset-2 hover:text-white'
                        }`}
                      >
                        [{segment.citationId}]
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </article>
        ))}

        <div ref={threadEndRef} />
      </div>

      {/* Input Area: Single-line text input with plain text "Ask" button */}
      <div className="border-t border-ink-600 bg-ink-800 p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <label htmlFor="question-input" className="sr-only">
              Ask a question about this AUTOSAR document
            </label>
            <input
              id="question-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question grounded in this AUTOSAR specification..."
              className="flex-1 h-10 px-3.5 bg-ink-950 border border-ink-600 text-scale-15 text-ink-text placeholder-graphite-400 focus:border-signal-teal transition-colors"
            />
            <button
              type="submit"
              className="h-10 px-5 text-scale-15 font-medium bg-signal-teal text-ink-950 hover:bg-[#34a499] active:bg-[#2c8d83] transition-colors select-none"
            >
              Ask
            </button>
          </form>
          <div className="mt-2 text-scale-13 text-graphite-400 flex items-center justify-between">
            <span>Answers provide direct section and page evidence from source HLD</span>
            <span className="font-mono text-scale-13">Press Enter to submit</span>
          </div>
        </div>
      </div>
    </main>
  );
};
