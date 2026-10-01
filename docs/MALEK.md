# Malek's grill (prototype)

Malek "Boo Rayan", known as Al-Mallem (المعلم), runs a charcoal grill in Giza on his own. The shop is
a place on the Giza district map (marker **M**, in the market row by your stall). He is also a
recurring rug customer at your stall.

Handoff sources (owner's Drive folder, copied to `art-src/malek/`): `MALEK_MENU_AND_ART_NOTES.md`,
`malek-menu.json`, `MALEK_FIVE_VISIT_STORY.md` and the seven PNGs.

## Files

| File | What |
|---|---|
| `src/data/malekMenu.ts` | The ten menu items from `malek-menu.json`, with daily stock for fresh meat |
| `src/game/systems/malek.ts` | Pure rules: hours, stock, meals and parcels, night meters, visit picture, his lines, the story state machine |
| `src/game/state/store.ts` | `malek` and `parcels` in the save (version 19), actions `malekEnter`, `malekBuy`, `eatParcel`, `malekSay`, `malekStoryDone`, the night rollover, and the "well fed" patience at the stall |
| `src/components/Malek/MalekShop.tsx` (+ `.css`) | The shop screen: door picture, room, menu, confirm and result sheets, parcels. Lazy-loaded from the district |
| `src/components/Malek/MalekRoom3D.tsx` | The 3D room (three.js + React Three Fiber). Lazy-loaded again, only when you step inside |
| `src/components/Malek/orbit.ts` | Camera limits and the WebGL check, kept out of the 3D chunk |
| `src/data/malekBuyer.ts` | Malek as a stall customer (`SPECIAL_BUYERS`, tier Common) |
| `src/components/Inventory/Inventory.tsx` | "Food for the road" in Stock: eat a parcel serving anywhere, including on the road |
| `public/art/malek/` | Visit and story scenes (WebP, 1280 px), Malek's waist-up figure for the room |
| `public/art/portraits/malek.jpg`, `malek-stall2.webp` | Portrait and stall cut-out |
| `tests/malek-rules.ts`, `tests/malek.mjs`, `tests/malek2.mjs` | Rules unit test, browser tests |

## How the menu's stats map onto the game

The handoff's illustrative 0-100 meters become:

| Handoff | In the game |
|---|---|
| satiety | **Fed** (new, 0-100). Fed 50 or more at nightfall: your own ration is not drawn from the caravan's food that night. Drops by 60 overnight. |
| energy | Takes that much off **fatigue** (the existing 0-100 meter the stall already reads). Meals count once per four game hours (only the best meal's energy); tea once per four hours of its own. |
| morale | **Well fed**: buyers get 2 patience per point, for four game hours. Never stacks: within the window only the best meal counts, and eating again never extends it. |
| hydration | **Water** (new, 0-100). Towns refill it to 60 overnight. On the road the caravan's provisions keep it at 30 or more, so old journeys are unchanged; salted food can push it below 25, and thirsty at nightfall adds 6 fatigue. Empty sacks cost 25 a night. |

Meters clamp to 0-100. Hunger and water gains always apply up to the cap, and the confirm sheet and
the result show what would be wasted. No healing, cures, combat bonus or injury repair.

Prices are in piastres, as in the handoff (2-24 PT). A day's bread for one person costs about 2 PT
in the game's markets, so they sit with the existing economy. Prices, effects, hours and keeping
times are game values. The menu says so; they are not presented as 1925 prices or food-safety advice.

## Malek at your stall, and in the day

- **His stall visits:**
  - He comes to your stall once you have eaten at his place: every five days or more, more keenly (55%) while his floor is bare, 35% after.
  - The morning notes say so on the days he might come.
  - He haggles as a Common-tier buyer who wants dark, hard-wearing, forgiving rugs, with his own lines.
- **A sale:**
  - The rug lies under his tables in the 3D room, and he greets you about it once (or about the stall visit going nowhere).
  - The journal records it.
  - His tab gives you 3 plates on the house: any eat-in dish except the lamb kebab, never parcels.
- **Ways in during the day:**
  - "Breakfast / Lunch / Supper at Malek's" on the stall's quiet-hours card.
  - A hungry nudge at the stall.
  - "Supper at Malek's" on the evening ledger strip until 21:00.
  - A night note when the caravan's food runs out and you carry his parcels.
- **Talk to Malek:** six topics: the shop, his name (Al-Mallem, Boo Rayan), the storeroom (hints only), the neighbours (Arran, Rashid, Abu Hamid, the bean man), the road (real tips in his voice) and rugs. Tapping him in the room steps round the topics.
- **Greetings:** chosen most pressing first: a first visit, hungry, tired, news of the stall visit, back after five days away, a regular, then by the hour.
- **Lines:** 102 in the shop alone; about 6% open with "Ha", "Bah" or "Now what?", and never two of those in a row.

## Stall haggling: hard to convince, and he comes back

- **The conviction check** (`malekConvinced` in negotiation.ts):
  - Even with a price agreed, Malek buys only with interest 72+, a fit of 65+, and trust above his stubbornness for the day.
  - That stubbornness is rolled per visit, 48-61.
  - Otherwise he leaves to think it over (`MALEK_UNSURE`).
- **Measured** by `tests/malek-haggle.ts`, 300 haggles each:
  - a naive seller: 0% sold
  - a careful one (asks, shows the best fit, argues durability and fit, fair price): about 26%
  - the same rug on his return visit: about 89%
- **Coming back:**
  - A rug he liked but would not buy is remembered (`malek.wantsBack`). He comes back for it two or more days later (80% a day), with a morning note.
  - It goes on the counter first, and he is easier to convince.
  - If you kept it for him he says so (+10 trust). If you sold it, he is annoyed (−10 trust).

## Putting a rug aside for a buyer (any buyer)

- **Where:** Stock has "Put aside for…" on each rug, listing buyers you have met. The stall's result card also offers "Put the X aside for {name}" when a buyer walks away from a rug they liked.
- **A held rug** (7 days, `RugItem.reservedFor/reservedUntil`):
  - is not laid out for anyone else, and cannot be shown to them (a note says who it is kept for);
  - is laid out first for that buyer, who notices: +10 trust, +8 interest.
- **When the hold ends,** a night note says it is back on the stall. "Free it" in Stock ends a hold early.

## First-meeting films

Six special characters each get a short documentary the first time you meet them. Each plays once,
with captions and Skip; the Customers screen keeps a "Films" shelf of the ones you have seen.

| Who | Plays | Picture |
|---|---|---|
| Malek | his shop, the first time it is open to you | his video (`public/video/malek-intro.mp4`, WebM fallback); the last frame holds under the narration |
| Arran | his laboratory, first visit | lab and scene paintings, slow pans (his video replaces them when supplied) |
| Abu Hamid | the coffee house, first visit | the Giza map closing in on his tables, then his portrait |
| Uncle Rashid | his warehouse, first visit | the Cairo map, his portrait |
| Nabil al-Khatib | the first time he comes to your stall (his greeting waits for the film) | Cairo, his figure, his portrait |
| Cohen | the first time he comes to your stall | Alexandria, his figure, his portrait |

- **Films:** defined in `src/components/IntroFilm/films.ts`.
- **Narration:**
  - `tools/generate-intro-films.py` records it offline (Kokoro `bm_lewis`: a stock synthetic narrator, not Arran's voice, not a clone) into `public/audio/intro/<who>.mp3`, with the caption timings in `src/data/introFilms.ts`.
  - Each film says who the character is and what they do for you.
- **Arran's video:** the Gemini share link was blocked here. Supply the file and set `FILMS.arran.video`.

## Rules

- **Hours:** open 07:00-21:00. Ful before 11:00. Grill 11:00-20:00, cold after 20:00 (parcels still sold).
- **Daily stock:** kofta 8, kebab 4, liver 6. The stew pot runs two days in three (6 portions); on the third day the pot is beans.
- **Eat-in:** pay, eat at once, 20 game minutes. Meals never rewind the clock, and the shop is not reachable mid-journey.
- **Parcels:** pay, and the parcel goes in your pack. Nothing happens until you eat a serving, from the shop's "Your parcels" tab or from Stock.
  - Eating one passes no time, so a journey is never interrupted.
  - Each serving shows its weight.
  - Parcels keep 7 game days (5 from May to September) and are thrown away with a note when they go off.
  - Parcels cannot be sold back, so there is no resell loop.
- **One charge per order:**
  - Each confirm sheet carries an order token, and the store refuses a token it has already charged. Two taps in the same instant charge once.
  - Cancel moves nothing.
  - Cash, the ledger, stock and parcels change together in one store update.

## Visit pictures and dialogue

- **Pictures:**
  - On entering, a picture is chosen to fit the hour:
    - preparing: 07:00-17:00
    - grilling: from 11:00
    - serving: from 08:00
    - closing: from 20:00, cold grill
  - It is never the same as last visit when another one fits.
- **Where he stands in the room:** behind the grill, behind the prep bench, or sat at a table when closing.
- **Lines:**
  - Dry English, by context (greeting, menu, kofta, parcel, sold out, closing, talk, rugs).
  - Never the line he just said, and never two "Ha / Bah / Now what?" lines in a row.
  - The handoff's four lines are used as written.

## The room

- **Geometry:** simple 7 m × 6 m geometry laid out like the references:
  - charcoal grill and smoke hood on the left wall
  - shelves, water jar and preparation bench at the back
  - storeroom doorway with a curtain at the back right
  - tables and stools on the right
  - street door in the right wall
- **Textures:** small generated ones (plaster, tiled floor, wood, cloth). The paintings are not wrapped onto walls.
- **Malek:** one cut-out, kept upright facing the camera. He stands behind a counter so it hides the waist-high cut.
- **Camera:**
  - Drag to turn, with an 8 px dead zone so a tap never turns the room. Pinch or wheel to zoom.
  - Limits on angle and distance; a wider lens on tall phone screens.
  - "Reset view".
- **Walls:** a wall fades whenever the camera is on its outer side.
- **Clickable:** Malek (talk), the menu board, the tables (sit and order) and the door (leave). Each also has a screen label that follows the room.
- **Fallback:** without WebGL, or if the context is lost, the visit picture and buttons replace the room. The menu and parcels work the same.
- **Cost:**
  - About 106 draw calls and 3,000 triangles, drawn only when something moves.
  - The shop module is 15 KB. The 3D chunk (three.js) is 833 KB, or 225 KB gzipped, and is fetched only when you step inside.
- **Touch:** the room has `touch-action: none` and is never part of a scrolling page. The menu scrolls in its own panel and never moves the camera.

## The five-visit story (ON: all five scenes supplied)

The state machine is complete and tested in `tests/malek-rules.ts`:
- one stage per visit, on a later game day than the last;
- stages advance in order, one at a time after days away;
- a stage that is opened but not finished stays pending and is offered again;
- completion, day and next stage are committed together, once;
- the story never loops after stage 5.

All five scenes are supplied (`story-1-expulsion` … `story-5-arthur`), so the story is on. If any
stage loses its art, `storyReady` turns the whole sequence off rather than starting it part way.
It starts on a game day later than your first visit to the shop.

- **The customer** in stages 1-3 is Nabil al-Khatib (`STORY_CUSTOMER`, the owner's decision). Stage 1 waits until he has come to your stall.
  - Afterwards, Nabil says nothing about it at your stall, and the narrator notes that.
  - The supplied scenes show a man in a red fez with a black moustache, not Nabil's look (bald, grey beard, grey suit). Redrawn scenes are requested.
- **The quarrel** is over the bill (yesterday's bread, so half-price kebab), never about who he is.
- **After stage 3,** the storeroom talk topic changes to lines about its occupant.
- **After stage 5,** Arthur Bell is a talk topic, and the story does not loop.

## Art still needed

1. **Story stages 1-3:** supplied (and the stall cut-out, `malek-stall2.webp`).
2. **Malek cut-outs,** transparent PNG, 1024×1536, the same face and clothes as `05-malek-owner-reference.png`:
   - standing behind a counter turning skewers
   - at the bench working mince
   - carrying a plate
   - seated at a table counting coins

   Today the room uses one waist-up cut-out (from the reference, the grill removed) in every position.
5. **Arran's film:** the video file itself (the share link was blocked here).
3. **Optional props:** a grill-front texture, shelf crockery and a menu board, as separate transparent PNGs or tileable textures, to replace the simple shapes.
4. `05-arthur-bell-lore.png` has its caption painted into the image. That is fine as a lore card. A version without the caption band would let the game set the text.

## Preview

`./tools/build-malek-preview.sh` builds a standalone review copy of the shop into `dist-preview/`:
- The source is `preview/` and `vite.preview.config.ts`.
- It is the real shop, store and save, plus test controls: set the hour, next day (the game's own night rollover), add money, reset.
- Published privately at https://claude.ai/artifact/Cei8DU1nGznEJPWwTQWYeS
