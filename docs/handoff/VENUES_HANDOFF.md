# Cabarets, music halls and theatres: requirements from the current build

Written against `main` at commit `d865123` (27 Sep 2026), the code that is live at
https://shenoply.github.io/Threads-of-fortune-/. Everything below was read from that code; where the
build does not decide something, it is marked as a decision.

---

## 1. The build inspected

Threads of Fortune is a Vite + React + TypeScript game with one zustand store. The calendar starts on
**Tuesday 10 March 1925** (day 1) and the radio, news and events are written through **31 March 1926**;
nothing stops the day counter after that, so a venue opening in 1926 is reachable, and one opening in
1940 is not, in any ordinary game.

The player has a stall in Giza, travels a painted map of Egypt and the Levant, enters towns through a
scrolling **town panel** (tabs: Town, Market, Animals, Guards, plus a Royal Court card), can **walk the
streets** on a painted overhead city map with points of interest, and haggles with buyers in a
painted **stall scene** (seller left, buyer right, dialogue band, action buttons). Royal palaces are
the closest existing thing to a venue: a card on the town panel with an exterior painting, then
walkable grounds with an audience hall that opens a negotiation.

### The relevant files (all paths from the repo root)

| Concern | Files |
|---|---|
| Calendar, time, dates | `src/game/economy/life.ts` (`dateOfDay`, `dayOf(m, d, y)`, dated `EVENTS`), `src/game/economy/economy.ts:73`, `src/game/radio/bulletin.ts:16` (`GAME_FIRST`/`GAME_LAST`). The store holds `day` (integer from 1) and `world.hour`; `nextVisit`/travel advance them. |
| Save / load | `src/game/state/store.ts`: zustand `persist` under the key `threads-of-fortune-save`, `SAVE_VERSION = 13` (line 39), `migrate` at line 1817. Saves live in the player's browser localStorage. |
| City travel, map | `src/data/cities.ts` (settlements, `unlock: { sales, reputation, travel }`), `src/game/systems/world.ts` (parties, roads), `src/components/World/WorldMap.tsx`. |
| Town panel | `src/components/World/Settlement.tsx` (tabs, auction-house cards, Walk-the-streets card, People list, Royal Court card at line 163, the leave bar). |
| Walkable places | `src/data/venues.ts` (`Venue`, `VenuePoi`, palace grounds, `VENUE_W/H = 1448 × 1086`), `src/data/cityWalks.ts` (city street maps, same canvas), `src/data/auctionVenues.ts` (auction houses), `src/components/World/Venue.tsx` (renders any `Venue`: fog of war, walking, POI list, doors). |
| Dialogue with townspeople | `src/data/world.ts` (`Npc`, `DialogueNode`, `DialogueOption` with `effects`/`requires`), `src/components/World/Dialogue.tsx`, `src/components/World/Portrait.tsx`. Portraits: `public/art/portraits/<id>.jpg` (512 × 512 round crop) with a drawn cameo fallback from `src/data/people.ts`. |
| Buyers and haggling | `src/data/buyers*.ts`, `src/data/celebs1-4.ts` (real 1920s figures as buyers, including Umm Kulthum, Munira al-Mahdiyya, Mohamed Abdel Wahab), `src/game/systems/negotiation.ts`, `src/components/StallEncounter/*`. |
| Money, purchases, ownership | `src/game/state/store.ts` (`cash`, `ledger`, `reputation`, `upgrades`), `src/data/suppliers.ts` (`UPGRADES`: tea, ledger, display pole, mat £300, bazaar stall £1,200, Khan shop £60,000 with reputation gates and `after:` chains). There is **no** investment or share system yet; upgrades are the only ownership model. |
| Quests and jobs | `src/data/jobs.ts` (`Job`: giver, target town, need, reward), `world.quests` in the store (states `active`/`ready`/done via dialogue effects `quest:id`, `questdone:id`). |
| Preloading art | `src/game/preload.ts` (`preload(srcs, soon)`, idle-time image warming). |

