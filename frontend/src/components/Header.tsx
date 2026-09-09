import React from 'react';
import { Link } from 'react-router-dom';
import type { DocumentItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeDocument: DocumentItem | null;
}

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ activeDocument }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-12 flat-chrome flex items-center justify-between px-4 flex-shrink-0 select-none z-20 relative">
      {/* Logo */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-5 h-5 rounded-sm bg-accent flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">D</span>
          </div>
          <span className="text-sm font-semibold text-text-primary hidden sm:inline tracking-tight">Datum</span>
        </Link>

        {/* Active doc indicator */}
        {activeDocument && (
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border-theme min-w-0">
            <span className="text-xs text-text-muted">Specification:</span>
            <code className="text-xs font-mono text-text-primary bg-surface-2 border border-border-theme px-2 py-0.5 rounded-sm truncate max-w-xs">
              {activeDocument.filename}
            </code>
            <span className="text-xs text-text-subtle font-mono flex-shrink-0">{activeDocument.pageCount} pp</span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'blueprint' ? 'light' : 'dark'} mode`}
          className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
        >
          {theme === 'blueprint' ? <SunIcon /> : <MoonIcon />}
        </button>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex h-8 px-3 items-center text-xs text-text-muted hover:text-text-primary hover:bg-surface-2 rounded transition-colors duration-150"
        >
          API
        </a>
        <Link
          to="/"
          className="h-8 px-3 flex items-center text-xs font-medium rounded bg-surface-2 border border-border-theme text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors duration-150"
        >
          Home
        </Link>
      </div>
    </header>
  );
};
