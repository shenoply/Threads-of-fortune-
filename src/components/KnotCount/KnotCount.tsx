// Counting knots through a one-inch brass window on the back of a rug, against the clock. The back is
// drawn here, knot by knot, in the rug's own colours (sampled from its picture); one row and one column
// are marked. Count them by tapping each knot, or set the numbers with − and +. The true count and what
// a right or wrong count tells you are in game/knots.ts; the result is kept by the store's knotCount.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../game/state/store';
import { audio } from '../../game/audio/engine';
import { RUGS } from '../../data/rugs';
import { rugThumb } from '../RugViewer/rugArt';
import { patchFor, paletteFor, knotVerdict, closeEnough, type KnotResult } from '../../game/knots';
import './knotcount.css';

function hash01(s: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};
const rgbHex = (r: number, g: number, b: number) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

/** the rug's colours over the patch: a small piece of its picture, one colour per knot (null until loaded) */
function useKnotColours(typeId: string, key: string, across: number, down: number) {
  const [grid, setGrid] = useState<string[][] | null>(null);
  useEffect(() => {
    const t = RUGS[typeId];
    if (!t) return;
    let live = true;
    const im = new Image();
    im.onload = () => {
      if (!live) return;
      try {
        const W = across + 2, H = down + 2;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d')!;
        // a patch about a tenth of the rug across: enough of the drawing to cross a line or two of it
        const sw = im.naturalWidth * 0.1, sh = sw * (H / W);
        const sx = (im.naturalWidth - sw) * (0.15 + hash01(key, 3) * 0.7), sy = (im.naturalHeight - sh) * (0.15 + hash01(key, 5) * 0.7);
        g.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data;
        const out: string[][] = [];
        for (let y = 0; y < H; y++) { const row: string[] = []; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; row.push(rgbHex(d[i], d[i + 1], d[i + 2])); } out.push(row); }
        setGrid(out);
      } catch { /* a picture we may not read: the colour family's palette stands in */ }
    };
    im.src = rugThumb(t);
    return () => { live = false; };
  }, [typeId, key, across, down]);
  return grid;
}

export interface KnotCountProps {
  typeId: string;
  /** the rug's uid, or the dealer's offer it is counted on */
  keyId: string;
  where: 'lab' | 'dealer';
  /** hidden: new work sold as old (shows in the knots of a right count) */
  fakeAge?: boolean;
  onClose: () => void;
}

