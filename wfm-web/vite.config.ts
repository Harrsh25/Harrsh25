import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:single` packs the whole app (code, styles, font, logo) into one HTML file.
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "single" && viteSingleFile()].filter(Boolean),
  server: { port: 5173 },
  build: mode === "single" ? { outDir: "dist-single" } : {},
}));
