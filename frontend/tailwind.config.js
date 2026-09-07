/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'flag-amber': 'var(--flag-amber)',
        'border-theme': 'var(--border)',
        'glass-fill': 'var(--glass-fill)',
        'glass-border': 'var(--glass-border)',
        'evidence-paper': '#DCD3BC',
        'evidence-border': '#233041',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        'scale-13': ['13px', { lineHeight: '18px' }],
        'scale-15': ['15px', { lineHeight: '22px' }],
        'scale-17': ['17px', { lineHeight: '26px' }],
        'scale-22': ['22px', { lineHeight: '28px' }],
        'scale-28': ['28px', { lineHeight: '34px' }],
        'scale-36': ['36px', { lineHeight: '42px' }],
      },
      transitionDuration: {
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
