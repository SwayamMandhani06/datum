import React from 'react';
import type { DocumentItem } from '../types';

interface HeaderProps {
  activeDocument: DocumentItem;
}

export const Header: React.FC<HeaderProps> = ({ activeDocument }) => {
  return (
    <header className="h-14 bg-ink-800 border-b border-ink-600 flex items-center justify-between px-6 flex-shrink-0 select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-scale-22 font-semibold text-ink-text tracking-tight">
            Datum
          </span>
          <span className="text-scale-13 text-graphite-400 font-normal">
            Automotive HLD Assistant
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-scale-13">
        <span className="text-graphite-400">Current scope:</span>
        <span className="font-mono text-ink-text bg-ink-950 px-2 py-0.5 border border-ink-600">
          {activeDocument.filename}
        </span>
        <span className="text-graphite-400">
          {activeDocument.pageCount} pages indexed
        </span>
      </div>
    </header>
  );
};
