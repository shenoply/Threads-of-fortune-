# Travel, survival and combat: art audit

This answers the art audit in the Travel, Time, Survival and Combat handoff. It was written after
checking the repo on 2026-09-29, and every path below exists in the repo unless it is marked **missing**.

## What is already there

| Area | Files | Verdict |
|---|---|---|
| Painted world map | `public/art/world/travel-map.jpg` (1536×1024), drawn by `src/game/systems/mapRender.ts` | Keep it. It already shows roads, the Delta, the desert, ports and a camel train. Routes, waypoints and the itinerary line can be drawn over it in code. |
| Party marker | `.me-badge` in `WorldMap.tsx`: a 30 px red disc with the SVG camel icon | It works, but it's generic (see item 5). |
| Battlefields | `public/art/battle/battle-{road,nile,pass,oasis,dunes,ford,hills,basalt,ruins,mountain}.webp`, all 1024×1536 portrait, top-down | Keep all ten. **The cover is already painted in:** boulders and a dry stream bed (pass), a ruined wall and a ditch (road), garden walls, palms and a well (oasis), cane fields and one canal bridge (nile). Cover, chokepoints and escape edges can be defined as zones in code over each image, so **no overlays are needed**. |
| Battle tokens | 25 files in `public/art/battle/`, 512×512 transparent top-down: hero, camel (loaded with rugs), horse, 8 bandit man/leader pairs, 8 guard types, fallen-light, fallen-dark | They cover the player, allies and every bandit type. Wounded, fleeing, aiming and facing states can be shown in code (rings, rotation, badges); at 24–34 px on screen, a painted pose change can't be seen. |
| Guard portraits | `public/art/troops/*.jpg` (10 faces plus 4 hiring-yard scenes) | They can serve as companion and guard faces straight away. `guard.jpg` (fez, khaki) works as a road-patrol gendarme, and `reformed.jpg` (veiled rider) as the suspicious traveller. |
| Animal portraits | `public/art/animals/*.jpg`: 4 camels (anafi, bishari, falahi, maghrabi), 4 horses, a donkey and a mule, 560–650×700 | The named camel's card can use the breed portrait. Condition, trust and gear go in the UI, not in new paintings. |
| Map icons (new, unused) | `public/art/drafts/icons/{oasis,provisions,station,port,caravanserai}-96.png` | These are exactly the waypoint icons: water stop, market, rail, sea and inn. |
| SVG icon set | `src/components/Icon.tsx` (camel, anchor, sun, moon, warn, shield, sword, hourglass, bag, coin, …) | The HUD and the wound, fatigue and supply indicators only need a few more hand-drawn SVGs (water skin, bandage, saddle), which is code. |
| Weather | Khamsin zones and a day/night tint already exist in the map code | Weather variants can be done in code (CSS tint and haze). |
| **Bandit leader faces** | `travelThreats1925.ts` points the ambush standoff at `art/travel-threats/*-leader.jpg`, but **that folder is missing** | Every ambush currently falls back to `troops/reformed.jpg`. This is a bug that exists today. |

## Ranked list: the smallest useful batch

"Slice" means it's needed for the Cairo → Alexandria vertical slice.

