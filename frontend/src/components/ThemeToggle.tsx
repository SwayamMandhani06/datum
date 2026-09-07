import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className="inline-flex items-center p-0.5 bg-surface-2 border border-border-theme rounded text-scale-13 select-none"
    >
      <button
        type="button"
        onClick={() => setTheme('blueprint')}
        aria-pressed={theme === 'blueprint'}
        className={`px-2.5 py-1 transition-colors ${
          theme === 'blueprint'
            ? 'bg-surface-1 text-text-primary font-medium border border-border-theme shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        Blueprint
      </button>
      <button
        type="button"
        onClick={() => setTheme('drafting')}
        aria-pressed={theme === 'drafting'}
        className={`px-2.5 py-1 transition-colors ${
          theme === 'drafting'
            ? 'bg-surface-1 text-text-primary font-medium border border-border-theme shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        Drafting
      </button>
    </div>
  );
};