Nothing needed for this feature is missing from the repo. Voices are recorded MP3 sprites per
character (`public/voices/<id>.mp3` + `manifest.json`); new venue contacts will speak through
captions until lines are recorded, exactly as new townspeople do today.

---

## 2. Proposed venue list and calendar settings

Availability is decided by the **saved in-game day** converted to a date with `dateOfDay(day)`.
"Available at start" means unlocked from day 1; it is not a founding claim and the interface must
not print one.

| id | Name (interface title) | City | Opening year shown | Availability | Status |
|---|---|---|---|---|---|
| `alhambra-cairo` | Alhambra Casino | Cairo (Ezbekiyya, Bab al-Bahri St) | none (founding year unverified) | from start | confirmed for 1925 |
| `sala-santi` | Sala Santi | Cairo (Ezbekiyya Gardens) | none | from start | confirmed for 1925; music hall, no dance-cabaret programme claimed |
| `maxim-istanbul` | The Nightingale | Istanbul (Taksim, Sıraselviler Caddesi) | "Since 1921" | from start, once Istanbul is unlocked (Istanbul needs 50 sales, reputation and travel: `src/data/cities.ts:18`) | confirmed |
| `sala-badia` | Sala Nour | Cairo (Emad al-Din St) | "Opens 1926" | locked until 1 Jan 1926, `dayOf(1, 1, 1926)` = day 298 | confirmed; early sala, singing and acting |
| `sala-badia` seed | The Sala Nour doorway can exist from day 1 as a locked POI reading "Opens 1926" | | | | design choice, recommended |
| `printania` | Printania Theatre | Cairo (Alfi Bey St) | none | **not in the first batch** | unresolved: active theatre, former theatre or landmark. Recommend a walk-map `note` POI ("the old Printania") until settled; no art needed for a note. |
| `casino-opera` | Casino Opera | Cairo/Giza | provisional 1940 | **out of the playable calendar** (game is written to March 1926) | unresolved; do not generate art now |
| `qamar` | The Qamar (fictional; working title) | Cairo (Emad al-Din St, near the others) | none | from start | original; the one the player can invest in |

Recommendation for the first art batch: **Alhambra, Sala Santi, The Nightingale, Sala Nour, the Qamar**
(five venues). Printania and Casino Opera wait on the research.

---

## 3. Artwork the implemented interface needs

### What the renderer actually uses

- **Town-panel card image** (the Royal Court card, `.court-img`): rendered at the panel width with
  `aspect-ratio: 16 / 8` and `object-fit: cover`, so a **2:1 crop from the centre** is what shows.
  Existing palace exteriors are `1200 × 675` (16:9) and `1200 × 900`; both are cropped to 2:1.
- **Walkable maps** (`Venue.tsx`): fixed canvas **1448 × 1086** (4:3), overhead or high oblique,
  panned and zoomed by the player, fog of war revealed by walking. Every existing city, palace and
  auction house is painted on this canvas.
- **Full-screen scene / point-of-view pictures** (auction-room POV, newspaper): **1536 × 1024** (3:2),
  shown `object-fit: cover`, so on a phone in portrait the sides are cropped and the **middle 45%**
  is what survives. On desktop the whole picture shows.
- **Stall scene** (haggle): two panels, seller left and buyer right, each half of a 3:2 frame; a
  buyer is a **transparent standing figure** (`<id>-stall.webp`, e.g. `655 × 983`, RGBA) laid over the
  lane painting, or a full painting for Samira.
- **Portraits**: `512 × 512` JPEG shown in a circle, face centred, head about 60% of the height.

So the proposed 1536 × 1024 backgrounds are correct **for interiors** and wrong for the two other
slots. The full set per venue is below.

### Asset table

Folder for everything: `public/art/venues/<venue-id>/`. Masters (PNG/JPEG at generation size) go in
`art-src/venues/<venue-id>/` and are not deployed; `tools/battle.py` is the model for a converter
that writes the WebP copies.

