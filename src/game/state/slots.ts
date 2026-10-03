// Manual save slots: a quick, in-browser alternative to downloading/loading a save file, for a
// player who wants a few separate games on one phone without juggling files. Lives entirely in
// localStorage, next to (but independent of) the continuous autosave at 'threads-of-fortune-save'
// - starting a new game or loading a slot never touches the other slots.
import { fmt } from '../economy/money';

export const SLOT_COUNT = 3;
const AUTOSAVE_KEY = 'threads-of-fortune-save';
const slotKey = (n: number) => `threads-of-fortune-slot-${n}`;

export interface SlotInfo { day: number; cash: number; savedAt: string }
interface SlotFile { meta: SlotInfo; raw: string }

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string): boolean {
  try { localStorage.setItem(key, v); return true; } catch { return false; }
}

/** What's in a slot, for the picker - or null if it's empty or unreadable. */
export function readSlot(n: number): SlotInfo | null {
  const raw = read(slotKey(n));
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Partial<SlotFile>;
    return f.meta ?? null;
  } catch { return null; }
}

export const readSlots = () => Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i + 1));

/** Copy the live autosave into a slot. Returns false if there is no game to save. */
export function saveToSlot(n: number): boolean {
  const raw = read(AUTOSAVE_KEY);
  if (!raw) return false;
  try {
    const s = (JSON.parse(raw).state ?? {}) as { day?: number; cash?: number };
    const meta: SlotInfo = { day: s.day ?? 1, cash: s.cash ?? 0, savedAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    return write(slotKey(n), JSON.stringify({ meta, raw } satisfies SlotFile));
  } catch { return false; }
}

/** Replace the live autosave with a slot's copy. The caller still has to reload the page to pick
 *  it up - zustand's persist only reads localStorage once, at start-up. */
export function loadFromSlot(n: number): boolean {
  const raw = read(slotKey(n));
  if (!raw) return false;
  try {
    const f = JSON.parse(raw) as SlotFile;
    if (!f.raw) return false;
    return write(AUTOSAVE_KEY, f.raw);
  } catch { return false; }
}

export function clearSlot(n: number) {
  try { localStorage.removeItem(slotKey(n)); } catch { /* storage unavailable */ }
}

export const slotLabel = (info: SlotInfo) => `Day ${info.day} · ${fmt(info.cash)} · saved ${info.savedAt}`;
