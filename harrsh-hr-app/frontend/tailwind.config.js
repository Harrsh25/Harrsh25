/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#1a56db',
          light: '#EFF4FF',
          dark: '#1e40af',
          50: '#EFF4FF',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1a56db',
        },
        // Semantic
        success: { DEFAULT: '#16a34a', bg: '#dcfce7', light: '#f0fdf4', border: '#bbf7d0' },
        error:   { DEFAULT: '#dc2626', bg: '#fee2e2', light: '#fef2f2', border: '#fecaca' },
        warning: { DEFAULT: '#d97706', bg: '#fef3c7', light: '#fffbeb', border: '#fde68a' },
        info:    { DEFAULT: '#2563eb', bg: '#dbeafe', light: '#eff6ff', border: '#bfdbfe' },
        // Text
        text: {
          primary:   '#111827',
          secondary: '#6b7280',
          muted:     '#9ca3af',
          inverse:   '#ffffff',
        },
        // Surface
        surface: {
          DEFAULT: '#ffffff',
          subtle:  '#f9fafb',
          border:  '#e5e7eb',
          'border-subtle': '#f0f1f4',
        },
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '1.5', fontWeight: '500' }],
        sm:   ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        base: ['13px', { lineHeight: '1.6', fontWeight: '400' }],
        md:   ['15px', { lineHeight: '1.5', fontWeight: '500' }],
        lg:   ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        xl:   ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        '2xl':['28px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      spacing: {
        1: '4px', 2: '8px', 3: '12px', 4: '16px',
        5: '20px', 6: '24px', 8: '32px', 10: '40px',
        12: '48px', 14: '56px', 16: '64px', 20: '80px',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '14px',
        xl:   '20px',
        '2xl':'24px',
        full: '9999px',
      },
      boxShadow: {
        card:   '0 2px 8px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.10)',
        modal:  '0 8px 32px rgba(0,0,0,0.16)',
        none:   'none',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp 0.22s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
        'ring-shake': 'ringShake 0.5s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        ringShake: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(15deg)' },
          '30%': { transform: 'rotate(-10deg)' },
          '45%': { transform: 'rotate(8deg)' },
          '60%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
