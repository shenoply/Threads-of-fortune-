# Malek: five separate story events
Status: design/art handoff, not implemented in game.

1. The Expulsion: an adult short-stature buyer quarrels over a bill and is bundled out through the shop doorway. Exaggerated non-graphic slapstick. His stature is not the cause of the dispute. ART PENDING: existing character portrait required for identity consistency.
2. A Paid Grudge: the same buyer hires three adult goons in a nearby alley. Coins pass hands; the shop can be seen beyond. ART PENDING: same reference required.
3. The Back Room Opens: the same orangutan from event 4 emerges from Malek's storeroom and sends the goons sprawling in slapstick chaos; no blood, broken bones or graphic injuries. Malek watches unimpressed. ART PENDING: buyer reference required to keep all cast consistent.
4. Staff Meal: Malek hands the orangutan a grilled-meat flatbread wrap after the commotion. Finished image: 04-orangutan-reward.png. Fictional gag; not an animal-care recommendation.
5. Arthur Bell, the Keeper: an invented London animal keeper escorting animals to Giza Zoo visits his old friend Malek. The orangutan recognises him from the storeroom doorway. Finished image: 05-arthur-bell-lore.png.

Keeper and orangutan backstory are fictional; no historical shipment or actual keeper is being asserted. Giza Zoo had opened in 1891, so a zoo destination fits the 1925 setting. Source: https://sis.gov.eg/en/egypt/tourism/recreational-tourism/giza-zoo/

## Sequence rules for Claude
Persist nextStage (initially 1), lastStoryDay (initially null), completedStages, and an optional pendingEventId.
- On entering Malek's shop, offer nextStage only if lastStoryDay is null or gameDay > lastStoryDay.
- First stage requires the adult buyer encounter to have been introduced. Load his existing actual portrait/sprite; do not substitute a generic character.
- Never play multiple stages on the same game day, including leaving and re-entering, reloading, or closing a dialog.
- Show one event per eligible visit. Normal menu and dialogue remain accessible afterwards.
- Commit completedStages, lastStoryDay and nextStage together when the event is completed/explicitly skipped; persisted state must prevent duplicate progression.
- If dismissed without completion, preserve pendingEventId for resumption rather than advancing silently.
- A player may miss several days: advance one stage on the next visit, not all missed stages.
- After stage 5, restore normal rotating visits and make Arthur an introduced NPC. Do not loop the violence story automatically.
- Do not use an unavailable image path in a live build. Stages 1-3 are not ready for deployment until their art exists.
- User asked for story art only; this handoff does not claim live integration.
