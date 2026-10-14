import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { BOOT_ART, COLD_TITLES } from './src/game/bootArt';
// The built page, for a quicker first screen on a phone line:
// - the stylesheet loads alongside the code instead of holding back the loading screen (main.tsx waits
//   for it before drawing the game);
// - the pictures the loading screen waits for are asked for as soon as the code has downloaded, while
//   it is still being read and started (a second or more of an idle line on a slow phone before);
// - on a first visit the title picture is picked here (one of the title's own, lighter paintings) and
//   asked for with them; App.tsx shows that one.
const quickStart = (): Plugin => ({
  name: 'quick-start', apply: 'build',
  transformIndexHtml: { order: 'post', handler(html) {
    html = html.replace(/<link rel="stylesheet"([^>]*?)href="(\.\/assets\/index-[^"]+\.css)">/, '<link rel="stylesheet"$1href="$2" id="app-css" media="print" onload="this.media=\'all\'">');
    // the pictures start the moment the code and stylesheet are in (before the code has run): on a
    // slow line they then neither hold the code back nor wait for it to start
    const code = (html.match(/\.\/assets\/[^"]+\.(?:js|css)/g) ?? []).map((u) => u.slice(2));
    const boot = `<script>(function(){var go=false,pics=${JSON.stringify(BOOT_ART)};try{if(!(navigator.serviceWorker&&navigator.serviceWorker.controller)){var t=${JSON.stringify(COLD_TITLES)};window.__tofTitle=t[Math.floor(Math.random()*t.length)];pics.unshift(window.__tofTitle);}}catch(e){}
function start(){if(go)return;go=true;pics.forEach(function(s,i){var l=document.createElement('link');l.rel='preload';l.as='image';l.href=s;if(!i)l.setAttribute('fetchpriority','high');document.head.appendChild(l);});}
var code=${JSON.stringify(code)},got={};
function check(es){es.forEach(function(e){code.forEach(function(c){if(e.name.indexOf(c)>=0)got[c]=1;});});if(code.every(function(c){return got[c];}))start();}
try{new PerformanceObserver(function(l){check(l.getEntries());}).observe({type:'resource',buffered:true});setTimeout(start,10000);}catch(e){start();}})();</script>`;
    return html.replace('</head>', `  ${boot}\n</head>`);
  } },
});
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
  plugins: [react(), quickStart(), { name: 'startup-set', buildStart() { startup = null; } }],
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
