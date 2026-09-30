# Threads of Fortune — Arran's textile laboratory (1925)

Implement this in the existing Vite/React/TypeScript game. Inspect the current repository before choosing component paths or modifying the zustand save store. The images are in the user's Google Drive **Arran** folder. Copy `13-lab-room.png`, `11-lab-inspect.png`, `12-lab-explain.png`, and the numbered portraits into `public/art/arran/` under matching names. The older `arran-lab-scene.png` is reference art, not a compositable room layer. The original leather-apron portrait is archived and should not be used as his normal costume.

## Historical direction

This is a **textile chemist's working room**, not a fantasy alchemist's den. Arran wears a plain light laboratory coat over a shirt, tie, and waistcoat when testing. He removes the coat outside the lab. The room contains a monocular optical microscope, balance, glass stoppered bottles, porcelain dishes, wool samples, paper envelopes, and a notebook. It has no electronic pH meter, spectrometer, gas chromatograph, plasticware, magical potions, or instant date-testing device. The generated room has a blank slate board; render the equations in HTML so the lettering is exact and responsive. The visible image represents a Cairo/Giza room furnished for Arran, not a documented photograph of a specific institution.

Use the Chemical Society of London or the Royal Institute of Chemistry for period dialogue; the Royal Society of Chemistry name belongs to 1980 onward. His Northumbrian royal ancestry is an unproven family tale. The tower-and-sword art is a fictional personal signet, not certified heraldry.

## Scene and gameplay contract

- 2.5D means painted background, separate Arran portrait and user interface layers, subtle pointer parallax, near/far depth for foreground lighting, and a short focus animation on a selected instrument. It is not free-roaming 3D.
- The lab background is 1536×1024. Put Arran's portrait in the left foreground only after a dialogue starts; never bake him into the room. Keep the board visible.
- On mobile, show one clear scene viewport and a horizontal strip of labelled stations (`Microscope`, `Dye cards`, `Balance`, `Notebook`, `Board`). Selecting a station focuses the scene and opens a card in a dedicated lower panel. Do not add floating popups over the board or controls.
- The board teaches three topics. Its formulae are code-rendered, selectable text. They are not instructions to pour chemicals on a valuable rug.
- Inspection results must derive from actual hidden rug/antique metadata. No random forgery verdict. For missing metadata, return `inconclusive`.
- Charge once per examination, advance time through the game's existing action, then persist a finding keyed by subject ID and service ID. Reopening the finding is free.
- A wool sample needs a loose thread. If cutting is required, explicitly ask first and apply an item condition cost. Never silently consume inventory.
- A weaver performs physical repairs; Arran identifies suitable yarn and risks only.
- Track art/asset licences in the repo. Do not import Royal Society or RSC archive images or recordings merely because they can be viewed online.

## Drop-in scene scaffold — adapt to current store and modal conventions

