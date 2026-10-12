// Guards around the one save in localStorage ('threads-of-fortune-save'):
//  - notices when a write to it fails (storage full or blocked) and tells the page, so the player is
//    warned instead of seeing "Saved at" while nothing was written;
//  - notices when another tab of this browser writes the same save, and from then on stops this tab
//    writing over it (the newer game in the other tab would otherwise be lost);
//  - checks a backup file before it replaces the game;
//  - keeps a copy of the game that a backup file replaced, so it can be brought back.
// It wraps Storage.prototype.setItem rather than the store, so it works whatever the store does.
import { SETTLEMENTS } from '../../data/world';
import { RUGS } from '../../data/rugs';

export const SAVE_KEY = 'threads-of-fortune-save';
/** the game as it was just before a backup file replaced it */
export const BEFORE_LOAD_KEY = 'threads-of-fortune-before-load';
/** the game that was showing when the page crashed and the player chose to leave it */
export const CRASHED_KEY = 'threads-of-fortune-crashed';

export const SAVE_FAILED_EVENT = 'tof:save-failed';
export const SAVE_OK_EVENT = 'tof:save-ok';
export const OTHER_TAB_EVENT = 'tof:other-tab';

let failed = false;
let otherTab = false;
let blocked = false;
// set while writeKey() puts a save in place on purpose (a backup file, a crash recovery)
let bypass = false;

const emit = (name: string) => { try { window.dispatchEvent(new CustomEvent(name)); } catch { /* no window */ } };

/** Did the last write of the save fail? Also asks the store, when it can say. */
export function saveFailedNow(store?: unknown): boolean {
  if (failed) return true;
  const f = (store as { lastSaveFailed?: unknown } | undefined)?.lastSaveFailed;
  try { return typeof f === 'function' ? !!f() : false; } catch { return false; }
}
export const otherTabActive = () => otherTab;
/** Stop every further write of the save from this page (used before a reload that replaces it). */
export const blockSaves = () => { blocked = true; };

let installed = false;
export function installSaveGuard() {
  if (installed || typeof window === 'undefined' || typeof Storage === 'undefined') return;
  installed = true;
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
    let ls: Storage | null = null;
    try { ls = window.localStorage; } catch { /* storage blocked */ }
    if (this !== ls || k !== SAVE_KEY) return orig.call(this, k, v);
    // another tab has the newer game, or this page is about to reload into another one: leave it alone
    if ((otherTab || blocked) && !bypass) return;
    try {
      orig.call(this, k, v);
    } catch (e) {
      if (!failed) { failed = true; emit(SAVE_FAILED_EVENT); }
      throw e;
    }
    if (failed) { failed = false; emit(SAVE_OK_EVENT); }
  };
  window.addEventListener('storage', (e) => {
    if (e.key !== SAVE_KEY || otherTab) return;
    try { if (e.storageArea !== window.localStorage) return; } catch { return; }
    otherTab = true;
    emit(OTHER_TAB_EVENT);
  });
  // the store says so too, when its own write fails: keep one answer
  window.addEventListener(SAVE_FAILED_EVENT, () => { failed = true; });
  window.addEventListener(SAVE_OK_EVENT, () => { failed = false; });
}

// keys the store never writes to disk (see partialize in store.ts)
const NOT_SAVED = new Set(['encounter', 'seed', 'audienceStash', 'held']);
/** The game as it is in memory, in the same form as the save on disk. Used when the disk copy is
 *  out of date because writing it failed. */
export function memorySave(state: object, version: number): string {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) if (typeof v !== 'function' && !NOT_SAVED.has(k)) out[k] = v;
  return JSON.stringify({ state: out, version });
}

export function readKey(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
/** Write one key on purpose (it goes through even while saves are stopped) and check it was kept. */
export function writeKey(k: string, v: string): boolean {
  bypass = true;
  try { localStorage.setItem(k, v); return localStorage.getItem(k) === v; } catch { return false; } finally { bypass = false; }
}

export type SaveCheck = { ok: true; day: number; ironman: boolean } | { ok: false; why: string };

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Is this text a save the game can start from? Checks the parts the game reads as it opens. */
export function checkSave(txt: string, saveVersion: number): SaveCheck {
  const bad = (part: string): SaveCheck => ({ ok: false, why: `That file is not a Threads of Fortune save the game can open (${part} is missing or damaged).` });
  let d: unknown;
  try { d = JSON.parse(txt); } catch { return { ok: false, why: 'That file is not a Threads of Fortune save, or it is damaged.' }; }
  if (!isObj(d) || !isObj(d.state)) return { ok: false, why: 'That file is not a Threads of Fortune save.' };
  const v = d.version ?? 0;
  if (!isNum(v)) return bad('the save version');
  if (v > saveVersion) return { ok: false, why: `That save was made by a newer version of the game than this one. Reload the page to fetch the latest version, then open the file again.` };
  const s = d.state;
  if (!isNum(s.day) || s.day < 1) return bad('the day');
  if (!isNum(s.cash)) return bad('the money');
  if (s.reputation !== undefined && !isNum(s.reputation)) return bad('the reputation');
  if (s.started !== undefined && typeof s.started !== 'boolean') return bad('the game state');
  if (!Array.isArray(s.inventory) || !s.inventory.every((i) => isObj(i) && typeof i.uid === 'string' && typeof i.typeId === 'string' && i.typeId in RUGS)) return bad('the rugs in stock');
  // saves older than version 3 had a different map: the game draws a fresh one for them
  const w = s.world;
  if (v >= 3) {
    if (!isObj(w) || !isNum(w.x) || !isNum(w.y) || !isNum(w.hour)) return bad('the map position');
    if (w.at !== null && w.at !== undefined && !(typeof w.at === 'string' && SETTLEMENTS.some((x) => x.id === w.at))) return bad('the town');
    if ((v >= 4 && !isObj(w.party)) || (w.parties !== undefined && !Array.isArray(w.parties)) || (w.known !== undefined && !Array.isArray(w.known))) return bad('the caravan');
  }
  // anything else missing is filled in from a new game as the save opens; what is there must be the right kind
  const kind = (k: string, ok: (x: unknown) => boolean) => s[k] === undefined || ok(s[k]);
  if (!kind('tutorial', isObj)) return bad('the first-day lesson');
  if (!kind('queue', Array.isArray) || !kind('visitIdx', isNum) || !kind('relationships', isObj)) return bad('the buyers');
  if (!kind('supplier', isObj)) return bad('the supplier');
  if (!kind('ledger', Array.isArray) || !kind('journal', Array.isArray) || !kind('dayStats', isObj)) return bad('the ledger');
  if (!kind('family', isObj)) return bad('the household');
  if (!kind('settings', isObj)) return bad('the settings');
  return { ok: true, day: s.day, ironman: s.ironman === true };
}
