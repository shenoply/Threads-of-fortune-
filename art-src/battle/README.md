# Threads of Fortune — Battle Art

29 battle assets with the exact filenames requested in `BATTLE_ART_PROMPTS.txt`.

## Contents

- 4 battlefield maps: `battle-road.jpg`, `battle-dunes.jpg`, `battle-oasis.jpg`, `battle-pass.jpg` — 1024 × 1536 JPEG.
- 13 standing character tokens — 1024 × 1024 PNG with alpha transparency.
- 8 mounted character tokens — 1024 × 1024 PNG with alpha transparency.
- 2 animal tokens: `camel.png`, `horse.png` — 1024 × 1024 PNG with alpha transparency.
- 2 fallen character tokens: `fallen-light.png`, `fallen-dark.png` — 1024 × 1024 PNG with alpha transparency.
- Original prompt document and `asset-manifest.json`, listing all filenames, dimensions and approximate coverage.

## Placement and scale

Transparent padding is deliberate. Standing figures occupy approximately 28% of the canvas width across the solid shoulder/upper-arm region; the three standing enemy leaders occupy approximately 32%. Mounted figures and the saddled horse occupy approximately 80% of the canvas height, the loaded camel approximately 85%, and fallen figures approximately 70%.

Keep the full square token canvas when placing or scaling these images. These are untrimmed exports: the original painting content and transparency were retained, resized proportionally and padded to the requested dimensions. No image was stretched. Very faint alpha fringes remain preserved; coverage measurements in the manifest use substantial artwork.

The files are standalone art assets, ready to copy into the game's asset folder. Integration into game code is a separate step.