| # | Filename | Purpose, screen | Size, ratio | Format | Composition | Crop behaviour | Priority |
|---|---|---|---|---|---|---|---|
| 1 | `exterior.webp` | Town-panel card ("Cabarets & theatres" section, same card as the Royal Court) and the door POI's preview | **1600 × 800 (2:1)**; generate at 1536 × 1024 and we crop, or at 2:1 directly | WebP from JPEG, no transparency | Street level, evening. The **entrance and its sign in the middle third**; top 15% and bottom 15% may be lost. No text on the sign (the title is set in the interface). Leave the lower-right quarter free of important detail: the padlock/"Opens 1926" badge sits there. | Card is full width on phone and desktop; only height differs. | 1 |
| 2 | `interior.webp` | The room, empty: shown when you arrive, and behind the contact's dialogue | **1536 × 1024 (3:2)** | WebP from JPEG | Eye level from the back of the room. **Stage centred**, tables either side, the **contact's spot** (bar, office door or table) in the **right third**, floor in the bottom third (rugs will matter: the player sells them here). Keep the **middle 45% of the width** self-sufficient: that is all a phone shows. Nobody in the room. | Phone: sides cropped. Desktop: full. | 1 |
| 3 | `show.webp` | Performance night, same room: cross-faded over #2 when the player takes a seat | **1536 × 1024**, identical framing to #2 | WebP from JPEG | Same viewpoint as #2 with the house lit, a performer on the stage, an audience at the tables. Generate it as a **full picture**, not a layer: the implementation fades between #2 and #3 and never subtracts one from the other. Small drift between the two is acceptable at the edges; the stage and the contact's spot must stay in the same place. | as #2 | 1 |
| 4 | `<contact-id>.jpg` in `public/art/portraits/` | Round portrait in dialogue, People list, journal | **512 × 512** | JPEG (no transparency; the circle is cut by CSS) | Head and shoulders, face centred, eyes at 45% height, painted like the existing portraits | none | 1 |
| 5 | `<contact-id>-stall.webp` in `public/art/portraits/` | Only if the contact also comes to the stall as a buyer | ~**655 × 983** standing figure | WebP **with true transparency** | Full standing figure facing left toward the seller, feet at the bottom edge, nothing behind them | none | 2 |
| 6 | `grounds.webp` | Walkable interior map, only if a venue gets more than one room | **1448 × 1086** | WebP | Overhead plan like `art/auction/venues/*-map.webp` | pan/zoom | 3, not in the first batch |

Per venue in batch one: **#1, #2, #3 and one #4** (four images). #5 only for the Qamar's proprietor,
who should turn up at the stall as a buyer. #6 is not needed for the first implementation: the venue
is a single room reached from the town panel, not a walk.

One shared image, not per venue:

| # | Filename | Purpose | Size | Notes |
|---|---|---|---|---|
| 7 | `public/art/venues/closed-door.webp` | Locked venue before its opening year (Sala Nour in 1925): the card and the door | 1600 × 800 | A shuttered Emad al-Din St frontage at dusk, workmen's ladders, no sign lettering. One image serves any locked venue. |

