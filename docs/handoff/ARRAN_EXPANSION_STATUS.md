# Arran lab: live-test fixes and restored expansion — status

Acceptance: `PORT=5173 W=360 H=780 TAG=p360 node tests/arranexpansion.mjs` (also run at 390×844) and
`tests/arranlab.mjs`. Both pass with no page errors, no sideways scroll, and no lab/pass tap target under 44px.

## Live-test fixes
| Item | State |
|---|---|
| Rub vs wash | "Colour transfer rub" (nothing cut) and a separate "Sample wash test" (needs the Knecht; unlocks with dyes). Save v18 rewrites old "fastness" results as rub results with no charge. Cohen's complaint now names the rub, not a wash. |
| Arran in the scene | Transparent pose (`11-lab-inspect` / `12-lab-explain` / mood poses) stands behind the bench in the room's own coordinates, hidden below the bench top, moving to the microscope, dye bench or desk with the work. He is the talk button. The duplicate panel portrait is gone. |
| Errand chip | Derived from quest state: "Arran's book · Alexandria cotton merchants' archive" → "Take the manual to Arran" → gone. Also shown in the lab (Arran's errands only), with the permit letter and cargo chips on the map. |
| Costs before paying | Every paid test and road service opens a confirm card first: cost against your purse, time and finish hour, what is used up (including a cut and the condition change), what it can and cannot tell you. Payment happens in one store action. |
| Phone | 360×780 and 390×844 checked; tabs scroll, buttons ≥44px. |

## Expansion
| Item | State |
|---|---|
| Visit loop | Activities rotate (microscope, books, dye notes, provisions after McCarrison, the linen study when permitted) and match the scene. |
| Provisions | McCarrison (Cairo reading room) → Road tab → assessment: days of food, routes it covers, fatigue. Road diet (30 days) slows fatigue gradually. Daily fatigue: road, rest, hunger. Fatigue lowers buyer patience and trust at the stall. |
| Field safety | Fictional survey folio at St Catherine's (copy only, slow). Walking into the Sinai passes opens a card: escort (+2 days), guide (cost), the longer wadi road (+3 days), or press on, each with time, cost and risk. Resolved once from a seeded roll and stored under the trip key. Uses `16-risky-pass`. |
| Restricted cargo | Six abstract jobs (lamp oil, arak, blasting powder, arsenical sheep-dip, a chemist's cocaine order, laudanum). Class, route, fee, hazard and licensed handler only. No preparation, quantities or use. Arran's check needs the folio; papers need the Port Said ledger. |
| Health and law | Coca wine from a Cairo chemist: alert today, crash tomorrow, dependence with repeated use. Laudanum is described as a sedative, never a boost. Patrols at checkpoints judge class, papers, jurisdiction and date (Egypt's narcotics decree-law of 21 March 1925 = day 12). Outcome is seeded and stored once per visit: question, seize, or detain. Legal notes are marked provisional and have sources. |
| Mummy linen | Returning a book gives Arran's letter → deliver it to Hamza Effendi at the Cairo museum store → the study is permitted from the next day. It can be replayed in the notebook. |
| Save | v18: rub findings rewritten, permit stage from old `permitDay`, condition, cargo, crossings and patrols defaults, wash unlocked for anyone with dyes. Requesting a book reveals its library town on the map. |

## Arran's cabinet (Supplies tab; linked from the lab's first screen)
Remedies: iron and quinine tonic (fatigue −15, no crash), khamsin kit (30 days, no season risk in the passes).
Poison: arsenical moth preservative (rugs held are moth-proofed; durability argument counts more).
Powder, licensed: signal rockets (pass risk −8, used once), cartridges through a licensed gunsmith (needs guards; strength +4 in the pass, used once), a Webley revolver with permit (strength +2 everywhere), a blasting charge with a licensed shot-firer (needs the folio; adds "clear the old short road" at the pass). Names, prices, permits and effects only; nothing on making or using them. Every purchase shows cost, effect and the law before paying.

## Not done
- A dedicated museum-store or chemist painting: both reuse the library card layout with no art.
- Primary sources for Egyptian explosives or poisons regulation in 1925: not checked, so the game states no offence or penalty for them.

## Playtest notes (book routes), round 2
| Note | Change |
|---|---|
| 1. Shortcuts simulated arrival | Chips and "Travel to …" open the map with the route planned and a Travel button. A town's own screen opens only where you are (`WorldMap` refuses a remote `openPanel` and plans instead). |
| 2. Route legibility | Notebook errand cards: progress steps, institution and town, opening hours, walking and rail time from where you are, food for the round trip with a buy button, copy price and time, what it unlocks, one "Next:" line. Copies you carry are listed in Stock under Papers. Only one chip shows at a time, with "+N more"; the lab has no chips. |
| 3. Opening hours | A closed library shows "Wait until 08:00 · 1 h" (or "Rest until 08:00 tomorrow"), with the time it costs. |
| 4. Travel readiness | The errand card compares food with the round trip using the map's own walking estimate, warns if that much food would overload you on foot, and sells the shortfall. The provisions assessment uses the same estimates. |
| 5. Implementation language | The law section is now "Papers and patrols": what Arran can examine, what a patrol asks for, what happens with and without papers, and how closely you are watched. Provisional legal notes and sources are kept in code and docs, not shown. |
| 6. Lab entrance | The linen study never opens by itself; a "New case file" button waits under the room. |
| 7. Scene matches task | The line under the room and Arran's place and pose follow the tab: desk for the notebook, cabinet for supplies, board for the board, bench for tests. |
| 8. New branches | `tests/arranroutes.mjs` walks the real map: Giza → the Sinai narrows → St Catherine's (wait for opening, copy, Stock) → back through the narrows → Arran; then Port Said and back. |
| 9. Consequences | The crossing now happens at the narrows, part way along the road, in both directions. The folio lowers the risk of every choice and says so on the card. Patrols give a reason and name the paper that would have changed the outcome, and the lab lists the patrols you have met. |
