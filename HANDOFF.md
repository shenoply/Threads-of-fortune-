# Threads of Fortune: moving to GitHub

This archive holds the full source (code, data, tests, tools). The art and audio (about 240 MB)
are not inside; they are the published files of the game artifact:
https://claude.ai/artifact/TvVNAP1MqcJuDqy6RvqVTx

Steps for the session that has push access to shenoply/Threads-of-fortune-:
1. Unpack this archive at the repo root.
2. List the artifact's files (Artifact tool, action list, scope files) and download every path
   under art/, audio/ and voices/ into public/ (Artifact read with `paths`, 256 per call),
   keeping the same relative paths.
3. npm install; npx vite build; cp public/page.html dist/.
4. Commit and push to main.
5. Keep every file under art/, audio/ and voices/ in the artifact. Do NOT remove the voices or
   radio mp3s to save space: the jsDelivr route (src/game/audio/cdn.ts) did not serve them in the
   published game, and without them dialogue and the radio fall silent. The game loads audio from
   next to the page first and only tries jsDelivr if a file is missing.
   The whole game is about 254 MB, just under the artifact's 256 MB limit; new art must be small.

## Where the game lives now
- It is published from GitHub to https://shenoply.github.io/Threads-of-fortune-/ by
  .github/workflows/pages.yml on every push to main. The artifact is kept in step as well.
- The wardrobe loads WebP copies of the hero PNGs (src/data/wardrobe.ts baseSrc/layerSrc/coverSrc).
  The PNGs are the masters: after changing any, run `python3 tools/webp.py` to refresh the WebP copies.
- tools/refit.py fits tops, coats, trousers and shoes to the base body (sleeves and legs no wider
  than needed, trousers to the ankle, shoes covering the toes). Run it after adding or repainting
  one of those pieces, then tools/webp.py.
- Battle art: masters in art-src/battle (not deployed; prompts and manifest alongside). Run
  `python3 tools/battle.py` to make the WebP copies in public/art/battle. The fight in
  src/components/World/Ambush.tsx draws them through BattleField.tsx (BAND_ART picks each band's
  men, leader and field).
