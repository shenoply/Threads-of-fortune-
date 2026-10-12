# Tests

Browser tests drive the game in headless Chromium (Playwright); a few `.ts` checks run the game code
directly with `tsx`, no browser.

## Before you start

The browser tests need the game running. By default they use the Vite dev server on port 5173:

```
npx vite --port 5173
```

To test a production build instead, run `npm run build && npx vite preview --port 4173` and pass `PORT=4173`.

## Run everything

```
node tests/run-all.mjs                 # every tests/*.mjs, two at a time, then a pass/fail summary
node tests/run-all.mjs malek opening   # only tests whose file name contains one of these words
```

| Setting   | Default                 | What it does |
|-----------|-------------------------|--------------|
| `PORT`    | `5173`                  | game server port |
| `JOBS`    | `2`                     | tests run side by side (more than 2 makes the heavy screens time out) |
| `TIMEOUT` | `600`                   | seconds per test; a few long playthroughs get 900 (see `LONG` in run-all.mjs) |
| `RETRIES` | `1`                     | a failed test runs once more; a pass on the retry is listed as flaky |
| `LOGS`    | `/dev/shm/tests-logs`   | one log per test (`<name>.log`, `<name>.retry1.log`) |
| `SHOTS`   | `/dev/shm/tests-shots`  | screenshots; run-all gives each test its own `SHOTS/<name>` folder |

A test fails when it exits non-zero, runs out of time, or prints a line containing `FAIL` or `FAILED`.
Screenshots never go into the repository.

## Run one test

```
node --import ./tests/_nohmr.mjs tests/opening.mjs   # as run-all runs it
node tests/opening.mjs                               # plain; fine when nobody is editing src/
npx tsx tests/malek-haggle.ts                        # the .ts / .tsx checks (no browser, no server)
```

Most tests print `PASS` / `FAIL` lines or `ok` / `FAIL` per check; the playthrough scripts (`play`,
`play2`, `worldplay`, `worldplay2`, `caravanplay`, `firsthour`, ...) print what happened and only fail on
a crash or a page error.

## Shared helpers

- `_env.mjs`: `PORT`, `SHOTS` (created if missing) and helpers for flows that many tests share:
  `serveFirstCustomer` (day one opens on the Giza district with "Wait for the customer"),
  `fromTownMenu` (arriving in a town opens a full-screen menu over everything), `tapPlace` (tap a town on
  the world map even when it is panned off screen), `openBilgin`, `talk` (answer a dialogue by the words
  of its options) and `visibleIds` (what is on screen, for failure messages).
- `_nohmr.mjs`: preloaded by run-all. Other people edit `src/` while tests run; Vite's hot updates would
  remount screens mid-test. It gives every page a silent stand-in for Vite's hot-update socket (set
  `HMR=1` to keep live updates).

## Writing to the save

Tests set up a situation by editing the save in localStorage and reloading. The running game autosaves
and would write over such an edit before the reload, so every edit in these tests goes through the same
expression (`window.__tofEdit = true, localStorage.setItem(k, ...)`, ...) that holds the game's own saves
off for four seconds, until the reload. Copy it when you write a new test.

Tests that call the store directly look up the store module the page actually loaded
(`performance.getEntriesByType('resource')`, the URL containing `/src/game/state/store.ts`): after a hot
update Vite serves it as `store.ts?t=...`, and a bare `import('/src/game/state/store.ts')` would get a
second, empty copy of the store.

Useful localStorage switches: `tof-intro-seen-v2=1` (no opening film on the title), `tof-films-once=1`,
`tof-skip-chapters=1` (skip the opening chapter, which keeps every town but Giza and Cairo locked).

## Not run by run-all

- `*.ts`, `*.tsx`: run with `npx tsx tests/<name>.ts`.
- `legacy/`: retired scripts, kept for reference (see `legacy/README.md`).
- `sim/`: the balance simulator.
