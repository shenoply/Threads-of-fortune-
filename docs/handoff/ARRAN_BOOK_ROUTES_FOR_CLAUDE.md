# Arran's books, field chemistry, and dangerous routes — Claude handoff

Read `ARRAN_LAB_FOR_CLAUDE.md` first. Integrate this extension into the existing Threads of Fortune repository. The game begins on **10 March 1925**. Inspect actual map route IDs, travel action, inventory, health, combat, calendar, and zustand migration before adapting the code below. Do not silently replace existing systems.

## New art (in the same Arran Drive folder)

| File | Dimensions | Use |
| --- | --- | --- |
| `14-cairo-library.png` | 1536×1024 | Cairo research library location; fictionally composed, not an identified historical institution. |
| `15-open-reference-book.png` | 1536×1024 | Blank two-page reader; render all verified titles, diagrams, formulae and copy in DOM. |
| `16-risky-pass.png` | 1024×1536 | Portrait dangerous-route encounter; may be reused for a pass only if geographically appropriate. |

Do not put tiny interactive targets on the art. Show legible book/route cards below the scene on mobile. The books and the lab scene are separate views; returning an acquired book to Arran is an explicit quest step.

## Historical and editorial rules

Arran is a textile chemist with awareness of British controls and a willingness to take risks in Egypt. He can identify, source, or arrange restricted items in a *fictional game story*. His actions can cause investigation, seizure, arrest, loss of trust, or injuries. Do not portray him as a licensed physician, pharmacist, or military engineer unless the story establishes that role.

The Egyptian game start predates the **21 March 1925 Egyptian narcotics law**; an Egyptian Court of Cassation record identifies the decree-law on trade and use of narcotics as dated that day, and a 1928 U.S. diplomatic document confirms it. The actual start of enforcement, substances/schedules and application to foreigners should be checked against the full decree before exact crime/punishment text is written. For gameplay, set the *provisional* `egyptNarcoticsControlsFromDay` by the game's date helper and keep legal text reviewable in data. Never claim that the prior ten days were unrestricted: other rules, local authority, and customs could matter. The UK Dangerous Drugs Act 1920 already names cocaine and diamorphine, so Arran's English warning is appropriate.

Safe book pages may show exact simple chemistry and materials, e.g. optical microscope + loose wool/cotton thread; `CaCO₃ + 2H⁺ → Ca²⁺ + CO₂ + H₂O` as a **general carbonate demonstration on a separate mineral sample**; cellulose repeat unit `(C₆H₁₀O₅)ₙ`; and `4Fe + 3O₂ → 2Fe₂O₃` as a simplified corrosion equation. Chemistry text must describe limitations and never imply a definitive rug date. Reference books are historically attested or explicitly fictional facsimiles. Avoid modern vitamin synthesis and penicillin (not a 1925 medicine).

Dangerous categories—explosive charges, gunpowder, poison, controlled narcotics—may have period context, supply records, fictional permissions and abstract game effects, **without** ingredients, proportions, processing, quantities, assembly, detonation, dosing, or specific concealment methods. The reader says that the operational leaf is missing, restricted, or withheld. No player-facing recipe or chemistry equation for these categories. Never make heroin a speed boost; it is an opioid. A stimulant may give short alertness with delayed fatigue, impaired judgment and health/dependence risk. Vitamins and food address deficiency gradually, not instantly.

## Loop

1. Arran asks for a named volume or archive folio and points to a real game destination, with a clue explaining *where to ask*.
2. Player chooses route. Existing route edges set days and speed; risk follows the route and cargo. No teleports.
3. At the library, use the catalogue or librarian conversation. Borrow, request a copy, buy a deaccessioned copy, or receive a documented reproduction. Do not let the player walk away with a library-owned original as if it were theirs.
4. A dangerous route presents a contextual choice: wait for escort, take a longer safe road, pay a guide, proceed cautiously, or fight if ambushed. Weather, fatigue, guards, and cargo affect outcomes.
5. Player returns book/copy to Arran. He adds it to the lab notebook and unlocks a *service* or *story route*, not a generic potion recipe. Return dialogue marks the quest complete and persists it.
6. Restricted work creates a provenance/legal record. Patrols at road, port, or stall can inspect based on reasonable game triggers. The detection roll is done at encounter time, never predetermined as a hidden punishment. Outcomes must be visible, appealable or negotiable where the game's systems allow.

## Initial quest data — adapt destination IDs to actual map

| Quest | Historical book / fiction label | Destination and difficulty | Unlock |
| --- | --- | --- | --- |
| `fibres` | J. Merritt Matthews, *Laboratory Manual of Dyeing and Textile Chemistry* (1909) | Cairo library, ordinary road | Fibre inspection, material evidence and uncertainty note. |
| `dyes` | Textile dyeing reference from a catalogued 1925-or-earlier collection; verify edition before naming | Alexandria library/merchant archive, port route | Dye comparison and colourfastness service. |
| `provisions` | Early nutrition/vitamin pamphlet, edition to verify | Cairo or Alexandria medical library, ordinary route | Provisions assessment; cod-liver-oil/vitamin context and sensible food. |
| `field_safety` | Fictional period field-safety folio (label it as such) | Remote railway or quarry archive via dangerous pass | Identify unstable cargo; licensed specialist obstacle quest and route safety options. |
| `restricted_records` | Fictional administrative ledger of controlled supplies | Port archive reached via high-inspection route | Investigation branch, paperwork and character conflict; no manufacturing unlock. |