```tsx
import { useState, type CSSProperties } from 'react';
import './ArranLab.css';

type Station = 'microscope' | 'dye' | 'balance' | 'notebook' | 'board';
type Topic = 'fibre' | 'indigo' | 'mineral';

const STATIONS: Record<Station, { label: string; x: number; y: number; detail: string }> = {
  microscope: { label: 'Microscope', x: 55, y: 43, detail: 'Examine one loose yarn fibre. This can suggest wool, cotton, silk, or a mixture.' },
  dye: { label: 'Dye cards', x: 77, y: 45, detail: 'Compare a small sample with dye observations and colourfastness notes.' },
  balance: { label: 'Balance', x: 67, y: 38, detail: 'Weigh a suitable antique and estimate density, with caveats for plating and hollow objects.' },
  notebook: { label: 'Notebook', x: 34, y: 46, detail: 'Review saved findings and the historical source list.' },
  board: { label: 'Board', x: 77, y: 20, detail: 'Arran explains the principles behind his tests.' },
};

const TOPICS: Record<Topic, { title: string; formula: string; explanation: string }> = {
  fibre: {
    title: 'Wool and cotton',
    formula: 'Cotton cellulose: (C₆H₁₀O₅)ₙ',
    explanation: 'Wool is keratin protein; cellulose is the principal polymer in cotton. Fibre structure under a microscope is useful evidence, not a date stamp.',
  },
  indigo: {
    title: 'Indigo in the vat',
    formula: 'Leucoindigo + oxygen → blue indigo',
    explanation: 'This is a schematic oxidation. Both plant-derived and synthetic indigo can yield the same principal pigment, so colour alone does not prove provenance.',
  },
  mineral: {
    title: 'A carbonate sample',
    formula: 'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂ + H₂O',
    explanation: 'A tiny mineral sample can release gas with acid. Arran would not apply this demonstration directly to a valuable rug.',
  },
};

export function ArranLab({
  onLeave,
  onInspect,
}: {
  onLeave: () => void;
  onInspect: (station: 'microscope' | 'dye' | 'balance') => void;
}) {
  const [selected, setSelected] = useState<Station>('board');
  const [topic, setTopic] = useState<Topic>('fibre');
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const active = STATIONS[selected];

  return (
    <section className="arran-lab" aria-label="Arran's textile laboratory">
      <header className="arran-lab__header">
        <div><strong>Arran's textile laboratory</strong><small>Giza · 1925</small></div>
        <button type="button" onClick={onLeave}>Leave laboratory</button>
      </header>

      <div className="arran-lab__viewport" onPointerMove={e => {
        if (e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        setPointer({ x: (e.clientX - r.left) / r.width - .5, y: (e.clientY - r.top) / r.height - .5 });
      }} onPointerLeave={() => setPointer({x:0,y:0})}>
        <div className="arran-lab__world" style={{ '--px': `${pointer.x * 8}px`, '--py': `${pointer.y * 5}px` } as CSSProperties}>
          <img className="arran-lab__room" src="/art/arran/13-lab-room.png" alt="A 1925 textile laboratory with workbench, microscope, balance, dye samples and a blank slate board" />
          <div className="arran-lab__board" aria-label="Chemistry board">
            <b>{TOPICS[topic].title}</b>
            <span>{TOPICS[topic].formula}</span>
          </div>
          {(Object.keys(STATIONS) as Station[]).map(id => (
            <button key={id} type="button" className={'arran-lab__hotspot ' + (selected === id ? 'is-selected' : '')}
              style={{ left: `${STATIONS[id].x}%`, top: `${STATIONS[id].y}%` }}
              aria-label={`Examine ${STATIONS[id].label}`} onClick={() => setSelected(id)}>
              <span aria-hidden="true">●</span>
            </button>
          ))}
        </div>
      </div>

      <nav className="arran-lab__stations" aria-label="Laboratory stations">
        {(Object.keys(STATIONS) as Station[]).map(id =>
          <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>{STATIONS[id].label}</button>
        )}
      </nav>
      <div className="arran-lab__panel" aria-live="polite">
        <img src={selected === 'microscope' || selected === 'dye' ? '/art/arran/11-lab-inspect.png' : '/art/arran/12-lab-explain.png'} alt="Arran Embleton in a plain laboratory coat" />
        <div>
          <h2>{active.label}</h2><p>{active.detail}</p>
          {selected === 'board' && <>
            <div className="arran-lab__topics">{(Object.keys(TOPICS) as Topic[]).map(id =>
              <button key={id} type="button" aria-pressed={topic === id} onClick={() => setTopic(id)}>{TOPICS[id].title}</button>
            )}</div><p>{TOPICS[topic].explanation}</p>
          </>}
          {selected !== 'board' && selected !== 'notebook' &&
            <button type="button" onClick={() => onInspect(selected)}>Choose a sample to examine</button>}
        </div>
      </div>
    </section>
  );
}
```

```css
.arran-lab { color:#eadcc6; background:#21170f; min-height:100%; font-family:Georgia,serif; }
.arran-lab button { cursor:pointer; font:inherit; color:inherit; background:#352619; border:1px solid #a98047; border-radius:8px; min-height:44px; padding:.45rem .7rem; }
.arran-lab button:focus-visible { outline:3px solid #f4cf80; outline-offset:2px; }
.arran-lab__header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.7rem 1rem; }
.arran-lab__header small { display:block; color:#c8ae82; }
.arran-lab__viewport { overflow:hidden; width:100%; }
.arran-lab__world { position:relative; width:100%; aspect-ratio:3/2; transform:translate(var(--px),var(--py)) scale(1.012); transition:transform .18s ease-out; }
.arran-lab__room { display:block; width:100%; height:100%; object-fit:cover; }
.arran-lab__board { position:absolute; left:59.3%; top:7%; width:31.8%; height:25%; color:#efe7d3; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:.5em; text-shadow:0 1px 1px #111; pointer-events:none; font-size:clamp(9px,1.55vw,22px); }
.arran-lab__board span { font-family:Georgia,serif; line-height:1.2; }
.arran-lab__hotspot { position:absolute; width:32px; height:32px; margin:-16px; padding:0!important; border-radius:50%!important; background:#40240eca!important; box-shadow:0 0 0 3px #efd4a680; }
.arran-lab__hotspot.is-selected { background:#a96028!important; box-shadow:0 0 0 5px #f7d286a0; }
.arran-lab__stations { display:flex; gap:.45rem; overflow-x:auto; padding:.65rem .8rem; scroll-padding:.8rem; }
.arran-lab__stations button { flex:0 0 auto; }
.arran-lab [aria-pressed="true"] { background:#916032; }
.arran-lab__panel { display:grid; grid-template-columns:minmax(80px,22%) 1fr; align-items:end; gap:.8rem; padding:.8rem 1rem 1.2rem; background:#281b11; border-top:1px solid #77532f; min-height:180px; }
.arran-lab__panel img { display:block; width:100%; max-height:210px; object-fit:contain; object-position:bottom; }
.arran-lab__panel h2 { margin:.1rem 0 .3rem; font-size:1.2rem; }
.arran-lab__panel p { margin:.35rem 0 .7rem; line-height:1.4; }
.arran-lab__topics { display:flex; flex-wrap:wrap; gap:.4rem; }
@media (max-width:600px) {
  .arran-lab__world { width:150%; margin-left:-23%; }
  .arran-lab__board { font-size:clamp(8px,2.1vw,13px); }
  .arran-lab__hotspot { width:26px; height:26px; margin:-13px; }
  .arran-lab__panel { grid-template-columns:24% 1fr; }
}
@media (prefers-reduced-motion:reduce) { .arran-lab__world { transform:none; transition:none; } }
```

