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
  public/art/world are travel-map-4k (4800), -3k (3072), travel-map (2048) and -768. Close in (where the 4800 picture
  would be blown up more than 1.8 times on the screen: middle and close zoom on a phone, close zoom on a PC) the map also
  draws tiles over it: art/world/tiles-9k/r<row>c<col>.webp, 1024 px, 10 x 6, the master doubled (Lanczos) with a gentle
  local contrast on the lightness and a faint procedural paper grain, all from `python3 -I tools/map-tiles.py` (--crop
  x,y,w out.png shows one spot before and after). Only the tiles on screen are fetched, once the map is still, and at
  most 24 are kept decoded (10 on a phone under 4 GB); the single picture stays underneath, so a missing tile shows
  the painting. Close in the canvas is drawn at the screen's full pixel density (2.6 on a Pixel 7a), else at 2. The
  painting's softness close in is the master's own: it is the 1610-px painting enlarged three times; a new master or
  new tiles need NEW file names (the service worker keeps pictures by name). The map is
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
  (tools/blender-compass.py). Ships move on lanes checked against the land mask (the painted caravans C1..C5 no
  longer walk the map since 2026-11-03: their wandering served no purpose; the files stay, unused)
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
  ground. Since 2026-11-03 the artist's painted ships come first (the overlays below); a type's sheet is the fallback
  where it has no painting, and ?ships=blender (or localStorage tof-ships=blender) shows the sheets instead.
- The map's decorations (since 2026-11-02): hand-painted palms, trees, olives, peaks, hills, desert marks, fields and
  sea marks laid over the painting. The artist paints ten transparent sheets (2048 x 2048, items in a grid with gaps,
  lit from the north-west, seen from about 30 degrees up): 01-palms, 02-broadleaf, 03-conifers, 04-olives,
  05-peaks-snow, 06-peaks-bare, 07-hills, 08-desert, 09-fields, 10-sea (what each holds, in reading order, is in
  src/data/mapKitSheets.json). Put them in art-src/map-kit/sheets/ and run
  `python3 -I tools/cut-sheets.py --contact /tmp/kit.png`: it finds each item by its alpha, crops, trims and packs
  each sheet into public/art/map/kit/<sheet>.webp with <sheet>.json (frames, base points, groups); the map draws an
  atlas in place of that sheet's ink placeholders on its own (no code change). If a sheet's item count differs from
  the manifest, it says so; a <sheet>.groups.json beside the sheet (group names in reading order) settles it.
  Where each decoration stands: `python3 tools/build-mapkit.py --overlay /tmp/zones.png` (painting relief, snow and
  greens, regions by longitude and latitude, clear of water, rivers, towns, names and routes; seeded) writes
  src/data/mapKitZones.ts. Run it again after moving towns, roads or names. Since 2026-11-03 it places no dunes, outcrops, scrub or ochre
  hills (on flat sand they read as stickers), green hills only on green ground, and no peak standing alone off a range. Drawing: src/game/systems/mapKitDraw.ts
  (cached tiles on the base map; with Map life on and close in, trees sway and sea marks fade on the life canvas).
  Tester switch: "Travel map decorations" in the tester sheet, or ?kit=0 / ?kit=1. Tests: tests/mapkit.ts,
  tests/mapkit-shots.mjs, tests/mapkit-perf.mjs.
