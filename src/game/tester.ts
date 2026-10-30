// Tester tools: the Tester's sheet, the cheat words, the fast road speeds and skipping days. Hidden from
// players: on only in the dev build, or once the tester's code is typed into "Have a code?" in Settings.
// Only the code's SHA-256 is in the build, not the code itself.
const TESTER_HASH = 'e2caddaf9818f85576e3c7114d3c11477e0384b3bcac485b114315383211af08';
const KEY = 'tof-tester';

export function testerOn(): boolean {
  if (import.meta.env.DEV) return true;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** the code typed: true if it was the tester's code (and the tools are now on) */
export async function tryTesterCode(code: string): Promise<boolean> {
  if ((await sha256(code)) !== TESTER_HASH) return false;
  try { localStorage.setItem(KEY, '1'); } catch { /* private mode: on for this visit only */ }
  sessionOn = true;
  return true;
}
let sessionOn = false;
export const testerNow = () => sessionOn || testerOn();

/** switch the tools off again on this phone */
export function testerOff() { sessionOn = false; try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/** extra road speeds for testers, beside 1x, 2x and 4x */
export const FAST_SPEEDS = [16, 64];
