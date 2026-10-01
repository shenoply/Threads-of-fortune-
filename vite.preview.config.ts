// Builds the standalone Malek's grill preview (preview/index.html) into dist-preview/, for review
// before merging. Only the Malek art is copied in by tools/build-malek-preview.sh.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'preview',
  base: './',
  publicDir: false,
  plugins: [react()],
  build: { outDir: '../dist-preview', emptyOutDir: true, assetsInlineLimit: 0, modulePreload: false },
});
