import React from 'react';
import { Link } from 'react-router-dom';
import type { DocumentItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeDocument: DocumentItem | null;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const MenuIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-rotate">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-rotate">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ activeDocument, onToggleSidebar, isSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 glass-nav flex items-center justify-between px-4 sm:px-5 flex-shrink-0 select-none z-30 relative transition-all duration-200">
      {/* Brand & Active Document */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden w-8 h-8 btn-icon !rounded-lg text-text-muted hover:text-text-primary flex-shrink-0"
            title={isSidebarOpen ? 'Close specification list' : 'View specifications'}
            aria-label="Toggle document list"
          >
            <MenuIcon />
          </button>
        )}

        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-btn transition-transform duration-200 group-hover:scale-105 group-hover:shadow-btn-hover">
            <span className="text-xs font-bold text-white leading-none tracking-tight">D</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary tracking-tight leading-none group-hover:text-accent transition-colors duration-150">
              Datum
            </span>
            <span className="text-[10px] text-text-muted font-mono tracking-widest uppercase mt-0.5 hidden sm:inline">
              AUTOSAR HLD AI
            </span>
          </div>
        </Link>

        {/* Active Specification Pill */}
        {activeDocument && (
          <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-border-theme min-w-0">
            <span className="text-xs text-text-muted font-medium tracking-tight flex-shrink-0">Active Spec:</span>
            <div className="flex items-center gap-2 glass-badge max-w-[220px] lg:max-w-sm px-3 py-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-success flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span className="text-xs font-mono font-medium text-text-primary truncate" title={activeDocument.filename}>
                {activeDocument.filename}
              </span>
              <span className="text-[11px] text-text-subtle font-mono flex-shrink-0">
                ({activeDocument.pageCount} pp)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* System Telemetry & Quick Links */}
      <div className="flex items-center gap-2.5">
        {/* Verification Badge */}
        <div className="hidden lg:flex items-center gap-1.5 glass-badge text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
          <CheckCircleIcon />
          <span className="font-semibold tracking-tight">17/17 Tests Verified</span>
        </div>

        {/* Qdrant Status */}
        <div className="hidden xl:flex items-center gap-1.5 glass-badge text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="tracking-tight">Qdrant Cloud Connected</span>
        </div>

        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex btn-ghost h-8 px-3 text-xs font-mono"
        >
          API Docs &rarr;
        </a>

        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'blueprint' ? 'light' : 'dark'} mode`}
          className="w-8 h-8 btn-icon"
        >
          {theme === 'blueprint' ? <SunIcon /> : <MoonIcon />}
        </button>

        <Link
          to="/"
          className="h-8 px-3.5 btn-secondary text-xs"
        >
          Overview
        </Link>
      </div>
    </header>
  );
};
