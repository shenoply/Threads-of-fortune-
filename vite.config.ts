import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  // Malek's 3D room is lazy-loaded; pre-bundle its libraries so the dev server does not reload the
  // page the first time someone steps inside
  optimizeDeps: { include: ['three', '@react-three/fiber'] },
  build: {
    outDir: 'dist', assetsInlineLimit: 0, modulePreload: false,
    // hashed filenames so every deploy forces a fresh fetch instead of relying on the CDN's cache TTL
    rollupOptions: { output: { entryFileNames: 'assets/game-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } }
  }
});
