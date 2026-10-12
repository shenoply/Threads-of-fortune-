// A game that stopped the page (the crash screen) is kept in a save slot so it is not lost, but loading
// it would most likely stop the page again. Such a slot is marked, shown as "Crashed game, day N", and
// offered as a backup file rather than loaded.
import type { SlotInfo } from './slots';

export const CRASHED_MODE = 'Crashed game';
const slotKey = (n: number) => `threads-of-fortune-slot-${n}`;

/** Mark slot n as holding the game that crashed. */
export function markSlotCrashed(n: number): boolean {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return false;
    const f = JSON.parse(raw) as { meta?: SlotInfo & { crashed?: boolean }; raw?: string };
    if (!f.meta) return false;
    f.meta = { ...f.meta, mode: CRASHED_MODE, crashed: true };
    const out = JSON.stringify(f);
    localStorage.setItem(slotKey(n), out);
    return localStorage.getItem(slotKey(n)) === out;
  } catch { return false; }
}

export const slotCrashed = (info: SlotInfo | null | undefined): boolean => !!info && (info.mode === CRASHED_MODE || !!(info as { crashed?: boolean }).crashed);

export const crashedLabel = (info: SlotInfo) => `${CRASHED_MODE}, day ${info.day} · kept ${info.savedAt}`;

/** The save text inside slot n, for a backup file. */
export function slotSaveText(n: number): string | null {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    return (JSON.parse(raw) as { raw?: string }).raw ?? null;
  } catch { return null; }
}
