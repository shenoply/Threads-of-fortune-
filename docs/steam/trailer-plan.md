# Trailer plan: 75 seconds

One trailer for the store page (it plays first, above the screenshots), cut from real gameplay and the
game's own films. Steam autoplays it muted on the store page, so every beat must read without sound:
the captions carry it. Target 75 s (60–90 s allowed). 1920×1080, 30 fps, H.264 MP4, stereo AAC.

## Music

- **Main cue:** `public/audio/music/title-hijaz.mp3` (102 s): the title theme. Start at 0:00, cut at a phrase end around 0:50.
- **Lift for the road and the fight:** `public/audio/music/the-risky-pass.mp3` (90 s), from its opening, 0:44–1:05.
- **Out:** back to the last 10 s of `title-hijaz` for the title card, or let `the-risky-pass` ring out on a held chord.
- Under the stall scenes keep a low bed of the bazaar ambience (`public/audio/amb/`) and one or two voice lines from the buyers or Rashid, ducked under the music. Check `public/audio/CREDITS.txt` before release: the CC BY sound credits must be in the game's credits. The credits say the music is rendered with the GeneralUser GS soundfont; confirm who composed each track used (and whether any was AI-generated: see the disclosure in store-page.md).

## Shot list

Captions: period tone, at most six words each, set in the game's display face (Cinzel), brass on a soft dark band at the bottom third. No review quotes, no "coming soon" text inside the picture until the end card.

| # | Time | Picture (source) | Caption | Sound |
|---|---|---|---|---|
| 1 | 0:00–0:04 | Title painting, slow push-in (`public/art/title/caravan.webp`, title screen without buttons) | Giza, 1925. | Music in, soft |
| 2 | 0:04–0:09 | Rashid's film (`public/video/rashid-intro.mp4`, 3–4 s) | Your father left you his debts. | Rashid's voice, one line |
| 3 | 0:09–0:13 | The stall, idle, the lane behind (gameplay; screenshot 02's state) | And a corner of the bazaar. | Bazaar bed |
| 4 | 0:13–0:19 | A buyer arrives; "What size is the room?"; a rug presented (gameplay) | Every buyer wants something. | Buyer voice line |
| 5 | 0:19–0:24 | The price dial, an offer, a counter-offer, the handshake (gameplay) | Name your price. | Coin chink on the sale |
| 6 | 0:24–0:28 | Inspector: zoom on the weave, then the knot count (gameplay) | Know what you sell. | |
| 7 | 0:28–0:31 | First-sale film (`public/video/first-sale.mp4`, 3 s) | (no caption) | Music swells |
| 8 | 0:31–0:36 | World map: route drawn Giza → Alexandria, the train moving (gameplay, 4x speed) | From Cairo to Baghdad. | Train whistle |
| 9 | 0:36–0:40 | Caravan film (`public/video/caravan-road.mp4`) | By rail, river and caravan. | |
| 10 | 0:40–0:44 | Alexandria arrival film (`public/video/alexandria-arrival.mp4`) | (no caption) | Cue change to *the-risky-pass* |
| 11 | 0:44–0:51 | Road fight: the band across the road, the clash, the result (gameplay, tester's sheet "Even odds") | The roads have their own price. | Battle sfx |
| 12 | 0:51–0:55 | Selim Tannous's Mamluk carpet story letter, a choice picked (gameplay) | What you choose stays chosen. | |
| 13 | 0:55–0:59 | Rival houses table, Cairo (gameplay) | Rivals in every city. | |
| 14 | 0:59–1:03 | Coffee house, Bilgin (gameplay) or Malek's film (`public/video/malek-intro.mp4`, 3 s) | Friends, family, favours. | Café murmur |
| 15 | 1:03–1:07 | The stall upgraded: mat → canopy → shop in the Khan (`public/video/up-mat.mp4`, `up-bazaar.mp4`, `up-khan.mp4`, 1.3 s each) | From a mat to the Khan. | |
| 16 | 1:07–1:10 | Persia on the map, the Zagros road opening (gameplay, tester's sheet "Persia") | Five years. One fortune. | Music to its last phrase |
| 17 | 1:10–1:15 | End card: the library hero painting with the logo; under it, "Wishlist on Steam" and "Demo available" | (end card text) | Held chord |

Total: 75 s. If it runs long, drop 13 first, then 9.

The end card is the only place for words other than captions. Nothing claimed in a caption may be missing from the game at launch (cars are off in the current build: do not show or mention them).

## Recording the gameplay

Gameplay is captured at 1920×1080 once the PC layout is in (see screenshots-plan.md). Two ways:

### A. Playwright video (repeatable, no hands)

The stall, the map and the fight can be staged exactly as `tools/steam-shots.mjs` stages the screenshots:

```js
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: 'trailer-raw/', size: { width: 1920, height: 1080 } } });
const p = await ctx.newPage();
// ... the same staging as tools/steam-shots.mjs, with p.waitForTimeout() pauses where the action should breathe
await ctx.close(); // the .webm is written on close
```

- Run headed on a machine with a GPU (`chromium.launch({ headless: false })`) for smooth 30 fps; headless video can drop frames during the map's animation.
- Playwright records WebM without sound. Lay the music, voices and effects in the edit (they are files in `public/audio/` already).
- Slow the cursor-free actions with pauses of 600–1200 ms: a trailer needs time to read each move.
- Re-encode: `ffmpeg -i in.webm -r 30 -c:v libx264 -crf 18 -pix_fmt yuv420p out.mp4`.

### B. OBS (for anything played by hand)

- Canvas and output 1920×1080, 30 fps (60 for the fight if it looks better), recording format MKV, encoder x264 CRF 16–18 or NVENC CQ 18; remux to MP4 afterwards.
- Capture the game window (desktop build) or a Chrome window in kiosk mode (`--kiosk --window-size=1920,1080`).
- Record game audio on its own track, so the edit can keep voices and drop the game's music.
- Hide the mouse pointer (OBS window capture: untick "Capture Cursor"), or move it only as a player would.
- Turn the tester sheet off before recording (Settings), so no tester buttons are in shot.

## Editing

- Cut on the music's phrase ends; no shot shorter than 1.2 s except the stall upgrades.
- Captions in at 3 frames' fade, held at least 1.5 s.
- Loudness −14 LUFS integrated, peaks −1 dBTP.
- Deliver: `threads-of-fortune-trailer-1080p.mp4` (H.264, ≤ 5,000 kbps is plenty for this art) and a 4K upscale only if the art holds up.
- Steam lets you choose the trailer's thumbnail: use the end card or shot 5.
