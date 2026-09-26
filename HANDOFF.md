# Threads of Fortune: moving to GitHub

This archive holds the full source (code, data, tests, tools). The art and audio (about 240 MB)
are not inside; they are the published files of the game artifact:
https://claude.ai/artifact/TvVNAP1MqcJuDqy6RvqVTx

Steps for the session that has push access to Shenoply/threads-of-fortune:
1. Unpack this archive at the repo root.
2. List the artifact's files (Artifact tool, action list, scope files) and download every path
   under art/, audio/ and voices/ into public/ (Artifact read with `paths`, 256 per call),
   keeping the same relative paths.
3. npm install; npx vite build; cp public/page.html dist/.
4. Commit and push to main.
5. Then point heavy audio at https://cdn.jsdelivr.net/gh/Shenoply/threads-of-fortune@main/public/...
   so the artifact no longer has to carry it.
