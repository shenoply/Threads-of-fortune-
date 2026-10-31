# Screenshots plan

Steam asks for at least five screenshots, at least 1920 × 1080 and 16:9
([Store Graphical Assets](https://partner.steamgames.com/doc/store/assets)); the first four or five show
beside the trailer at the top of the page and in the hover preview, so they carry the most weight. Plan:
ten, in this order. They must be real gameplay (no mock-ups, no text laid over them), and nothing
shown may be missing from the build that ships.

Captured with `tools/steam-shots.mjs` (stages each state with the tester's sheet and the tester hook,
writes JPEGs under 1 MB) into `docs/steam/shots/`, with the PC layout in (commit 5e02f9d). Re-run it after
any change to these screens:

```
npx vite --port 5196
PORT=5196 node --import ./tests/_nohmr.mjs tools/steam-shots.mjs            # all
PORT=5196 node --import ./tests/_nohmr.mjs tools/steam-shots.mjs 03 07      # only some
```

## The ten

| Order | Shot | Screen and state | File now | State with the PC layout |
|---|---|---|---|---|
| 1 | **The stall, a buyer at the counter** | Day one, Samira at the counter, her line about her receiving room, the rugs in the strip | `02-stall-buyer.jpg` | Good: the scene beside the talk so far. Drop the "Skip the lesson" chip (play past the lesson first). |
| 2 | **Haggling** | The price dial with an asking price set, a rug on the counter | `03-haggle.jpg` | Good: the price strip under the talk. Same chip to lose. |
| 3 | **The road fight** | "Even odds" from the tester's sheet: the robbers' card, both sides' strength, the choices | `07-road-fight.jpg` | Fine, but the choices stay a centred column. Better: press "Lead the fight" and capture the battle field mid-fight. |
| 4 | **The world map, a journey planned** | Giza, Alexandria selected, train and walking options | `05-world-map.jpg` | Good: full-width map, trip panel at the right. Hide the objective bar for the shot. |
| 5 | **Cairo from above** | Arriving in Cairo: the town painting and its menu | `06-town-cairo.jpg` | Fine as it is (full-width painting). |
| 6 | **Uncle Rashid** | His warehouse page: today's stock, your father's debt, the sealed bale | `08-rashid.jpg` | Usable; text-heavy. His first-meeting film (one frame with its caption) is the prettier alternative. |
| 7 | **Giza district** | The district map with its places marked (stall, coffee house, Rashid, guard yard) | `04-giza-district.jpg` | Good: full-width district painting. |
| 8 | **Bilgin's coffee house** | The café room from above, the tables, Bilgin | `11-coffee-house.jpg` | The room is a portrait painting with blurred side fill: acceptable; better with Bilgin's talk open beside it. |
| 9 | **A story** | The Mamluk carpet story's first letter, with its three choices (tester's sheet: Stories, Begin) | `09-story.jpg` | Weak: the Stories list is text on a wide dark page and reads small. Replace with the story's letter opened full size if a reader view exists, or drop it for a spare. |
| 10 | **Persia** | Kermanshah, the first town over the Zagros (tester's sheet: Persia) | `12-persia.jpg` | Fine (full-width painting). |

Spares, captured too:

- `01-title.jpg`: the title screen. Not for the store (it shows buttons and a menu); keep for press kits.
- `10-knot-count.jpg`: the knot count at Arran's bench, before the clock starts (the weave is blurred until then). Weak as it stands: re-capture after pressing "Start the clock".

## Still to capture (better than some of the above once the layout allows)

- The inspector: a fine carpet zoomed to the weave (Stock → a rug → Inspect).
- The stall dressed and upgraded to the canopy or the shop in the Khan (tester's sheet: Stall dressing).
- The newspaper (the Egyptian Gazette front page of the day).
- An evening at a cabaret in Cairo (tester's sheet or the evening in Cairo with money): shows the cabaret contacts.
- The rival houses' table for Cairo (tester's sheet: City tables).
- The family: married, a child (tester's sheet: Family).

## Rules for every shot

- 1920 × 1080, 16:9, PNG or JPEG. Keep files under 1 MB each here; Steam accepts larger, but the repository should not grow.
- No tester buttons, no debug text, no "Skip the lesson" chip if it can be avoided (finish or skip the lesson first; it is in shot 1 now).
- The interface as a player sees it: no zoomed browser, no developer tools, no cursor.
- Money and dates believable for the moment shown (the staging gives £400 and reputation 14 after day one).
- Pick moments where the painting is the largest thing on screen; the store shows them small.
- Demo page: Steam asks a separate demo page for at least five demo-specific screenshots
  ([Steamworks, Demos](https://partner.steamgames.com/doc/store/application/demos)). Use 1, 2, 3, 4, 7 above: all are inside the demo.