The final two are story unlocks, not tutorial books for explosives or drugs. Do not imply a specific real library held a listed copy without a catalogue record. The book art is intentionally blank so exact verified bibliographic text is rendered in code.

## TypeScript data and pure mechanics scaffold

Put this in a new feature module and map it to the existing store. It deliberately accepts game state interfaces instead of inventing the project's actual zustand shape. `dayOf(21, 3, 1925)` is pseudocode until you inspect the game's date-helper signature.

```ts
export type BookId = 'fibres'|'dyes'|'provisions'|'field_safety'|'restricted_records';
export type LabService = 'fibre'|'dye'|'provisions'|'cargo_safety'|'records_inquiry';
export type CargoClass = 'ordinary'|'medical_controlled'|'restricted_material';
export type QuestPhase = 'unknown'|'requested'|'located'|'copy_acquired'|'returned';
export type LegalStatus = 'ordinary'|'documented'|'restricted'|'unverified';

export interface BookQuest {
  id: BookId; title: string; sourceKind: 'historical'|'fictional';
  destinationHint: string; destinationId: string; difficulty: 'ordinary'|'guarded'|'dangerous';
  unlock: LabService; phase: QuestPhase; acquiredCopyId?: string;
}
export interface FieldRecord {
  id: string; cargoClass: CargoClass; itemId: string; originId: string;
  paperwork: 'none'|'receipt'|'licence'; jurisdiction: string; acquiredDay: number;
}
export interface ArranExpansionState {
  bookQuests: Record<BookId, BookQuest>;
  unlockedServices: LabService[];
  fieldRecords: FieldRecord[];
  patrolAttention: number; // 0..100, a visible trend, not a direct probability
  healthDebt: number; // delayed fatigue/recovery burden
}

export const QUEST_SEEDS: Omit<BookQuest, 'phase'|'acquiredCopyId'>[] = [
  {id:'fibres', title:'Laboratory Manual of Dyeing and Textile Chemistry (1909)',sourceKind:'historical',destinationHint:'Ask at a Cairo research library',destinationId:'ADAPT_CAIRO',difficulty:'ordinary',unlock:'fibre'},
  {id:'dyes',title:'A pre-1925 textile dyeing reference',sourceKind:'historical',destinationHint:'Consult the Alexandria catalogue',destinationId:'ADAPT_ALEXANDRIA',difficulty:'guarded',unlock:'dye'},
  {id:'provisions',title:'A period nutrition pamphlet',sourceKind:'historical',destinationHint:'Ask the medical librarian',destinationId:'ADAPT_CAIRO',difficulty:'ordinary',unlock:'provisions'},
  {id:'field_safety',title:'Field safety folio',sourceKind:'fictional',destinationHint:'Find the quarry archive through the pass',destinationId:'ADAPT_QUARRY',difficulty:'dangerous',unlock:'cargo_safety'},
  {id:'restricted_records',title:'Controlled supply ledger',sourceKind:'fictional',destinationHint:'Seek the port records office',destinationId:'ADAPT_PORT',difficulty:'dangerous',unlock:'records_inquiry'},
];

export function requestBook(s: ArranExpansionState, id: BookId): ArranExpansionState {
  const q=s.bookQuests[id];
  return q.phase==='unknown' ? {...s,bookQuests:{...s.bookQuests,[id]:{...q,phase:'requested'}}} : s;
}
export function locateBook(s: ArranExpansionState,id:BookId,atDestinationId:string): ArranExpansionState {
  const q=s.bookQuests[id];
  if(q.phase!=='requested'||q.destinationId!==atDestinationId) return s;
  return {...s,bookQuests:{...s.bookQuests,[id]:{...q,phase:'located'}}};
}
export function acquireAuthorisedCopy(s:ArranExpansionState,id:BookId,copyId:string):ArranExpansionState {
  const q=s.bookQuests[id];
  if(q.phase!=='located'||!copyId) return s;
  return {...s,bookQuests:{...s.bookQuests,[id]:{...q,phase:'copy_acquired',acquiredCopyId:copyId}}};
}
export function returnBook(s:ArranExpansionState,id:BookId,inventoryCopyIds:readonly string[]):ArranExpansionState {
  const q=s.bookQuests[id];
  if(q.phase!=='copy_acquired'||!q.acquiredCopyId||!inventoryCopyIds.includes(q.acquiredCopyId)) return s;
  return {...s,bookQuests:{...s.bookQuests,[id]:{...q,phase:'returned'}},
    unlockedServices:[...new Set([...s.unlockedServices,q.unlock])]};
}

export type RouteChoice = 'wait_for_escort'|'long_safe_road'|'hire_guide'|'proceed';
export interface RouteContext { danger:number; weather:number; fatigue:number; guards:number; guide:boolean; cargo:CargoClass[]; }
export function routeExposure(c:RouteContext, choice:RouteChoice):number {
  // Abstract relative risk 0..100; existing map determines actual time and distance.
  const cargoRisk=c.cargo.includes('restricted_material')?12:c.cargo.includes('medical_controlled')?6:0;
  const mitigation=choice==='wait_for_escort'?26:choice==='long_safe_road'?20:choice==='hire_guide'?12:0;
  return Math.max(0,Math.min(100,c.danger+c.weather+Math.floor(c.fatigue/2)+cargoRisk-c.guards*5-(c.guide?6:0)-mitigation));
}

export interface LegalContext { placeId:string; day:number; egyptNarcoticsControlsFromDay:number; hasVerifiedLocalRule:boolean; }
export function classifyFieldRecord(r:FieldRecord,c:LegalContext):LegalStatus {
  if(!c.hasVerifiedLocalRule) return 'unverified';
  if(r.cargoClass==='ordinary') return 'ordinary';
  if(r.jurisdiction!=='egypt' || c.day<c.egyptNarcoticsControlsFromDay) return 'unverified';
  return r.paperwork==='licence'?'documented':'restricted';
}

export interface PatrolOutcome { kind:'clear'|'question'|'seize'|'detain'; note:string; }
export function resolvePatrol(status:LegalStatus, attention:number, roll:number):PatrolOutcome {
  // roll supplied by game's seeded encounter RNG in [0,1); never call Math.random in the reducer.
  if(status==='ordinary') return {kind:'clear',note:'The patrol finds ordinary goods.'};
  if(status==='unverified') return {kind:'question',note:'The patrol checks the cargo and records its origin; legal review needed for stronger claims.'};
  if(status==='documented') return {kind:'question',note:'The papers are examined and the caravan is delayed.'};
  const threshold=Math.min(.8,.18+Math.max(0,Math.min(100,attention))*.004);
  if(roll>=threshold) return {kind:'question',note:'The patrol notes the suspicious cargo and raises attention.'};
  return roll<threshold*.25 ? {kind:'detain',note:'The party is held for inquiry.'}
       : {kind:'seize',note:'The cargo is seized pending inquiry.'};
}
```