Generation order: Alhambra (#2, #3, #1, #4), then the Qamar (#2, #3, #1, #4, #5), then Sala Nour,
Sala Santi, The Nightingale, then #7.

---

## 4. Reference images for the image-generation chat

Attach these files from the repo (all under `public/art/` unless noted):

| Purpose | File |
|---|---|
| Approved environment painting, the house style | `stall-seller.jpg` (941 × 1010) and `stall-samira-v2.jpg` |
| Approved exterior card painting | `royal/abdeen-exterior.jpg` (the card this feature copies) |
| Approved full-frame interior at 3:2 | `auction/pov/alexandria-grand-pov.webp` and `newspaper-pov.jpg` (1024 × 1536, for the same painterly finish) |
| Approved overhead map (only if #6 is ever made) | `auction/venues/cairo-grand-map.webp` |
| Approved portraits | `portraits/samira.jpg`, `portraits/umm-kulthum.jpg`, `portraits/rashid.jpg` |
| Approved transparent stall figure | `portraits/antonios-stall.webp` (655 × 983 RGBA) |
| Screenshot: stall haggle layout (dialogue band and buttons) | `docs/handoff/ref-screen-stall-haggle.png` |
| Screenshot: town panel with a card and the People list | `docs/handoff/ref-screen-town-panel.png`, `docs/handoff/ref-screen-palace-card.png` |
| Screenshot: dialogue sheet with a round portrait | `docs/handoff/ref-screen-dialogue.png` |
| Screenshot: a walkable map (only for #6) | `docs/handoff/ref-screen-palace-grounds.png`, `docs/handoff/ref-screen-city-walk.png` |

Do not attach any photograph, poster or recording of the real venues or performers; the paintings are
imaginative reconstructions and the prompts should say so.

---

## 5. Integration approach

### Data

New file `src/data/entertainment.ts`:

```ts
export interface Venue1925 {
  id: string;
  city: string;                 // settlement id: 'cairo' | 'istanbul'
  name: string;                 // interface title
  kind: 'cabaret' | 'music hall' | 'theatre';
  street: string;
  opens?: { day: number; label: string };   // absent = available from the start; label e.g. 'Opens 1926'
  since?: string;               // 'Since 1921' for a verified earlier founding; never invented
  history: string;              // one paragraph for the card
  contact: string;              // npc id in NPCS
  ticket: number;               // piastres, shown on the button
  art: { exterior: string; interior: string; show: string };
  performers: string[];         // celeb buyer ids who may be on the bill, e.g. 'umm-kulthum'
  investable?: { cost: number; rep: number; after?: string };   // only the Qamar
}
```

Sala Nour: `opens: { day: dayOf(1, 1, 1926), label: 'Opens 1926' }`. Alhambra and Sala Santi: no
`opens`, no `since`. The Nightingale: `since: 'Since 1921'`.

### Calendar locks

- Source of truth is `day` in the store, already persisted. A venue is open when
  `!v.opens || day >= v.opens.day`. Nothing about locks is written to the save, so it survives
  load, migration and any future re-dating without a save-version bump.
- **On the town panel** a new section "Cabarets and theatres" lists every venue in that city,
  including locked ones: a locked card uses `closed-door.webp`, a padlock, the `opens.label` badge,
  a disabled "Enter" button and the history text. The moment `day` passes `opens.day` the same card
  shows `exterior.webp` and an enabled button; no event or flag is needed.
- **On the street map** each venue is a `goto` POI (`action: 'venue:<id>'`) added to
  `CITY_WALKS[city].pois`. `Venue.tsx` already supports `goto`; a small addition renders a padlock on
  a POI whose venue is not yet open and turns the tap into a note ("Shuttered. A sign says it opens in
  1926.") instead of an action.
- **City before year**: a venue is only reachable through its city, so the city's own unlock
  (`cities.ts`, sales/reputation/travel) applies first; the year applies second. The Nightingale needs Istanbul
  unlocked (a mid-game milestone) but no year.
- **Tickets and ownership** are separate from the year: the ticket price is on the Enter button and
  is checked against `cash` on entry; investing is an upgrade-style purchase gated by `cash`,
  `reputation` and, for the Qamar, having sold it at least one rug (`world.quests['qamar-first-rug']`).
- All labels ("Opens 1926", "Since 1921", padlock, title, price, buttons) are interface text in
  `entertainment.ts` and the component, never painted into the art.

### Screens

New component `src/components/World/Cabaret.tsx`, opened from the town panel card or the street POI
through `Settlement.tsx` (the same `venue-overlay` mechanism the palaces use):

1. **Arrival**: `interior.webp` full-frame, the venue title, the contact standing at their spot
   (portrait cameo, as the People list does), three doors: *Take a table* (ticket), *Speak to
   <contact>*, *Leave*.
2. **Performance**: cross-fade to `show.webp` over 1.5 s, a short narrated caption naming the
   performer on the bill tonight (drawn from `performers`, weighted by the date), one or two
   overheard lines, time advances 2 hours, and a chance (see §6) that a buyer sits at the next table.
3. **Contact dialogue**: the existing `Dialogue.tsx` with a new `Npc` in `NPCS`; no new UI.
4. **A buyer met here** opens the normal stall negotiation (`StallEncounter`) with `enc.venue` set,
   exactly as a royal audience does, but over `interior.webp` instead of the palace.

### Save

No new persisted shape is needed for locks or visits: `world.quests` and `journal` already persist
and cover contracts and first visits. Ownership adds one string to `upgrades` (`'qamar'`), which is
already persisted. So `SAVE_VERSION` stays at 13.

---

## 6. What the player does there (first implementation)

| Action | Supported by | Needs adding |
|---|---|---|
| Visit and watch a performance | town panel card, `venue-overlay`, time advance in the store | `Cabaret.tsx`, the fade, captions; ticket deducted through the existing `cash` |
| Speak with the contact | `Dialogue.tsx`, `NPCS`, `Portrait` | one `Npc` per venue (5 dialogue trees), portraits |
| Carpet or furnishing contracts | `Job` in `jobs.ts` (giver, target, need, reward) and `quest:`/`questdone:` dialogue effects | jobs with `target` = the venue's city and `need.packedTier`, e.g. *runner for the Alhambra's stairs* (tier 2, pays 1.5×), *foyer carpet for Sala Nour's opening* (tier 3, appears in Dec 1925, pays 2× and +rep, only completable from 1926) |
| Meet customers | the buyer queue (`queue`, `visitIdx`) and `celebs*.ts` | after a performance, 40% chance the store pushes a buyer to the front of tomorrow's queue with a journal line ("You met X at the Alhambra; they will call at the stall"); performers who are already buyers (Umm Kulthum at Sala Santi, Munira al-Mahdiyya) reuse their existing portraits and lines |
| Return later | `world.quests`, `journal`, `day` | a per-venue `lastVisit` in `world.quests` keyed `venue-<id>` so the contact's greeting changes and a new contract appears every ~10 days |
| Invest in the Qamar | `UPGRADES` pattern (`cost`, `rep`, `after`), `upgrades[]` persisted | a "Buy a share of the Qamar" option in the proprietor's dialogue at £2,500 and reputation 25 (between the bazaar stall at £1,200/20 and the Khan shop at £60,000/60); pays a weekly dividend into `cash` through the existing day-end hook, raises the budget of buyers met there by 10%, and unlocks a *Furnish the Qamar* contract chain (three rugs of rising tier) |

Economy fit: the Khan shop at £60,000 is the current end-game purchase, so the Qamar share at
£2,500 slots into the mid game as the first thing that pays the player back rather than costing
rent; dividends should be modest (about £8 a week, so ~6 years to repay, meaning its value is the
buyers it brings, not the cash).

---

## 7. Decisions to settle before generating art

1. **The Qamar's name, proprietor and staff.** Working suggestion: *The Qamar* ("moon"), a
   music hall on Emad al-Din Street run by **Nadia Wahba**, a Syrian-Egyptian former singer, with a
   Greek bar manager and a doorman who is a retired gendarme. Please confirm or replace the names so
   the portrait prompts can be written.
2. **One contact per venue, names needed** for Alhambra, Sala Santi, The Nightingale and Sala Nour (fictional
   staff: a manager, a stage doorkeeper, a bandleader, Madame Nour's front-of-house manager). Real
   performers stay on the bill, never as dialogue contacts, except those already in the game as
   buyers.
3. **Sala Nour before 1926**: seed a locked door from day 1 (recommended, needs `closed-door.webp`)
   or keep it invisible until the year turns (no extra art).
4. **Printania**: note-only until the 1925 newspaper lead is read; confirm.
5. **Casino Opera**: no art now; confirm that 1940 is outside the calendar and it waits for a later
   chapter.
6. **Exterior card ratio**: keep the 2:1 card crop (matches the palaces) or change the card to 3:2 so
   one 1536 × 1024 image serves both card and door. Recommendation: keep 2:1 and generate exteriors
   at 2:1.
7. **Performance captions**: are real performers named on the bill (Naima al-Masriyya at the
   Alhambra, Umm Kulthum at Sala Santi from July 1925) or only fictional ones? Naming them in a
   caption is a statement of the researched fact, not a likeness, and needs no cleared image.
