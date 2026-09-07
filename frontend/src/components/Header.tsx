import React from 'react';
import { Link } from 'react-router-dom';
import type { DocumentItem } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  activeDocument: DocumentItem;
}

export const Header: React.FC<HeaderProps> = ({ activeDocument }) => {
  return (
    <header className="h-14 glass-chrome border-b border-glass-border flex items-center justify-between px-6 flex-shrink-0 select-none z-20">
      <div className="flex items-center space-x-6">
        <Link
          to="/"
          className="flex items-baseline space-x-2 group focus-visible:outline-none"
        >
          <span className="text-scale-22 font-semibold text-text-primary tracking-tight group-hover:text-accent transition-colors">
            Datum
          </span>
          <span className="text-scale-13 text-text-muted hidden md:inline">
            Automotive HLD Assistant
          </span>
        </Link>

        <div className="hidden lg:flex items-center space-x-3 text-scale-13 pl-4 border-l border-border-theme">
          <span className="text-text-muted">Active scope:</span>
          <span className="font-mono text-text-primary bg-surface-2 px-2 py-0.5 border border-border-theme">
            {activeDocument.filename}
          </span>
          <span className="text-text-muted">
            {activeDocument.pageCount} pages indexed
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-scale-13">
        <ThemeToggle />
        <Link
          to="/"
          className="text-text-muted hover:text-text-primary transition-colors py-1 px-2 border border-transparent hover:border-border-theme"
        >
          Documentation
        </Link>
      </div>
    </header>
  );
};
