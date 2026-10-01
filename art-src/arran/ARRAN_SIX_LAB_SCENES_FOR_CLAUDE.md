# Arran laboratory scenes — Threads of Fortune

Use these six 1536×1024 PNG scene illustrations in the existing Vite/React/TypeScript game. Inspect the current project before changing component paths or save data. These are complete painted scenes with Arran already present, not transparent character layers. Preserve the existing empty `13-lab-room.png` for station exploration and parallax.

## Files and scene mapping

| File | Scene | Suggested use |
|---|---|---|
| lab-microscope.png | Arran at the brass microscope | Fibre inspection or arrival dialogue |
| lab-dye.png | Arran studies wool colour samples | Dye comparison and colourfastness discussion |
| lab-balance.png | Arran handles a fibre sample beside the balance | Weighing discussion |
| lab-desk.png | Arran writes and glances at the visitor | Findings, notebook and friendly conversation |
| lab-board.png | Arran holds chalk by the blank slate | Teaching and explanations |
| lab-cabinet.png | Arran retrieves a brown bottle with ledger in hand | Stock checking and reagent discussion |

Copy images into `public/art/arran/` using these exact filenames. Use the existing base-URL-aware asset helper so GitHub Pages subpath hosting works. Do not use bare root URLs if the project is served under `/Threads-of-fortune-/`.

## Display and interaction

- Keep the 3:2 aspect ratio. Prefer `object-fit: contain` for whole-room views so shoes, instruments and board stay visible. Avoid stretching or cropping the character.
- Use one scene at a time. Do not add a second Arran portrait on top of a scene that already includes him.
- Crossfade scenes gently; honour reduced-motion preferences. Preload the next scene, and provide the empty room as a loading fallback.
- Select scenes through existing lab stations. Optional arrival rotation should be stable within a visit, not change on each React render. Keep notebook and board scenes available on demand.
- Dialogue and controls belong in a dedicated panel beneath/beside the scene. Avoid floating popups over the instruments or slate.
- Boards are intentionally blank: any teaching text/equations must be precise HTML overlays, aligned to this room's slate and tested at desktop/mobile sizes. Leave overlays off when not teaching.
- These pictures support limited parallax/focus effects, not a room that can rotate freely in 3D.

## Content and continuity

Arran Embleton is a British textile chemist in Giza, 1925. Keep his established likeness, open white cotton coat, waistcoat/watch chain, collared shirt, patterned tie, brown trousers and shoes. Retain existing voice and dialogue systems.

The room is an illustrative reconstruction. Do not treat an image as scientific proof or a documented historical photograph. Testing results must come from actual inventory metadata; missing evidence means inconclusive. Reopening a saved finding must not charge again. Preserve existing saves and game state; use the project's migration conventions only if adding persistent state.

## Art review before integration

Generated scenes are visually consistent but not pixel-identical. In `lab-balance.png` the microscope shifts left, and the sample gesture sits outside the case rather than precisely on its pan. `lab-dye.png` visibly shows three yarn bundles rather than the requested four distinct colours. Do not rely on these images for exact station hotspot positions or scientific step demonstrations. Use the empty room for interactive hotspot alignment, and use these as conversation illustrations. Request targeted image corrections if exact continuity or four visible dye colours are essential. The bottle label in the cabinet scene is blank to keep text out of the artwork.

## Verification

Check all six files load on the deployed GitHub Pages subpath, desktop and narrow phone layouts preserve full characters, station selection matches the correct scene, board overlays remain aligned, and entering/reopening the lab does not duplicate fees or alter inventory unexpectedly. Run the existing relevant build/checks. Do not overwrite unrelated art or publish changes beyond the user's requested scope.
