# Screenshots plan

Steam asks for at least five screenshots, at least 1920 × 1080 and 16:9
([Store Graphical Assets](https://partner.steamgames.com/doc/store/assets)); the first four or five show
beside the trailer at the top of the page and in the hover preview, so they carry the most weight. Plan:
ten, in this order. They must be real gameplay (no mock-ups, no text laid over them), and nothing
shown may be missing from the build that ships.

Captured now with `tools/steam-shots.mjs` (stages each state with the tester's sheet and the tester hook,
writes JPEGs under 1 MB): `docs/steam/shots/`. Re-run it once the PC layout lands:

```
npx vite --port 5196
PORT=5196 node --import ./tests/_nohmr.mjs tools/steam-shots.mjs            # all
PORT=5196 node --import ./tests/_nohmr.mjs tools/steam-shots.mjs 03 07      # only some
```

## The ten

| Order | Shot | Screen and state | File now | Needs the wide layout? |
|---|---|---|---|---|
| 1 | **The stall, a buyer at the counter** | Day one, Samira at the counter, her line about her receiving room, the rugs in the strip | `02-stall-buyer.jpg` | **Yes.** The scene and the panel sit in a centred phone column with dark side bars. |
| 2 | **Haggling** | The price dial with an asking price set, a rug on the counter | `03-haggle.jpg` | **Yes**, as 1. |
| 3 | **The road fight** | "Even odds" from the tester's sheet: the robbers' card, both sides' strength, the choices | `07-road-fight.jpg` | Mostly fine: full-width background, centred column of choices. Better with the battle field itself (press "Lead the fight" and capture mid-fight). |
| 4 | **The world map, a journey planned** | Giza, Alexandria selected, train and walking options | `05-world-map.jpg` | **Yes.** The map is framed in a column; the wide layout should give it the full screen. Hide the objective bar for the shot. |
| 5 | **Cairo from above** | Arriving in Cairo: the town painting and its menu | `06-town-cairo.jpg` | Fine as it is (full-width painting). |
| 6 | **Uncle Rashid** | Rashid's first-meeting film, with its caption | `08-rashid.jpg` | Fine. It is a film still: for a gameplay shot, capture his warehouse page after the film instead (stock, his credit, your father's debt). |
| 7 | **Giza district** | The district map with its places marked (stall, coffee house, Rashid, guard yard) | `04-giza-district.jpg` | **Yes**, as 4. |
| 8 | **Bilgin's coffee house** | The café room from above, the tables, Bilgin | `11-coffee-house.jpg` | Partly: the room is a portrait painting with blurred side fill. Fine on Steam; better if the wide layout puts the talk panel beside it. |
| 9 | **A story** | The Mamluk carpet story's first letter, with its three choices (tester's sheet: Stories, Begin) | `09-story.jpg` | **Yes.** Narrow column of text on a wide screen; reads small. |
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
