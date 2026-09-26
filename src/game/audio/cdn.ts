// Heavy audio (mp3s) is served from the GitHub repo through jsDelivr, so the published artifact
// doesn't have to carry it. If the CDN can't serve a file, fall back to the page-relative copy.
const CDN = 'https://cdn.jsdelivr.net/gh/shenoply/Threads-of-fortune-@main/public/';
let cdnDown = !import.meta.env.PROD;

export async function fetchMedia(path: string): Promise<Response> {
  if (!cdnDown) {
    try {
      const r = await fetch(CDN + path);
      if (r.ok) return r;
    } catch { /* fall through */ }
    cdnDown = true;
  }
  return fetch(path);
}
