// Audio (mp3s) is served next to the page. If a copy is missing there (a slimmed-down build),
// fall back to the GitHub repo through jsDelivr.
const CDN = 'https://cdn.jsdelivr.net/gh/shenoply/Threads-of-fortune-@main/public/';

export async function fetchMedia(path: string): Promise<Response> {
  try {
    const r = await fetch(path);
    if (r.ok) return r;
  } catch { /* fall through */ }
  if (!import.meta.env.PROD) return fetch(path);
  return fetch(CDN + path);
}
