// The bridge between the game page and the desktop app (desktop/main.cjs). The game reads it as
// window.tofDesktop (src/platform/platform.ts); on the phone web page it is simply not there.
const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  platform: process.platform,
  version: process.argv.find((a) => a.startsWith('--tof-version='))?.slice(14) || '',
  toggleFullscreen: () => ipcRenderer.send('tof:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('tof:is-fullscreen'),
  onFullscreen: (cb) => { const f = (_e, on) => cb(!!on); ipcRenderer.on('tof:fullscreen', f); return () => ipcRenderer.removeListener('tof:fullscreen', f); },
  quit: () => ipcRenderer.send('tof:quit'),
  // Steam: always present on the bridge; each call answers false/null until Steamworks is running
  steam: {
    ready: () => ipcRenderer.invoke('tof:steam'),
    unlock: (id) => ipcRenderer.invoke('tof:steam-unlock', id),
    cloudWrite: (name, data) => ipcRenderer.invoke('tof:cloud-write', name, data),
    cloudRead: (name) => ipcRenderer.invoke('tof:cloud-read', name),
  },
};
contextBridge.exposeInMainWorld('tofDesktop', bridge);
