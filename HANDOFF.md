# Threads of Fortune: moving to GitHub

This archive holds the full source (code, data, tests, tools). The art and audio (about 240 MB)
are not inside; they are the published files of the game artifact:
https://claude.ai/artifact/TvVNAP1MqcJuDqy6RvqVTx

Steps for the session that has push access to shenoply/Threads-of-fortune-:
1. Unpack this archive at the repo root.
2. List the artifact's files (Artifact tool, action list, scope files) and download every path
   under art/, audio/ and voices/ into public/ (Artifact read with `paths`, 256 per call),
   keeping the same relative paths.
3. npm install; npx vite build; cp public/page.html dist/.
4. Commit and push to main.
5. Keep every file under art/, audio/ and voices/ in the artifact. Do NOT remove the voices or
   radio mp3s to save space: the jsDelivr route (src/game/audio/cdn.ts) did not serve them in the
   published game, and without them dialogue and the radio fall silent. The game loads audio from
   next to the page first and only tries jsDelivr if a file is missing.
   The whole game is about 254 MB, just under the artifact's 256 MB limit; new art must be small.
