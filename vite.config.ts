import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist', assetsInlineLimit: 0, modulePreload: false,
    // hashed filenames so every deploy forces a fresh fetch instead of relying on the CDN's cache TTL
    rollupOptions: { output: {
      entryFileNames: 'assets/game-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]',
      // libraries and the game's data change far less often than its code: in their own files a phone
      // keeps them cached across updates and only fetches the code again
      manualChunks(id) {
        if (id.includes('node_modules')) return 'vendor';
        if (/[\\/]src[\\/]data[\\/]/.test(id) && !/radioArabic|radioAr[12]|ar-wires/.test(id)) return 'data';
        return undefined;
      },
    } }
  }
});
