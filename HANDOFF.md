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
- No JPGs are served: every picture under public/art is WebP (since 2026-10-31; the code names
  .webp, and src/game/state/artPaths.ts rewrites old .jpg names in saves when the game opens). The
  former JPGs are the masters in art-src/jpg-masters/<same path>. A new painting goes into public/ as
  WebP (Pillow: quality 80, method 6; 84 for rugs) with its master in art-src/. Some older tools still
  write JPGs into public/ (travel_art.py, battle.py, ...): convert their output before committing.
  Files no screen uses are kept in art-src/unused/.
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
- The travel map is one painting from Crete to Kerman (since save 33): master art-src/world/
  travel-map-painting-1610.png (as painted) and travel-map-master-4800.png (upscaled with Real-ESRGAN
  x4plus, BSD-3, blended 70/30 with a plain Lanczos resize so it does not look waxy); the WebP copies in
  public/art/world are travel-map-4k (4800), -3k (3072), travel-map (2048) and -768. The map is
  2000 x 1214 units on a 400 x 243 grid of 5-unit cells. `python3 tools/build-map.py --report --overlay
  out.png` fits the projection (control points measured on the painting, a quadratic plus a thin-plate
  spline: src/data/projection.ts, `geo(lon, lat)`), writes every town's and well's x, y into
  src/data/world.ts from its longitude and latitude, and rebuilds landmask.ts (sea from the blues),
  terrain.ts (fertile from the greens, mountains from snow and painted relief, the roads by lon/lat
  waypoints), barriers.ts (the Nile, its two Delta branches, the canal, Tigris, Euphrates, Shatt and the
  Jordan, hand-traced, with bridges and fords) and src/game/state/mapMove.ts (old map to new, for saves
  before 33). Place anything new by longitude and latitude with geo(); never by hand-typed map units.
- Battle art: masters in art-src/battle (not deployed; prompts and manifest alongside). Run
  `python3 tools/battle.py` to make the WebP copies in public/art/battle. The fight in
  src/components/World/Ambush.tsx draws them through BattleField.tsx (BAND_ART lists each band's
  men, leader and the grounds it fights on; fieldFor picks one per fight).
- The living travel map (save 34): src/data/mapArt.ts lists every piece of the map art brief under its code
  (01-giza … 33-rutba landmarks, S1..S10 ships, S-wake, C1..C5 caravans, K-compass-base/needle/rim, T cartouche,
  B scale bar, W1..W4 weather, F-corner, M-* markers) with its spot from the brief's positions.csv. To add a
  painting, drop it into public/art/map as <code>-<name>.webp (or .png; any name after the code works):
  vite.config.ts lists that folder at build time (virtual:map-art-files), and the map draws the file in place
  of its ink placeholder (src/game/systems/mapArtDraw.ts). No code change. The compass is the Blender render
  (tools/blender-compass.py). Ships and caravans move on lanes checked against the land mask
  (src/game/systems/mapLife.ts) on their own canvas (components/World/MapLife.tsx); "Map life" in Settings
  stops them. Every way travelled is inked into the save (state.inked, systems/inked.ts). Dividers and the
  trade lens are the two tools under the zoom buttons. tests/maplife.ts and tests/maplife.mjs check it all.
- The map's ships are Blender models rendered from 16 headings (since 2026-11-01): `tools/blender-ships.py`
  (run with the bpy venv's python: `python tools/blender-ships.py art-src/ships/render [type ...]`) renders each
  type at every 22.5 degrees, ship and shadow separately, 320 px, camera from the south 48 degrees up, sun in the
  north-west fixed in the world; `python3 tools/ships-sheet.py --contact out.png` adds the soft shadow, a thin ink
  edge, the smoke plume (steamers, drifting astern), a little blur and grain, halves the frames to 160 px and writes
  one sheet per type to public/art/map/ships/<type>.webp (masters art-src/ships/<type>.png; the raw renders in
  art-src/ships/render are not kept in git). Types: steamer (S1, S10), cargo (S2, S7), felucca (S3), dhow (S4, S5,
  S8), schooner (S6), caspian (S9); SHIP_SHEET in src/data/mapArt.ts. Frame i is the ship sailing i x 22.5 degrees
  clockwise from east on the ground (0 east, 4 south, 8 west, 12 north). shipFrame() in systems/mapLife.ts turns
  a map heading into the ground heading (the sheets' ground is foreshortened by sin 48) and picks the nearest
  frame; the picture is never rotated, so masts stay upright. The wake is laid under it on the same foreshortened
  ground. Precedence: a type's sheet first; without it, a single painting S<n>-*.webp/png turned to the heading as
  before; without that, the ink placeholder. To use a painted single ship instead, take that type's sheet out.
