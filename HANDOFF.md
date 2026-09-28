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
- The stall scene (src/components/StallEncounter/Scene.tsx) is one painting, art/stall-empty.webp,
  on a 3:2 stage anchored to the bottom of the frame. The merchant stands at the left in the
  wardrobe pose, dressed as the player dressed him (only that pose has clothing art), sized so the
  counter hides him from the waist down; and the buyer's cut-out (art/portraits/<id>-stall.webp,
  drawn flush to its right edge, so it sits flush to the frame) at the right, both behind
  art/counter-stall.webp: the counter cloth plus the folded rug stack, cut from the painting
  (masters in art-src/: stall-empty.png, counter-overlay.png, samira-stall.png). Figure height is
  set from the visible frame (--fig-h) so heads stay in shot on a phone and a wide desktop panel.
- Cabarets and music halls: src/data/entertainment.ts (venues, the five fictional contacts, their
  carpet contracts, the Qamar share), src/components/World/Cabaret.tsx (the evening), cards on the
  town panel and street POIs (action venue:<id>). A venue with `opens` is locked until that day,
  read from the saved `day`; nothing about locks is saved. Money is piastres: the Qamar share is
  2,500 PT (£E25), reputation 25, after its first contract; it pays 60 PT a week in rollover.
  Art masters in art-src/venues/masters (numbered PNGs from the art pack, with its manifest and
  notes); `python3 tools/venues.py` writes public/art/venues/<id>/{exterior,interior,show}.webp,
  the contact portraits and Nadia's stall cut-out. tests/cabaret.mjs plays an evening through.
- Voices are one MP3 per character (32 kbps CBR, 22.05 kHz). src/game/audio/voice.ts keeps the
  compressed file and decodes each line on its own, cut at an MP3 frame boundary. Never decode a
  whole file with decodeAudioData: half an hour of speech is ~400 MB of samples, and that is what
  crashed the game on iPhones. Keep new recordings constant-bitrate so byte offsets follow time.
- Battle art: masters in art-src/battle (not deployed; prompts and manifest alongside). Run
  `python3 tools/battle.py` to make the WebP copies in public/art/battle. The fight in
  src/components/World/Ambush.tsx draws them through BattleField.tsx (BAND_ART lists each band's
  men, leader and the grounds it fights on; fieldFor picks one per fight).
