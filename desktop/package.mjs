// Packages the desktop app: dist-pc/ (from `npm run build:pc`) with desktop/main.cjs and preload.cjs into an
// Electron app folder for each platform asked for, then a zip of each, all under release/ (gitignored).
//   node desktop/package.mjs linux win32
// Windows is packaged from Linux without Wine: the .exe's icon and version details are written afterwards
// with resedit (pure JavaScript). See docs/PC-BUILD.md.
import { packager } from '@electron/packager';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const DIST = join(REPO, 'dist-pc');
const OUT = join(REPO, 'release');
const NAME = 'Threads of Fortune';
const EXE = 'ThreadsOfFortune';
const game = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
const electronVersion = JSON.parse(readFileSync(join(HERE, 'node_modules', 'electron', 'package.json'), 'utf8')).version;

const platforms = process.argv.slice(2).length ? process.argv.slice(2) : ['linux'];
if (!existsSync(join(DIST, 'index.html'))) { console.error('No dist-pc/: run `npm run build:pc` first.'); process.exit(1); }

// the app's own folder: the two scripts, the icons and the built game
const STAGE = join(OUT, 'stage');
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const f of ['main.cjs', 'preload.cjs']) cpSync(join(HERE, f), join(STAGE, f));
cpSync(join(HERE, 'build'), join(STAGE, 'build'), { recursive: true });
cpSync(DIST, join(STAGE, 'dist'), { recursive: true });
if (existsSync(join(HERE, 'steam_appid.txt'))) cpSync(join(HERE, 'steam_appid.txt'), join(STAGE, 'steam_appid.txt'));
writeFileSync(join(STAGE, 'package.json'), JSON.stringify({
  name: 'threads-of-fortune', productName: NAME, version: game.version, description: NAME, main: 'main.cjs', author: NAME,
}, null, 2));

for (const platform of platforms) {
  const [dir] = await packager({
    dir: STAGE, out: OUT, overwrite: true, platform, arch: 'x64', electronVersion,
    name: platform === 'win32' ? EXE : NAME, executableName: platform === 'win32' ? EXE : 'threads-of-fortune',
    appVersion: game.version, appCopyright: `© ${new Date().getFullYear()} ${NAME}`,
    // the art and sound stay loose files: the app serves them straight from the folder
    asar: false, prune: false, derefSymlinks: true,
    // Linux can take its icon from the window; the Windows .exe gets its icon below (no Wine here)
    icon: platform === 'win32' ? undefined : join(HERE, 'build', 'icon.png'),
    ignore: [/^\/node_modules/],
  });
  if (platform === 'win32') await windowsResources(join(dir, `${EXE}.exe`));
  const zip = `${dir}.zip`;
  rmSync(zip, { force: true });
  // stored pictures and sound are already compressed: a light zip level is as small and much faster
  execFileSync('zip', ['-q', '-r', '-1', zip, '.'], { cwd: dir, stdio: 'inherit' });
  console.log(`${platform}: ${dir}\n  zip: ${zip}`);
}
rmSync(STAGE, { recursive: true, force: true });

// the .exe's icon, name and version as Windows shows them (Explorer, the taskbar, Properties)
async function windowsResources(exePath) {
  const ResEdit = await import('resedit');
  const { NtExecutable, NtExecutableResource, Resource, Data } = ResEdit;
  const exe = NtExecutable.from(readFileSync(exePath));
  const res = NtExecutableResource.from(exe);
  const ico = Data.IconFile.from(readFileSync(join(HERE, 'build', 'icon.ico')));
  const groups = Resource.IconGroupEntry.fromEntries(res.entries);
  const groupId = groups[0]?.id ?? 1, lang = groups[0]?.lang ?? 1033;
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, ico.icons.map((i) => i.data));
  const [vi] = Resource.VersionInfo.fromEntries(res.entries);
  const v = game.version.split('.').map(Number);
  vi.setFileVersion(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, 0, 1033);
  vi.setProductVersion(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: NAME, ProductName: NAME, InternalName: EXE, OriginalFilename: `${EXE}.exe`, CompanyName: NAME, LegalCopyright: `© ${new Date().getFullYear()} ${NAME}`,
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(exe);
  writeFileSync(exePath, Buffer.from(exe.generate()));
}
