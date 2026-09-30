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

## Not done
- A dedicated museum-store or chemist painting: both reuse the library card layout with no art.
- Primary sources for Egyptian explosives or poisons regulation in 1925: not checked, so the game states no offence or penalty for them.
