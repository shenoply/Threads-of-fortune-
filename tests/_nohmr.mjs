// Preloaded by run-all (node --import ./tests/_nohmr.mjs). While other people edit src/, the Vite dev
// server pushes hot updates that remount screens mid-test and make runs flaky. This gives every page a
// silent stand-in for Vite's hot-update socket, so a test plays the code as it was when its page loaded.
// Set HMR=1 to keep live updates.
// Tests reach the game's store with import(<the store.ts URL the page actually loaded>), because after a hot
// update Vite serves it as store.ts?t=..., and a bare import('/src/game/state/store.ts') would get a second,
// empty copy of the store.
import pw from 'playwright';

const HMR_SOCKET = /^wss?:\/\/[^/]+\/(\?[^/]*)?$|\/@vite/;
const quiet = async (ctx) => {
  try { await ctx.routeWebSocket(HMR_SOCKET, () => { /* never connect, never close */ }); } catch { /* old playwright */ }
  // tests find the game's own store module (its URL carries Vite's ?t= stamp) in the resource list: keep it all
  await ctx.addInitScript(() => { try { performance.setResourceTimingBufferSize(100000); } catch { /* */ } }).catch(() => {});
  return ctx;
};

if (process.env.HMR !== '1') {
  for (const type of [pw.chromium, pw.firefox, pw.webkit]) {
    const launch = type.launch.bind(type);
    type.launch = async (...a) => {
      const browser = await launch(...a);
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...o) => quiet(await newContext(...o));
      browser.newPage = async (...o) => (await browser.newContext(...o)).newPage();
      return browser;
    };
    const persistent = type.launchPersistentContext?.bind(type);
    if (persistent) type.launchPersistentContext = async (...a) => quiet(await persistent(...a));
  }
}
