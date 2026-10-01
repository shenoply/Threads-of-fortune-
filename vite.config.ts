import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist', assetsInlineLimit: 0, modulePreload: false,
    // hashed filenames so every deploy forces a fresh fetch instead of relying on the CDN's cache TTL
    rollupOptions: { output: { entryFileNames: 'assets/game-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } }
  }
});