- The map's painted overlays (since 2026-11-03, the artist's complete map art pack): masters in art-src/map-overlays/
  (landmarks/, ships/, caravans/, people/, the pack's sheets/ and index; unused/ holds the route pieces, not used: the
  map draws its own roads and rails, and the pack's pieces are partly cut off and misnamed). `python3 -I
  tools/map-overlays.py --contact /tmp/o.png` cleans each cut-out (clears the faint haze, drops the bits of
  neighbouring items cut with it), trims it and writes public/art/map/<code>-<name>.webp (landmarks 01..33),
  S1/S2/S3/S4/S6/S9 ships and S-wake, C1..C5-caravan.webp and people/<what>.webp, plus src/data/mapOverlays.json
  (every picture's size; ships, caravans and people each shrunk by one factor so their sizes agree). The pack's
  "donkey cart" is a ploughman with an ox (people/plough.webp). Layout: src/game/systems/mapOverlays.ts.
  Landmarks (since 2026-11-03 about 1.7 times bigger: 32 map units wide, 92-176 px, 84 far out, shrinking in steps to
  half where crowded) stand just above their town's pin, most important first (where you are first); zoomed far out only the
  cities', ports', your home's and your own town's, a size smaller. One that would cover another landmark, or any pin,
  name or mark as the page laid them out (WorldMap's label pass hands the boxes over, with your medallion and the stall
  window), is lifted over its own town's marks, shifts aside, goes under the town's name, shrinks a step, or is left out
  at that zoom; moved off its pin (or far out) it must stand on dry land; warm where visited, paler where known, faded where
  closed; none in unexplored country. Ships: sized for their water (src/game/systems/mapLife.ts shipLook: a steamer
  20 map units long, 30-58 px, on the open sea; two thirds of that in a narrow gulf or strait, half on a river; SHIPS'
  `water` in mapArt.ts; S11 in the Gulf of Suez and S12 on the Marmara added for the narrow waters), never wider than
  their water: the hull stays on water all along the lane at the drawn size, and a ship too small to read fades out.
  The life canvas draws the ships from the camera the painting is shown at (WorldMap's shownCam, set where the canvas
  is drawn, slid or pinched), at once when it changes: before, it read the committed camera (the pan moved at once,
  the scale a render later) at 30 frames a second, so ships jumped and lagged on a zoom (tests/map-zoomlock.mjs checks
  every frame of a wheel zoom and a pinch). The type's painting faces its leg (mirrored westward, turned over
  through a turn, tilted at most about 5 degrees), the painted wake under it. Caravans: mirrored by leg, one scale.
  People: PEOPLE in src/data/mapArt.ts (a town, or a stretch of road; the Beirut fishermen find no shore clear of the
  bigger landmark and are left out), placed once on dry ground clear of roads,
  rails, pins, names, landmarks and painted names; drawn on the base map close in with Map life on only.
  The stall at Giza shows close in as a small round window west of the town (tap opens it), not a bubble over the towns.
  The closest zoom is capped where the painting stays crisp (never under 2.45); Android phones with 4 GB or more load the
  4800-wide copy. Tests: tests/mapoverlays.ts.
- The repainted travel map (since 2026-11-04, branch `repaint`, awaiting the owner's approval): the artist's whole-map repaint
  and nine sections are in art-src/world/repaint/ (whole.png 1610 wide; tile-N.png 1536 x 1024, each the old master's
  rectangle in tiles.csv, 1728 x 1152; positions.csv the brief's town dots). `python3 -I tools/map-repaint.py` stitches
  art-src/world/travel-map-master2-4800.png from them: each section enlarged by 1728/1536 at its rectangle, fitted to the old
  geography by a smooth optical flow on water and rivers (sections up to 47 px, 95% under 2-19), colour-matched to whole.png
  in Lab (separately on sea and land, away from the landmarks), joined along graph-cut seams with a narrow multi-band blend,
  each landmark taken from one section only (FORCE, for Kashan and Isfahan, which two sections painted in different
  spots). Tiles 7 and 8 came back as a miniature map: SKIP leaves them out and whole.png fills their rectangles (the south:
  Upper Egypt, the Red Sea, Arabia); drop the corrected tile-7.png / tile-8.png into the folder, take them out of SKIP and run
  it again. PAINT_OUT lists the made-up buildings and landmarks painted far from any town (Oman and the Gulf, Homs, south
  Sinai, a second Baghdad, a duplicate Jerusalem on Amman's dot), filled with nearby brushwork. 4800 wide is the old size:
  the sections carry about 4267 px of detail across, whole.png 1610. The WebP copies are public/art/world/painted2-map-4k,
  -3k, painted2-map, -768; the close-zoom tiles art/world/tiles2-9k (tools/map-tiles.py, now a plain Lanczos doubling:
  --treated brings back the contrast and grain made for the old master). build-map.py reads the sea from the repaint
  (travel-map-painting2-1610.png, the master shrunk) and the lakes, rivers and ground from the first painting, so the terrain
  does not change with the new brushwork. Landmarks painted into the map (PAINTED_LANDMARKS in src/data/mapArt.ts, with where
  each stands, PAINTED_AT) get no overlay; the overlays stay for Saqqara, Fayoum, Amman and the wells at Ajrud, Ayun Musa and
  Wadi Feiran; town names step off a painted landmark's middle where they can. The terrain kit (mapKitDraw.ts) is off by
  default (src/game/mapKitPref.ts, key tof-map-kit2; ?kit=1 or the tester sheet turns it on). Review shots:
  tests/map-repaint-shots.mjs.
