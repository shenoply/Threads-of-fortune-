import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist', assetsInlineLimit: 0, modulePreload: false,
    rollupOptions: { output: { entryFileNames: 'assets/game.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } }
  }
});
