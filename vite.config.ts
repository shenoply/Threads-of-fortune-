import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// the modules loaded with the entry: reachable from it through static imports only (worked out once per build)
type Meta = { getModuleIds: () => IterableIterator<string>; getModuleInfo: (id: string) => { isEntry: boolean; importedIds: readonly string[] } | null };
let startup: Set<string> | null = null;
function atStartup(id: string, meta: Meta): boolean {
  if (!startup) {
    startup = new Set();
    const todo = [...meta.getModuleIds()].filter((x) => meta.getModuleInfo(x)?.isEntry);
    while (todo.length) {
      const x = todo.pop()!;
      if (startup.has(x)) continue;
      startup.add(x);
      todo.push(...(meta.getModuleInfo(x)?.importedIds ?? []));
    }
  }
  return startup.has(id);
}
export default defineConfig({
  base: './',
  plugins: [react(), { name: 'startup-set', buildStart() { startup = null; } }],
  build: {
    outDir: 'dist', assetsInlineLimit: 0,
    // fetch the code, data and library files side by side, not one after the other
    modulePreload: { polyfill: false },
    // hashed filenames so every deploy forces a fresh fetch instead of relying on the CDN's cache TTL
    rollupOptions: { output: {
      entryFileNames: 'assets/game-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]',
      // libraries and the game's data change far less often than its code: in their own files a phone
      // keeps them cached across updates and only fetches the code again
      manualChunks(id, meta) {
        // chess.js is only for the café's chess table: it goes with that lazy chunk, not the opening download
        if (id.includes('node_modules')) return /[\\/]node_modules[\\/]chess\.js[\\/]/.test(id) ? undefined : 'vendor';
        // only the data the opening needs (reached from the entry by static imports) goes in the 'data' file;
        // data reached only through a lazy import (the wires, the Arabic radio, ...) travels with that lazy chunk
        if (/[\\/]src[\\/]data[\\/]/.test(id) && atStartup(id, meta)) return 'data';
        return undefined;
      },
    } }
  }
});