| # | Asset and purpose | Where it appears | Existing asset | Work | Size, orientation, transparency | Alignment rules | Priority |
|---|---|---|---|---|---|---|---|
| 1 | **Camel with a rug cut loose** (encounter A: thieves have cut one bale free) | Battle, on the camel token | `battle/camel.webp` | **Edit** of the existing token | 512×512, top-down, head up, transparent PNG → WebP | Same camel, pose, scale and position as `camel.webp` so it swaps in place | Slice |
| 2 | **Camel with no cargo** (all rugs taken or dropped to run) | Battle; after-battle summary | `battle/camel.webp` | **Edit** | Same as 1 | Same as 1 | Slice |
| 3 | **Rug bale on the ground**: a rolled, roped carpet as a cargo objective that can be dropped, carried or recovered | Battle, as its own token; code can also lay it over a thief token to show "carrying" | none | **New** | 512×512, top-down, transparent; bale about 60% of the canvas along a diagonal | Drawn at the same scale as the bales on `camel.webp`; light from the upper left like the other tokens; no shadow | Slice |
| 4 | **Egyptian highway robber leader**, chest-up portrait | Ambush standoff (`Ambush.tsx`, `.amb-face`) | **missing** (currently falls back to `reformed.jpg`) | **New** | 640×640 square JPG, no transparency | Match `troops/*.jpg`: chest-up, three-quarter view, painted, warm light, softly painted setting behind | Slice |
| 5 | **Party on the road**, map marker: the hero leading one loaded camel | World map; replaces the SVG badge and follows the route | `.me-badge` SVG | **New** (2 frames) | 192×128 each, side view facing right (code mirrors it for leftward travel), transparent PNG | Painted like the small camel train already on `travel-map.jpg` (loose painterly strokes, dark outline, warm tones); readable at 48–64 px; frame 2 is the mid-stride step so code can alternate the two | Slice |
| 6 | **Night camp**: the camp decision screen | Event card during travel | none | **New** | 1536×1024 WebP, landscape; keep the camp in the central 60% so a phone crop keeps it | Painted like the city and yard scenes (`troops/yard-*.jpg`); space at the bottom for choice buttons | Slice |
| 7 | **Cold camp**, the same scene with no fire (hiding from raiders / no fuel) | Same card, second state | item 6 | **Edit** of 6 | Same as 6 | Identical framing to 6 so the two can crossfade | Slice (cheap) |
| 8 | Four more bandit leader portraits: Sinai raiders, Palestine road thieves, Syria 1925 rebels, Iraq border smugglers | Ambush standoff | **missing** | New | Same as 4 | Same as 4 | Later routes |
| 9 | Party marker, riding (hero mounted on the camel) | World map when riding | item 5 | New (2 frames) | Same as 5 | Same as 5 | Later |
| 10 | Donkey and mule battle tokens | Battle, for parties without a camel | `animals/baladi_d.jpg`, `cyprus_mule.jpg` (side portraits, no token) | New | Same as 1 | Same as 1 | Later |
| 11 | Three named companions, chest-up portraits with a personal story | Hiring and road events | `troops/*.jpg` stand in until then | New | Same as 4 | Same as 4 | Later |
| 12 | Rail and sea crossing frames for Cairo → Alexandria by train, like the voyage frames | The travel transition | `drafts/voyage-*.webp` (sea only) | New (3 frames) | about 720×724 each, like the voyage frames | Same style and crop rules as the voyage frames | Optional polish |
| 13 | Broken-saddle close-up for the road event | Event card | none | New | 1024×683 | Same style as 6 | Optional polish |
| 14 | Damaged rug (slashed, stained) for the inventory after a fight | Inventory and rug viewer | `rugs/*` | Edit, or a code overlay | Matches the rug images | Optional; a code overlay (tear decal) probably does | Optional polish |

### Assessment of the items the brief asked about

- **Persistent camel and rider/handler presentation:** yes, item 5 only. The HUD card uses the breed portrait already in the repo.
- **Camp states:** yes, one scene plus a no-fire edit (items 6 and 7). The other outcomes, such as a guard on watch or a theft in the night, are text on the same picture.
- **Route terrain backgrounds and weather variants:** **no.** The painted map shows the terrain. The itinerary can show crops of the ten battlefields as terrain thumbnails, and weather is a CSS grade.
- **Tactical cover and obstacle overlays:** **no.** The cover is painted into the battlefields; it only needs zones in code.
- **Camel and cargo tokens with damaged or stolen states:** yes, items 1–3.
- **Companion and bandit poses:** no new poses. Tokens are too small for a pose to read, so states go in code (fleeing tokens turn and run for the edge; wounded ones get a red ring; the fallen use the existing art). The missing leader faces (items 4 and 8) are the real gap.
- **Wound, fatigue and supply indicators:** code only (SVG icons and meters).
- **Route and waypoint icons:** reuse the unused draft icons (oasis, provisions, station, port, caravanserai) plus the SVG set.

### Three test encounters on existing ground

- **A. Two thieves at dusk:** the `battle-nile` field (cane to hide in, the canal crossable only at the bridge) with a dusk grade in code. Uses the `thief` tokens and new items 1–3.
- **B. A ranged raider and a flanker at a rocky pass:** the `battle-pass` field (boulders as cover, the stream bed as a slow lane). Uses the `raider` and `robber` tokens.
- **C. A larger group:** the `battle-road` field (open ground, one ruined wall and a ditch, so riders are strong and fighting is a bad idea). Uses `robber-leader` and 4 `robber` tokens.

---

## Generation prompts

Where a prompt says "attach", attach those repo files as style and scale references.

