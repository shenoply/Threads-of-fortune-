// Threads of Fortune, the desktop app (Windows and Linux; Steam). It is the same game as the phone web
// page: the Vite build made with `npm run build:pc` (dist-pc/), shown in an Electron window. Nothing of the
// game's own code lives here, only the window, the files and the bridge in preload.cjs.
//
// - The pages are served from the app's own folder under app://tof/, a fixed origin, so the save
//   (localStorage) always lands in the same place: the app's data folder, %APPDATA%\Threads of Fortune
//   on Windows and ~/.config/Threads of Fortune on Linux.
// - Nothing is fetched from the network: the art, sound and fonts are all in the folder.
// - F11 or Alt+Enter toggles full screen; the window remembers its size and full screen between runs.
// - Steam (docs/PC-BUILD.md): once steamworks.js is added and an app ID is in steam_appid.txt, `steam` below
//   comes alive and the game's achievements and cloud hooks (src/platform/platform.ts) reach it.
const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const TITLE = 'Threads of Fortune';
app.setName(TITLE);
// the dev run (npm run pc) keeps its save apart from the packaged game's
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), `${TITLE} (dev)`));

// the built game: next to this file in the packaged app (dist/), or the repo's dist-pc/ in a dev run
const ROOT = [path.join(__dirname, 'dist'), path.join(__dirname, '..', 'dist-pc')].find((d) => fs.existsSync(path.join(d, 'index.html')));

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

// ---- Steam: a clean hook, off until steamworks.js is installed and the game has an app ID ----
let steam = null;
try {
  // eslint-disable-next-line global-require
  const sw = require('steamworks.js');
  const idFile = path.join(__dirname, 'steam_appid.txt');
  const appId = fs.existsSync(idFile) ? Number(fs.readFileSync(idFile, 'utf8').trim()) : undefined;
  steam = sw.init(appId);
  sw.electronEnableSteamOverlay?.();
} catch { steam = null; }

// ---- the window's size and full screen, kept between runs ----
const STATE = () => path.join(app.getPath('userData'), 'window.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE(), 'utf8')); } catch { return {}; } };
const saveState = (win) => {
  try {
    const s = { fullscreen: win.isFullScreen(), maximized: win.isMaximized(), bounds: win.isFullScreen() || win.isMaximized() ? readState().bounds : win.getBounds() };
    fs.writeFileSync(STATE(), JSON.stringify(s));
  } catch { /* the data folder is not writable: start at the default size next time */ }
};

let win = null;
function createWindow() {
  const st = readState();
  win = new BrowserWindow({
    title: TITLE,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    width: st.bounds?.width ?? 1600, height: st.bounds?.height ?? 900, x: st.bounds?.x, y: st.bounds?.y,
    minWidth: 1024, minHeight: 640,
    backgroundColor: '#120b06',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      additionalArguments: [`--tof-version=${app.getVersion()}`],
    },
  });
  if (st.maximized) win.maximize();
  if (st.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', (e) => e.preventDefault()); // the window keeps the game's name
  win.on('close', () => saveState(win));
  const tellFull = () => win.webContents.send('tof:fullscreen', win.isFullScreen());
  win.on('enter-full-screen', tellFull);
  win.on('leave-full-screen', tellFull);

  // F11 and Alt+Enter: full screen, handled here so it works on every screen of the game
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    // the developer tools, for testers: Ctrl+Shift+I
    if (input.key.toLowerCase() === 'i' && input.control && input.shift) { e.preventDefault(); win.webContents.toggleDevTools(); }
  });
  // links to the outside world (sources, the shop page) open in the player's browser, never in the game window
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });

  win.loadURL('app://tof/index.html');
}

// one copy of the game at a time: a second launch brings the first window forward (two would fight over the save)
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle('app', (req) => {
      const u = new URL(req.url);
      const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.normalize(path.join(ROOT, rel));
      if (!ROOT || !file.startsWith(ROOT)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString(), { headers: req.headers });
    });
    ipcMain.on('tof:toggle-fullscreen', () => win?.setFullScreen(!win.isFullScreen()));
    ipcMain.handle('tof:is-fullscreen', () => !!win?.isFullScreen());
    ipcMain.on('tof:quit', () => app.quit());
    ipcMain.handle('tof:steam', () => !!steam);
    ipcMain.handle('tof:steam-unlock', (_e, id) => { try { steam?.achievement.activate(String(id)); return !!steam; } catch { return false; } });
    ipcMain.handle('tof:cloud-write', (_e, name, data) => { try { return !!steam?.cloud.writeFile(String(name), String(data)); } catch { return false; } });
    ipcMain.handle('tof:cloud-read', (_e, name) => { try { return steam?.cloud.isEnabledForApp() ? steam.cloud.readFile(String(name)) : null; } catch { return null; } });
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
