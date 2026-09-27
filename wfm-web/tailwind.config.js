/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  safelist: ["text-left", "text-right", "text-center"],
  theme: {
    extend: {
      fontFamily: { sans: ["'Inter Variable'", "Inter", "Segoe UI", "system-ui", "sans-serif"] },
      colors: {
        shell: "#f0f0f0",
        brand: { DEFAULT: "#0b5ed7", dark: "#094db3", soft: "#e8f0fe" },
        teal: { brand: "#14b8a6" },
        ink: { DEFAULT: "#111827", soft: "#4b5563", mute: "#6b7280", faint: "#9ca3af" },
        line: "#e5e7eb",
      },
      boxShadow: { card: "0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)" },
    },
  },
  plugins: [],
};
