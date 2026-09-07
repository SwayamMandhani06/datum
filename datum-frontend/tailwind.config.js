/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink-950': 'var(--color-ink-950, #131B24)',
        'ink-800': 'var(--color-ink-800, #1E2A36)',
        'ink-600': 'var(--color-ink-600, #2E3D4B)',
        'paper-100': 'var(--color-paper-100, #F3EFE6)',
        'paper-300': 'var(--color-paper-300, #E4DCC8)',
        'graphite-400': 'var(--color-graphite-400, #8A94A0)',
        'ink-text': 'var(--color-ink-text, #E7ECF1)',
        'signal-teal': 'var(--color-signal-teal, #3FB8AC)',
        'warn-amber': 'var(--color-warn-amber, #D9A441)',
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