export function KnotCount({ typeId, keyId, where, fakeAge, onClose }: KnotCountProps) {
  const t = RUGS[typeId];
  const patch = useMemo(() => patchFor(keyId, typeId), [keyId, typeId]);
  const day = useGame((g) => g.day);
  const prev = useGame((g) => g.knotCounts?.[keyId]);
  const gauge = useGame((g) => (g.arranTools ?? []).includes('gauge'));
  const tally = useGame((g) => g.knotTally);
  const knotCount = useGame((g) => g.knotCount);
  // Arran lends his gauge at the lab; your own gauge gives you the same steadier count anywhere
  const SECONDS = where === 'lab' || gauge ? 30 : 22;
  const [phase, setPhase] = useState<'ready' | 'count' | 'done'>(prev && prev.day === day ? 'done' : 'ready');
  const [left, setLeft] = useState(SECONDS);
  const [across, setAcross] = useState(0);
  const [down, setDown] = useState(0);
  const [rowTicks, setRowTicks] = useState<Set<number>>(new Set());
  const [colTicks, setColTicks] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<KnotResult | null>(prev && prev.day === day ? prev : null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const colours = useKnotColours(typeId, keyId, patch?.across ?? 8, patch?.down ?? 8);
  const markRow = patch ? 1 + Math.floor(hash01(keyId, 17) * (patch.down - 2)) : 0;
  const markCol = patch ? 1 + Math.floor(hash01(keyId, 19) * (patch.across - 2)) : 0;
  const [size, setSize] = useState(320);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setSize(Math.max(220, Math.min(el.clientWidth - 20, el.clientHeight - 20, 420)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // the clock
  useEffect(() => {
    if (phase !== 'count') return;
    const start = performance.now() - (SECONDS - left) * 1000;
    const iv = window.setInterval(() => {
      const l = Math.max(0, SECONDS - (performance.now() - start) / 1000);
      setLeft(l);
      if (l <= 0) window.clearInterval(iv);
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'count' && left <= 0) finish(); }); // eslint-disable-line react-hooks/exhaustive-deps

  // draw the back of the rug: the window shows one inch, a little of the rug round it is dimmed
  useEffect(() => {
    const c = cvs.current;
    if (!c || !patch || phase === 'done') return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const M = 0.55; // the dimmed margin, in knots
    const cw = size / (patch.across + 2 * M), ch = size / (patch.down + 2 * M);
    const ox = M * cw, oy = M * ch;
    const pal = paletteFor(typeId);
    const cotton = /cotton/i.test(t?.weave.foundation ?? '');
    g.fillStyle = cotton ? '#d9cfb8' : '#b9a27c';
    g.fillRect(0, 0, size, size);
    // warps between the knots, wefts between the rows
    g.strokeStyle = cotton ? 'rgba(250,244,228,.75)' : 'rgba(214,196,160,.7)';
    g.lineWidth = Math.max(1, ch * 0.12);
    for (let r = -1; r <= patch.down + 1; r++) { const y = oy + r * ch; g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke(); }
    for (let r = -1; r <= patch.down; r++) for (let k = -1; k <= patch.across; k++) {
      const x = ox + k * cw, y = oy + r * ch;
      const col = colours?.[r + 1]?.[k + 1] ?? pal[Math.floor(hash01(`${keyId}:${Math.floor((r + 3) / 3)}:${Math.floor((k + 3) / 4)}`, 1) * pal.length)];
      const j = (n: number) => (hash01(`${keyId}:${r}:${k}`, n) - 0.5);
      const lw = cw * (0.25 + j(2) * 0.04), lh = ch * (0.4 + j(3) * 0.06);
      const cx = x + cw / 2 + j(4) * cw * 0.08, cy = y + ch / 2 + j(5) * ch * 0.08;
      // a knot seen from the back: two lobes side by side, round the pair of warps
      for (const side of [-1, 1]) {
        const lx = cx + side * cw * 0.22;
        const grd = g.createRadialGradient(lx - lw * 0.3, cy - lh * 0.35, lh * 0.1, lx, cy, lh * 1.1);
        grd.addColorStop(0, shade(col.startsWith('#') ? col : '#888888', 1.25));
        grd.addColorStop(0.6, col);
        grd.addColorStop(1, shade(col.startsWith('#') ? col : '#888888', 0.62));
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(lx, cy, lw, lh, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // the dim round the window, and the brass gauge
    g.fillStyle = 'rgba(20,12,6,.62)';
    g.fillRect(0, 0, size, oy); g.fillRect(0, size - oy, size, oy); g.fillRect(0, oy, ox, size - 2 * oy); g.fillRect(size - ox, oy, ox, size - 2 * oy);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(ox - 1.5, oy - 1.5, size - 2 * ox + 3, size - 2 * oy + 3);
    // the row and the column to count
    g.lineWidth = 2.5;
    g.strokeStyle = '#ffd25a'; g.fillStyle = 'rgba(255,210,90,.13)';
    g.fillRect(ox, oy + markRow * ch, size - 2 * ox, ch); g.strokeRect(ox, oy + markRow * ch, size - 2 * ox, ch);
    g.strokeStyle = '#7fd4ff'; g.fillStyle = 'rgba(127,212,255,.13)';
    g.fillRect(ox + markCol * cw, oy, cw, size - 2 * oy); g.strokeRect(ox + markCol * cw, oy, cw, size - 2 * oy);
    // the knots you have tapped
    const tick = (k: number, r: number, c2: string) => {
      g.fillStyle = c2; g.strokeStyle = '#1b120b'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(ox + k * cw + cw / 2, oy + r * ch + ch / 2, Math.max(3, Math.min(cw, ch) * 0.16), 0, Math.PI * 2); g.fill(); g.stroke();
    };
    rowTicks.forEach((k) => tick(k, markRow, '#ffd25a'));
    colTicks.forEach((r) => tick(markCol, r, '#7fd4ff'));
  }, [patch, colours, size, rowTicks, colTicks, markRow, markCol, phase, typeId, keyId, t]);

  if (!t || !patch) return null;

  const tap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'count') return;
    const r0 = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const M = 0.55;
    const cw = r0.width / (patch.across + 2 * M), ch = r0.height / (patch.down + 2 * M);
    const k = Math.floor((e.clientX - r0.left - M * cw) / cw), r = Math.floor((e.clientY - r0.top - M * ch) / ch);
    if (k < 0 || r < 0 || k >= patch.across || r >= patch.down) return;
    let hit = false;
    // the knot where the row and the column cross is marked for both from the start
    if (r === markRow && k === markCol) return;
    if (r === markRow) { const s = new Set(rowTicks); if (s.has(k)) s.delete(k); else s.add(k); setRowTicks(s); setAcross(s.size); hit = true; }
    if (k === markCol) { const s = new Set(colTicks); if (s.has(r)) s.delete(r); else s.add(r); setColTicks(s); setDown(s.size); hit = true; }
    if (hit) audio.sfx('tap');
  };

  function finish() {
    if (phase !== 'count') return;
    const counted = Math.max(1, across) * Math.max(1, down);
    knotCount(keyId, typeId, counted, patch!.kpsi, where);
    setResult({ counted, truth: patch!.kpsi, ok: closeEnough(counted, patch!.kpsi), day });
    audio.sfx('pen');
    setPhase('done');
  }
  const begin = () => {
    audio.sfx('tap'); setLeft(SECONDS); setPhase('count');
    setRowTicks(new Set([markCol])); setColTicks(new Set([markRow])); setAcross(1); setDown(1);
  };

  const Step = ({ label, v, set, cls, id }: { label: string; v: number; set: (n: number) => void; cls: string; id: string }) => (
    <div className={`kc-step ${cls}`}>
      <span>{label}</span>
      <button className="btn" onClick={() => set(Math.max(0, v - 1))} aria-label={`${label}: one fewer`} data-testid={`kc-${id}-minus`}>−</button>
      <b data-testid={`kc-${id}`}>{v}</b>
      <button className="btn" onClick={() => set(Math.min(40, v + 1))} aria-label={`${label}: one more`} data-testid={`kc-${id}-plus`}>+</button>
    </div>
  );

  const verdict = result ? knotVerdict(result, typeId, { fakeAge }) : '';
  return createPortal(
    <div className="overlay knotcount" role="dialog" aria-label="Count the knots" data-testid="knotcount" data-truth={import.meta.env.DEV ? `${patch.across}x${patch.down}` : undefined} data-mark={import.meta.env.DEV ? `${markRow},${markCol}` : undefined}>
      <div className="kc-head">
        <h2>Count the knots</h2>
        <span className="kc-rug">{t.name}{where === 'lab' ? ' · at Arran\'s bench' : ''}</span>
        <button className="btn small kc-x" onClick={onClose} aria-label="Leave the count" data-testid="kc-close">✕</button>
      </div>
      <p className="kc-rules"><b>One inch of the back under the brass window.</b> Count the knots in the gold row and the blue column. Within one in twenty of the true count, and you know what the rug is.</p>
      <p className="kc-how"><b>How to play:</b> tap each knot in the gold row, then each in the blue column (the knot where they cross is already marked), or set the numbers with − and +. Press Done when you are sure.</p>
      {phase !== 'done' && (
        <>
          <div className="kc-clock" aria-label={`${Math.ceil(left)} seconds left`} data-testid="kc-clock"><i style={{ width: `${(left / SECONDS) * 100}%` }} className={left < 6 ? 'low' : ''} /><span>{phase === 'count' ? `${Math.ceil(left)} s` : `${SECONDS} seconds`}</span></div>
          <div className="kc-glass" ref={wrap}>
            <canvas ref={cvs} style={{ width: size, height: size }} onPointerDown={tap} className={phase === 'ready' ? 'is-wait' : ''} data-testid="kc-canvas" />
            {phase === 'ready' && <button className="btn primary kc-start" onClick={begin} data-testid="kc-start">Start the clock</button>}
          </div>
          <div className="kc-steps">
            <Step label="Across" v={across} set={setAcross} cls="row" id="across" />
            <Step label="Down" v={down} set={setDown} cls="col" id="down" />
          </div>
          <div className="kc-foot">
            <span className="kc-sum">{across && down ? `${across} × ${down} = ${across * down} to the square inch` : 'Knots across times knots down'}</span>
            <button className="btn primary" disabled={phase !== 'count'} onClick={finish} data-testid="kc-done">Done</button>
          </div>
        </>
      )}
      {phase === 'done' && result && (
        <div className="kc-result" data-testid="kc-result" data-ok={result.ok ? '1' : '0'}>
          <p className="kc-verdict" data-testid="kc-verdict">{verdict}</p>
          {where === 'lab'
            ? <p className="kc-check" data-testid="kc-check">{result.ok ? `Arran counts it after you and nods: "${result.truth}. Near enough to trust."` : `Arran counts it after you: "${result.truth}, I make it. Count again another day; the eye gets better."`}</p>
            : <p className="kc-check">You write {result.counted} in your notebook. The dealer watches you count and says nothing.</p>}
          <p className="kc-tally">Counts made: {tally?.tries ?? 1}{where === 'lab' ? ` · right ${tally?.close ?? 0}` : ''}</p>
          <button className="btn primary" onClick={onClose} data-testid="kc-back">{where === 'lab' ? 'Back to the bench' : 'Back to the rug'}</button>
        </div>
      )}
    </div>,
    document.body,
  );
}
