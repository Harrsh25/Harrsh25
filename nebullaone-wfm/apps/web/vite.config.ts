import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode demo` → one self-contained HTML file (dist-demo/index.html)
// that runs offline from a snapshot of the API. Normal builds are unchanged.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  define: mode === 'demo' ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {},
  build: mode === 'demo' ? { outDir: 'dist-demo', assetsInlineLimit: 100_000_000 } : {},
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
}));