**Integration rules:** Use existing action/time helpers for travel and library research. Store `copyId` as a real inventory item. On return, remove/mark only that copy after a successful unlock; ensure one transaction so a reload cannot duplicate or lose it. Migrate old saves with initial quest seeds and empty records. Never roll patrols every render; only when a scheduled encounter fires. Make attention and fatigue visible before a dangerous choice. Do not create weapon/explosive/poison recipes or arbitrary combat damage bonuses here; adapt cargo-safety and approved equipment to the existing tactical system after reviewing its balance.

## Page overlay example

```tsx
const SAFE_PAGES = {
  fibres: {heading:'Wool and cotton', equation:'Cotton cellulose: (C₆H₁₀O₅)ₙ', material:'A loose yarn thread and an optical microscope', limit:'Fibre structure cannot date a rug.'},
  mineral: {heading:'Carbonate observation', equation:'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂ + H₂O', material:'A separate mineral specimen', limit:'Never test an antique or rug directly.'},
  restricted: {heading:'Restricted record', equation:'Operational page withheld', material:'Records and permissions only', limit:'Arran will discuss risks and paperwork, not a preparation.'},
} as const;
// Render one entry as semantic HTML over 15-open-reference-book.png; on mobile switch to a readable card below the image.
```

## Claude deliverables and art request

Implement one complete vertical slice first: Arran requests `fibres` → map route to library → librarian catalogue → legitimate copy acquired → return to Arran → fibre service unlocked → reload works. Then add route risk, other books, patrol cases, and delayed health/fatigue. Test start date, 21 March boundary, seeded encounter, failed/duplicate return, inventory loss, narrow phone layout and save migration. Preserve existing travel and combat features. Once the crop and screen layout are inspected, ask the user for the smallest further art batch (likely librarian portrait, catalogue drawer close-up, licensed field specialist portrait, and a neutral patrol inspection scene), giving filename, exact dimensions, no-text areas and transparency requirements. Do not request art already in the Drive folder.

## Source check

- Egyptian Court of Cassation heritage entry for 21 March 1925 decree-law: https://cc.gov.eg/heritage/documents/3659
- U.S. Office of the Historian, 1928 document confirming Egyptian law of 21 March 1925: https://history.state.gov/historicaldocuments/frus1928v02/d745
- UK Dangerous Drugs Act 1920: https://www.legislation.gov.uk/ukpga/Geo5/10-11/46/pdfs/ukpga_19200046_en.pdf
- Science History Institute on period vitamins and cod-liver oil: https://www.sciencehistory.org/stories/magazine/the-man-with-a-fish-on-his-back/

These establish context, not the precise Egyptian schedule or penalties. Obtain the full 1925 Egyptian text before writing item-specific legal dialogue. Verify the exact edition and rights of each digitised book before importing any page image or verbatim passage. The generated background art is original game illustration and is not evidence of a real library interior.
