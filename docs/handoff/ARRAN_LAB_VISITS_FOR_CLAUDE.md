# Arran: a working lab on each visit

Read the previous Arran lab and book-route handoffs. The player should find Arran engaged in a legible activity when entering the lab, rather than facing an unchanged room and a static portrait. Use the existing Arran character models and portraits whenever they fit; commissioned wide scenes are special moments. Do not randomly change his face, clothes or scale between scenes.

New asset: `17-arran-mummy-study.png`, 1536×1024. It depicts Arran in a 1920s plain lab coat examining a detached linen fibre from an anonymous, mostly wrapped Egyptian mummy with an Egyptian conservator present. It is a *special research scene* reached by a provenance/permission quest, not a routine random event. It is not Tutankhamun, and Arran is not claiming the role of anatomist. Keep respectful framing and do not permit destructive sampling as a casual interaction.

## Visit staging

| Activity ID | Display | When eligible | Player action |
| --- | --- | --- | --- |
| `microscope` | Existing empty lab plus `11-lab-inspect.png` foreground portrait at microscope | Always | Ask what the fibre reveals. |
| `dye_notes` | Existing lab plus `12-lab-explain.png`, swatches and notebook foreground | Dye service unlocked | Review dye comparisons. |
| `books` | Existing lab plus reading pose; use existing portraits if visually suitable | A book quest is requested or completed | Ask about a volume and where to find it. |
| `balance` | Existing lab with scale in focus and Arran portrait | Metal/antique inspection unlocked | Request an inspection. |
| `provisions` | Existing lab with provisions notes; Arran portrait | Provisions book returned | Discuss caravan food and fatigue. |
| `mummy_linen` | Full `17-arran-mummy-study.png` scene | Special museum/conservator permission flag | Examine detached linen evidence and limitations. |

Use a deterministic schedule: eligible priority is active quest completion or new special scene, then the activity least recently seen. Save `lastArranActivity` and a small visit count. Daily changes only after game time advances, so stepping out and immediately back in does not snap to another activity. A scene may have alternate dialogue based on current inventory or findings; do not require six separate generated pictures before shipping this loop.

```ts
export type ArranActivity = 'microscope'|'dye_notes'|'books'|'balance'|'provisions'|'mummy_linen';
export interface ArranVisitState { day: number; visitCount: number; lastActivity?:ArranActivity; lastActivityDay?:number; returnedBooks:readonly string[]; pendingBook?:string; permittedMummyStudy:boolean; mummyIntroductionSeen:boolean; }
const ARRAN_ORDER:ArranActivity[]=['microscope','books','balance','dye_notes','provisions'];
export function chooseArranActivity(s:ArranVisitState):ArranActivity {
  if(s.lastActivityDay===s.day && s.lastActivity) return s.lastActivity;
  if(s.permittedMummyStudy && !s.mummyIntroductionSeen) return 'mummy_linen';
  if(s.pendingBook && s.lastActivity!=='books') return 'books';
  const eligible=ARRAN_ORDER.filter(a=>a!=='dye_notes'||s.returnedBooks.includes('dyes'))
    .filter(a=>a!=='provisions'||s.returnedBooks.includes('provisions'));
  const previous=eligible.indexOf(s.lastActivity as ArranActivity);
  return eligible[(previous+1)%eligible.length];
}
```

Mark `mummyIntroductionSeen` only when its introductory conversation completes. The scene then becomes replayable from Arran's notebook, while ordinary visits continue to rotate. Adapt the selector to the actual zustand store and save migration. Test repeated entry on the same day, next-day rotation, eligible unlocks, and a completed mummy scene.

Historical note: Oxford's Tutankhamun Spatial Archive records the royal mummy examination in November 1925 by Saleh Bey Hamdi and Douglas Derry; that is a separate historical event. Source: https://tutankhamun.griffith.ox.ac.uk/stories/unwrapping-tutankhamuns-mummified-body-november-1925
