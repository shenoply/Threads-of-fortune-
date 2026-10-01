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
| `src/components/Malek/MalekRoom2D.tsx` | The painted room: drag to look, marks on the painting |
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
  - The rug lies on his floor in the painted room, and he greets you about it once (or about the stall visit going nowhere).
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
  - a careful one (asks, shows the best fit, argues durability and fit, fair price): about 33%
  - the same rug on his return visit: about 90%
- **His purse** (`MALEK_PURSE` in malekBuyer.ts, fictional tuning), rolled each visit:
  - tight (30%): half his usual ceiling, and a rug seems worth less to him;
  - usual (40%);
  - flush (30%): nearly double the ceiling, and he pays well over the odds.
  - A hint shows 70% of the time (patting his pockets, a new watch chain); otherwise you find out by haggling.
  - Measured: a careful sale fetches about 120-185pt on a tight day, 145-350pt usually, 200-575pt flush.
- **Coming back:**
  - A rug he liked but would not buy is remembered (`malek.wantsBack`). He comes back for it two or more days later (80% a day), with a morning note.
  - It goes on the counter first, and he is easier to convince.
  - If you kept it for him he says so (+10 trust). If you sold it, he is annoyed (−10 trust).
  - He also comes back for a rug he walked away from without agreeing a price, if it suited him (fit 55+, interest 45+, 60%).
  - After buying, 30% of the time he comes back wanting the same rug again ("a customer sat on mine"): any rug of that kind goes on the counter first; if you have none, he says so and goes (`MALEK_AGAIN`).

## The story on film (stage 3)

- Stage 3, "The Back Room Opens" (the third time you sit down at his tables), plays two silent clips from Drive in the story card (`Cutscene.tsx`), one after the other with a hard cut and no blank frame:
  1. `public/art/malek/videos/01-malek-goons-enter-5s` (Nabil pays the three men and leads them in);
  2. `02-malek-orangutan-drives-goons-out` (the orangutan sees them out).
- Stages 2 and 4 keep their paintings: stage 2 is the payment across the lane on an earlier day, and the reward has no video yet. Stage 4 plays the room's sound and shows Malek's line, "Good lad. You've earned a shawarma."
- **Sound** (`tools/build-malek-cutscene-audio.py`, credits in `public/audio/CREDITS.txt`):
  - one effects track per clip, timed to the frames: coins at the handover, the turn, footsteps going duller at the doorway; two grunts, stools knocked about, feet running out, the room settling;
  - recorded library footsteps, fire and market, plus synthesised coins, cloth, wood and grunts;
  - Nabil's "There he is. Follow me." in his game voice, subtitled.
- **Playback:** sound and subtitles follow the video's clock (drift corrected). Play appears if the browser blocks autoplay. Pause, Skip, Sound on/off, Subtitles on/off and Watch again. A hidden tab pauses everything. Music is ducked during the film. A clip that cannot load shows its still and the story carries on.
- The stage applies once, on Continue, as before: replaying, skipping, reloading or coming back the same day never applies it again.
- Test: `tests/malek-cutscene.mjs`.

## The menu book

- Menu (the tab or the menu mark in the room) opens `MalekMenuBook.tsx`: a leather cover swings open onto parchment pages.
  - Pages: Breakfast and the pot · From the charcoal · For the road · To drink, each with its Arabic heading.
  - Each dish has a picture cropped from his own shop paintings (`public/art/malek/menu/<id>.webp`), its price in piastres (and قرش in Arabic), its Arabic name, what it does, how many are left, the tab note, and Order / Buy (or a stamped reason it is off).
  - One page at a time on a phone (swipe or the arrows), two pages side by side on a wide screen.
  - The book closes once an order goes through; the confirm and result cards sit above it.
- Test: `tests/malek-menubook.mjs`.

## His Arabic

