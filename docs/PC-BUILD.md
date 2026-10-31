# The PC build (Steam)

One game, two builds from the same code:

- **Phone web page**: `npm run build`, as before (`dist/`).
- **PC desktop app**: the same Vite build made with `--mode pc` (`dist-pc/`), shown in an Electron window
  (`desktop/`). Windows x64 first (Steam's largest market), Linux x64 as well.

No game logic is forked. Everything that differs between the builds goes through `src/platform/`:

| File | What it does |
|---|---|
| `src/platform/platform.ts` | `isDesktopApp`, the desktop bridge (`window.tofDesktop`), and the Steam hooks `achievements` and `cloud` (no-ops for now) |
| `src/platform/pc.ts` | the PC layer: puts `pc` on `<html>` on a wide screen with a mouse (and always in the desktop app), keyboard shortcuts, hover tips, right-click to look closer |
| `src/platform/pc.css` | the wide layouts, all under `html.pc`, so the phone layout is untouched |
| `src/platform/PcSettings.tsx` | Settings: screen layout (Auto / Wide / Phone), the shortcuts list, Quit to desktop |

## The PC layout

On when the window is at least 1200 x 640 with a mouse (`hover: hover` and `pointer: fine`), always in
the desktop app, and on or off by hand in Settings > Screen. Laid out for 1920x1080 and 1366x768:

- the screens (Map, Stall, Caravan, Stock, Me) are a rail down the left, each with its key;
- the stall sheet docks at the right of the district map, and the map moves over to make room;
- the world map's trip card is a panel at the top right of the map;
- at the stall, the scene and the rugs are on the left; the buyer, the talk so far and the actions on the right;
- Stock is a gallery of large rug pictures; Me puts the character on the left and the lists on the right;
  Caravan's goods run in two columns;
- the world map uses the full 4608-pixel painting.

Keyboard and mouse: M map, S stall, C caravan, I stock, H me, Space pause or carry on travelling, 1 to 4
travel speed, Esc close or back, F11 (or Alt+Enter in the app) full screen, mouse wheel zooms the maps,
right-click a rug or the buyer to look closer. Hover over a rug, a person or an icon for its name.

## Build and run

The desktop tools live in `desktop/` with their own `package.json`, so Electron never enters the web
build's dependencies.

```
npm install                      # the game, once
npm --prefix desktop install     # Electron, @electron/packager and resedit, once (downloads Electron)

npm run build:pc                 # the game for the desktop app -> dist-pc/
npm run pc                       # build:pc, then open it in Electron (a dev window, its own save)
npm run package:linux            # -> release/Threads of Fortune-linux-x64/ and .zip
npm run package:win              # -> release/ThreadsOfFortune-win32-x64/ and .zip
npm run package:pc               # both
npm run build:pc-demo            # the Steam demo as a desktop app (mode pcdemo, .env.pcdemo)
npm run package:win-demo         # build:pc-demo, then the Windows package
```

`release/` and `dist-pc/` are gitignored. The Windows package is made on Linux without Wine: the .exe's
icon and version details are written afterwards with `resedit` (`desktop/package.mjs`). Each zip is about
900 MB, almost all of it the art, sound and voices.

To run: unzip and start `ThreadsOfFortune.exe` (Windows) or `threads-of-fortune` (Linux). On Linux as
root (a container) Electron needs `--no-sandbox`.

### What the app does

- Serves the game from its own folder at `app://tof/` (a fixed origin), so nothing is fetched from the
  network: art, sound, voices and fonts (`public/fonts/`, OFL) are all in the package. The build swaps the
  Google Fonts link for the local copy and leaves out the service worker and web manifest.
- Keeps the save in localStorage, which Electron stores in the app's data folder:
  `%APPDATA%\Threads of Fortune` on Windows, `~/.config/Threads of Fortune` on Linux. The dev window
  (`npm run pc`) uses `Threads of Fortune (dev)` instead. Export and Import of a backup file work as on the
  web (Settings > Move your game to another phone or computer).
- Window title "Threads of Fortune", the game's icon, F11 / Alt+Enter full screen, the window's size and
  full screen remembered between runs, one copy at a time, no browser menu, outside links open in the
  player's browser, Ctrl+Shift+I for the developer tools.
- `window.prompt` is not available in Electron (it returns nothing): naming a carpet of your own uses it
  and needs an inline field before the Steam release.

## What Steam needs next

1. **Steamworks partner account**: sign up at partner.steamgames.com, the Steam Direct fee is US$100 per
   game (recouped after US$1,000 of sales), plus tax and bank details and identity checks.
2. **App ID**: created with the fee. Put it in `desktop/steam_appid.txt` (one line, the number) for
   local testing; `desktop/package.mjs` copies it into the package. A demo gets its own app ID.
3. **Steamworks in the app**: `npm --prefix desktop install steamworks.js` (prebuilt native module for
   Electron, MIT; greenworks is the older alternative and needs rebuilding for each Electron version).
   `desktop/main.cjs` already tries to load it and, when it starts, the bridge's `steam` calls reach it:
   - achievements: call `achievements.unlock('<id>')` from the game (`src/platform/platform.ts`) where a
     title or milestone is earned (`src/game/rewards.ts` and the titles are the natural places), and enter
     the same ids as API names on the Steamworks achievements page;
   - Steam Cloud: either Steam Auto-Cloud on the data folder above (no code; the save is the LevelDB under
     `Local Storage/`), or write the save string with `cloud.write('save.json', ...)` after each save and
     read it on a fresh install. Auto-Cloud is simpler to start with.
   - the overlay: `electronEnableSteamOverlay()` is called when steamworks.js is present; test it, as
     Electron's overlay support depends on the GPU path.
4. **Depots**: one depot per platform (Windows x64, Linux x64). Upload the unzipped package folder of each
   with SteamPipe (`steamcmd` + an `app_build` .vdf naming the depots and content roots). Launch options:
   `ThreadsOfFortune.exe` on Windows, `threads-of-fortune` on Linux (with `--no-sandbox` only if the
   Steam Linux runtime needs it).
5. **Store page, capsules, screenshots, trailer, content survey, AI disclosure**: see the Steam launch
   materials in `docs/` (store copy and checklist). The store page must be live two weeks before release,
   and Valve reviews both the page and the build.
6. **Before shipping**: code-sign the Windows .exe (an OV or EV certificate) to avoid SmartScreen warnings
   outside Steam; test on a clean Windows 10/11 machine and on the Steam Deck (Linux build, 1280x800,
   where the desktop app uses the PC layout; Steam Input maps the Deck's controls to mouse and keys).