The CSS percentage markers are an initial alignment for `13-lab-room.png`. Inspect the actual rendering on both desktop and a narrow phone. The board and all hotspots must remain aligned after responsive cropping. If not, use a separate world coordinate transform rather than moving percentages blindly.

## Inspection adapter for the existing zustand store

```ts
export type LabVerdict = 'consistent' | 'inconsistent' | 'inconclusive';
export interface LabFinding {
  id: string; subjectId: string; service: 'fibre'|'dye'|'fastness'|'metal';
  verdict: LabVerdict; confidence: 'tentative'|'moderate'|'strong';
  evidence: string[]; limitations: string[]; day: number;
}

export function beginArranInspection(
  state: GameState,
  subjectId: string,
  service: LabFinding['service']
): { ok: true; patch: Partial<GameState>; finding: LabFinding } | { ok: false; message: string } {
  const key = `${subjectId}:${service}`;
  const previous = (state.arranFindings ?? []).find(f => f.id === key);
  if (previous) return { ok:false, message:'This result is already recorded in Arran’s notebook.' };
  const subject = findInspectibleSubject(state, subjectId); // adapt to game inventory
  if (!subject) return { ok:false, message:'Choose an item you own.' };
  const pricePounds = { fibre:.08, dye:.18, fastness:.06, metal:.12 }[service];
  if (state.cash < pricePounds) return { ok:false, message:'You cannot afford this examination.' };
  if (service !== 'metal' && !subject.hasLooseThread) return { ok:false, message:'No loose thread is available. Ask before taking a sample.' };
  const finding = resolveFromActualItemData(subject, service, state.day); // deterministic; missing data => inconclusive
  return { ok:true, finding, patch: {
    cash: state.cash - pricePounds,
    arranFindings: [...(state.arranFindings ?? []), { ...finding, id:key }],
    // Pass time through the existing game's time action instead of manually changing day here.
  }};
}
```

`GameState`, `findInspectibleSubject`, and `resolveFromActualItemData` are adapters Claude must implement against the real project; the scaffold is intentionally not pretending to be a compiled patch. No claim of an exact historical date or provenance may result solely from a dye test. Use the current save migration to default `arranFindings` to `[]` for older saves. Test the purchase once, reload, and confirm cash, time and finding remain consistent.

## Further art request to make after repo inspection

Claude: inspect how the current game composes layered scenes and the actual screen crop. Then ask the user for the **smallest necessary additional art batch** with precise sizes, placements, and transparency. Likely candidates are: (1) transparent foreground microscope and balance overlays for parallax, (2) a close-up fibre microscopy card, (3) four labelled-by-code yarn sample cards, (4) a simple outside lab door or arrival card, and (5) a 1925 paper source-book page. Do not request art already covered by the images in Drive. Ask for specific filenames, pixel dimensions, camera angle, and clear no-text zones.

## Credits and rights

Period research references: Science Museum Group `Outfit worn by chemists from the Government Laboratory` (circa 1930); its collection entry for British industrial dye-lab equipment; Science History Institute 1920s lab photography. For optional in-game period reading, J. Merritt Matthews' *Laboratory Manual of Dyeing and Textile Chemistry* (1909), Watson Smith's *The Chemistry of Hat Manufacturing*, and Faraday's *The Chemical History of a Candle* can inform original summaries. LibriVox's public-domain Faraday reading is modern audio, not a 1925 recording. Keep a licence/source ledger per imported asset and do not reuse present-day Royal Society/RSC images, logos, or recordings without commercial permission.