- **Phrases** (`src/data/malekArabic.ts`): اه وبعدين (Aah, w-ba'dein? "Ah… and then what?"), اللي خلق علّق (Elli khalaq, 'allaq. "He who made us will provide."), تملّي معاك (Tamalli ma'ak. "Always with you."), ها؟ (Ha? "Well?"), با! (Ba! "Bah!").
- **In his shop** (`MalekMutter.tsx`): at the door and inside, he says one to himself every 14-24 s, first after 4-7 s, never the same twice running, with the Arabic, a reading and the meaning on screen. He keeps quiet while a confirm or result card is open.
- **At the stall:** once the haggle is past the greeting, about one of his lines in four opens with ها؟ or با! (با when he is sceptical or leaving), never two running; the clip plays as the line appears.
- **Voice:** `tools/generate-malek-arabic.py` records `public/audio/malek/ar-*.mp3` offline with a stock Piper voice (ar_JO "kareem", from sherpa-onnx's GitHub release; not a clone of anyone), from hand-written Egyptian phonemes, lowered a tone. The model stays out of the repo.
- Test: `tests/malek-arabic.ts` (rules) and `tests/malek-arabic.mjs` (in the browser).

## Putting a rug aside for a buyer (any buyer)

- **Where:** Stock has "Put aside for…" on each rug, listing buyers you have met. The stall's result card also offers "Put the X aside for {name}" when a buyer walks away from a rug they liked.
- **A held rug** (7 days, `RugItem.reservedFor/reservedUntil`):
  - is not laid out for anyone else, and cannot be shown to them (a note says who it is kept for);
  - is laid out first for that buyer, who notices: +10 trust, +8 interest.
- **When the hold ends,** a night note says it is back on the stall. "Free it" in Stock ends a hold early.

## First-meeting films

Six special characters each get a short documentary, with captions and Skip; the Customers screen
keeps a "Films" shelf of the ones you have seen. Each plays by itself the first time; after that it is a "Watch the film again" button where you
meet them (Malek's door, Arran's door and lab, Abu Hamid's table, Rashid's screen). `FILMS_EVERY_ENTRY`
in films.ts can make the place films play on every entry again.

| Who | Plays | Picture |
|---|---|---|
| Malek | his shop, the first time it is open to you | his video (`public/video/malek-intro.mp4`, WebM fallback); after it, the camera closes in on him at his grill, then his portrait |
| Arran | his laboratory, first visit; "Watch the film again" at his door and ▶ Film inside | his video (`public/video/arran-intro.mp4`); after it, the camera closes in on him at his microscope |
| Abu Hamid | the coffee house, first visit | the Giza map closing in on his tables, then his portrait |
| Uncle Rashid | his warehouse, first visit | the Cairo map, his portrait |
| Nabil al-Khatib | the first time he comes to your stall (his greeting waits for the film) | Cairo, his figure, his portrait |
| Cohen | the first time he comes to your stall | Alexandria, his figure, his portrait |

- **Films:** defined in `src/components/IntroFilm/films.ts`.
- **Narration:**
  - `tools/generate-intro-films.py` records it offline (Kokoro `bf_emma`: a stock synthetic woman's voice, so the narrator never sounds like Arran's `bm_george`; not a clone) into `public/audio/intro/<who>.mp3`, with the caption timings in `src/data/introFilms.ts`.
  - Each film says who the character is and what they do for you.

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

A painted 2.5D room, like Arran's laboratory (`src/components/Malek/MalekRoom2D.tsx`). It replaced
an earlier three.js room, and three.js is no longer a dependency.

- **The painting:** the visit's picture is the room, with Malek painted in (grilling, preparing, serving, or counting coins at closing).
  - It covers the view with a little to spare, so you drag to look across it. It stops at its edges, and a tap never moves it.
  - It opens centred on Malek.
- **Marks on the painting:** Malek (talk), the grill, the menu, the tables (sit and order) and the way out. Tapping one pans to it.
- **Living details:** smoke over a lit grill, lamp glow (stronger at closing), and the rug you sold him laid on the floor.

## The five-part story, told at his tables (ON: all five scenes supplied)

It happens when you sit down: tap **Sit at a table** in the room (the mark glows while a part is
waiting) and the next part plays, one part per visit, any day, the first visit included. The rules
(`storyStageFor` / `storyComplete`, `malekSit` in the store, tested in `tests/malek-rules.ts` and
`tests/malek-story.mjs`):
- one part per shop visit; sitting again in the same visit just sits (and opens the menu);
- parts go in order; "Not now" keeps that part for the next time you sit, and leaving or reloading
  never skips or repeats one (it stays pending);
- completion, visit and next part are committed together, once, on Continue;
- part 3 is on film (see below); the story never loops after part 5.

All five scenes are supplied (`story-1-expulsion` … `story-5-arthur`), so the story is on. If any
stage loses its art, `storyReady` turns the whole sequence off rather than starting it part way.

- **The customer** in stages 1-3 is Nabil al-Khatib (`STORY_CUSTOMER`, the owner's decision).
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

3. **Optional props:** a grill-front texture, shelf crockery and a menu board, as separate transparent PNGs or tileable textures, to replace the simple shapes.
4. `05-arthur-bell-lore.png` has its caption painted into the image. That is fine as a lore card. A version without the caption band would let the game set the text.

## Preview

`./tools/build-malek-preview.sh` builds a standalone review copy of the shop into `dist-preview/`:
- The source is `preview/` and `vite.preview.config.ts`.
- It is the real shop, store and save, plus test controls: set the hour, next day (the game's own night rollover), add money, reset.
- Published privately at https://claude.ai/artifact/Cei8DU1nGznEJPWwTQWYeS
