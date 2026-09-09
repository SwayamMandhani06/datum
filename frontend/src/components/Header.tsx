import React from 'react';
import { Link } from 'react-router-dom';
import type { DocumentItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeDocument: DocumentItem | null;
}

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
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
const FileTextIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ activeDocument }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 glass-strong border-b border-glass-border flex items-center justify-between px-5 flex-shrink-0 select-none z-20 relative">
      {/* Subtle gradient line at bottom of header */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent pointer-events-none" />

      {/* Left: Logo + Active doc */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center glow-sm group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <span className="text-base font-bold gradient-text hidden sm:inline">Datum</span>
        </Link>

        {activeDocument && (
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-border-theme min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-soft border border-accent-border text-xs font-medium text-accent max-w-xs truncate">
              <FileTextIcon />
              <span className="truncate">{activeDocument.filename}</span>
            </div>
            <span className="text-xs text-text-muted whitespace-nowrap">
              {activeDocument.pageCount} pp
            </span>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'blueprint' ? 'light' : 'dark'} mode`}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 border border-transparent hover:border-border-theme transition-all duration-200"
        >
          {theme === 'blueprint' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* API Docs link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary border border-transparent hover:border-border-theme hover:bg-surface-2 transition-all duration-200"
        >
          API Docs
        </a>

        <Link
          to="/"
          className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium gradient-bg text-white hover:opacity-90 transition-all duration-200 glow-sm"
        >
          Home
        </Link>
      </div>
    </header>
  );
};
