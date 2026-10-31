// One game, two builds: the phone web page and the PC desktop app (Electron, desktop/main.cjs). Everything
// that differs between them goes through here, so the game itself never asks which build it is in.
//
// - `desktop`: the bridge the desktop app's preload script puts on window (desktop/preload.cjs); null on the web.
// - `achievements` / `cloud`: the Steam hooks. They do nothing yet; once Steamworks is wired into the desktop
//   app (docs/PC-BUILD.md) the bridge carries `steam` and these pass the calls on.

export type DesktopBridge = {
  platform: string;                       // process.platform of the desktop app: 'win32', 'linux', 'darwin'
  version: string;                        // the app's version
  toggleFullscreen: () => void;
  isFullscreen: () => Promise<boolean>;
  onFullscreen: (cb: (on: boolean) => void) => () => void;
  quit: () => void;
  /** present once Steamworks is in (steamworks.js in the main process) */
  steam?: {
    ready: () => Promise<boolean>;
    unlock: (id: string) => Promise<boolean>;
    cloudWrite: (name: string, data: string) => Promise<boolean>;
    cloudRead: (name: string) => Promise<string | null>;
  };
};

declare global { interface Window { tofDesktop?: DesktopBridge } }

export const desktop: DesktopBridge | null = typeof window !== 'undefined' ? window.tofDesktop ?? null : null;
/** the desktop app (or a `vite build --mode pc` page opened as one) */
export const isDesktopApp = !!desktop || import.meta.env.MODE === 'pc';

/** Achievements: a no-op on the web and until Steamworks is in. The ids are the game's own, and the same
 *  ids are entered as API names on the Steamworks achievements page. */
const unlocked = new Set<string>();
export const achievements = {
  unlock(id: string): void {
    if (unlocked.has(id)) return;
    unlocked.add(id);
    void desktop?.steam?.unlock(id).catch(() => false);
  },
};

/** Steam Cloud: the save is kept in localStorage in both builds (in the desktop app that lives in the app's
 *  own data folder). With Steamworks in, the save is also written to Steam Cloud and read back on a new
 *  machine; until then these say nothing is there. */
export const cloud = {
  available: (): Promise<boolean> => desktop?.steam?.ready().catch(() => false) ?? Promise.resolve(false),
  write: (name: string, data: string): Promise<boolean> => desktop?.steam?.cloudWrite(name, data).catch(() => false) ?? Promise.resolve(false),
  read: (name: string): Promise<string | null> => desktop?.steam?.cloudRead(name).catch(() => null) ?? Promise.resolve(null),
};
