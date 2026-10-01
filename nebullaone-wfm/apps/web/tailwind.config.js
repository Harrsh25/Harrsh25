/** Tokens match the prototype's compiled CSS. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#111827', soft: '#4b5563', mute: '#6b7280', faint: '#9ca3af' },
        brand: { DEFAULT: '#0b5ed7', soft: '#e8f0fe', dark: '#0a4fb4' },
        line: '#e5e7eb',
        canvas: '#f1f2f4',
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)' },
    },
  },
  plugins: [],
};