**Shared style line (put at the end of every prompt):**
> Hand-painted, semi-realistic illustration in warm ochre, umber and faded madder red, like a 1920s travel-book painting; fine brush texture, soft natural light from the upper left, no text, no border, no watermark.

### 1. `battle/camel-cut.webp`: camel with a rug cut loose
Attach `public/art/battle/camel.webp`.
> Edit the attached top-down camel token. Keep the exact same camel, pose, size, position and lighting. Change only the cargo: on the camel's left side the ropes of one rolled carpet bale have been slashed, and that bale hangs down loosely off the flank, half unrolled, with the cut rope ends visible. The other bales stay tied. Viewed directly from above, head toward the top edge. Fully transparent background, no ground and no shadow. 512×512.

### 2. `battle/camel-bare.webp`: camel with no cargo
Attach `public/art/battle/camel.webp`.
> Edit the attached top-down camel token. Keep the exact same camel, pose, size, position and lighting. Remove all the carpets and bundles: show only the wooden pack saddle, a folded striped blanket and loose hanging ropes. Viewed directly from above, head toward the top edge. Fully transparent background, no ground and no shadow. 512×512.

### 3. `battle/bale.webp`: rug bale on the ground
Attach `public/art/battle/camel.webp` (for the bale style and scale) and `public/art/battle/thief.webp` (for the token scale).
> A single rolled Anatolian carpet bale tied with two hemp ropes, red and indigo pattern visible on the roll ends, lying on its side, viewed directly from above, placed diagonally from lower left to upper right and filling about 60% of the frame. Same painting style and scale as the bales strapped to the reference camel. Fully transparent background, no ground and no shadow. 512×512.

### 4. `travel-threats/egypt-rural-highway-robbers-leader.jpg`
Attach `public/art/troops/watchman.jpg` and `public/art/troops/reformed.jpg` (for framing).
> Chest-up portrait, three-quarter view, of an Egyptian rural highway robber chief in 1925: a lean man in his forties, weathered face, thick moustache and short grey stubble, a brown wool scarf wrapped as a turban, a dark galabiya with a sheepskin vest, cartridge belt across the chest, an old Martini rifle held upright. Calm, appraising expression, a man who prefers a toll to a fight. Behind him, softly painted: Nile Delta sugar-cane and an irrigation canal at dusk. Framing and style matching the reference portraits. Square, 640×640.

### 5. `world/party-walk-1.png`, `world/party-walk-2.png`: party marker
Attach a crop of `public/art/world/travel-map.jpg` around the camel train east of the Nile, plus `public/art/battle/camel.webp`.
> A tiny map figure in the same painterly style as the camel train drawn on the attached map: a rug merchant in a dark suit and fez on foot, leading one camel by a rope, the camel loaded with rolled red carpets. Side view, walking to the right, figures filling the frame's height, crisp dark outline so it reads at 48 px. Fully transparent background, no ground. 192×128. Make two frames: frame 1 with the left legs forward, frame 2 mid-stride with the right legs forward. Everything else identical.

### 6. `events/camp-night.webp`: night camp
Attach `public/art/troops/yard-caravanserai.jpg` (style) and `public/art/animals/bishari.jpg` (the camel).
> A small night camp beside a desert track in the Nile Delta fringe in 1925: one couched camel with its load of rolled carpets set down beside it, a small crackling fire of tamarisk twigs, a brass coffee pot in the embers, a bedroll, a hurricane lamp hanging from a staff, one stunted acacia. Deep blue night sky with stars; warm firelight on the camel and the rugs; distant dark palms at the horizon. No people's faces visible (a figure can be seen from behind at most). The camp sits in the centre, with open, dark sand across the bottom quarter. Landscape, 1536×1024.

### 7. `events/camp-cold.webp`: cold camp
Attach the output of prompt 6.
> Edit the attached camp scene. Keep every object and the framing identical. The fire is out: only grey ash and one faint ember remain, the lamp is unlit, and the scene is lit only by cold moonlight with the camel a dark silhouette. Landscape, 1536×1024.

### 8. The other four leader portraits (for later routes)
Use the same framing as prompt 4, with one per band. The descriptions are in `src/data/travelThreats1925.ts`: `sinai-transjordan-desert-raiders`, `palestine-road-thieves`, `syria-1925-rebels` and `iraq-border-smuggler-brigands`. Settings: the Sinai at dusk, olive terraces, black basalt, a Euphrates reed bank.

Items 9–14 are later or optional. Write their prompts when those routes are built.
