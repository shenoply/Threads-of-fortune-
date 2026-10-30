// A plain painted-frame silhouette for someone of the household who has no portrait yet: head and
// shoulders in a darker brown on the frame's own ground, a headscarf for a woman. Used instead of a
// large initial letter. A data URL, so it works in an <img> and on a canvas without a file.
const svg = (shape: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#4a3320"/><stop offset="1" stop-color="#1f1408"/></radialGradient></defs><rect width="120" height="150" fill="url(#g)"/><g fill="#140d06" opacity=".82">${shape}</g><g fill="none" stroke="#c9974a" stroke-opacity=".28" stroke-width="1.2">${shape.replace(/<(path|ellipse)/g, '<$1 ')}</g></svg>`)}`;

const MAN = '<ellipse cx="60" cy="58" rx="19" ry="23"/><path d="M22 150c2-30 16-44 38-46 22 2 36 16 38 46z"/><path d="M52 78h16l2 16H50z"/>';
const WOMAN = '<path d="M60 30c-16 0-26 12-26 30 0 12 4 22 6 30-10 6-18 22-20 60h80c-2-38-10-54-20-60 2-8 6-18 6-30 0-18-10-30-26-30z"/>';
const CHILD = '<ellipse cx="60" cy="66" rx="17" ry="20"/><path d="M30 150c2-26 13-38 30-40 17 2 28 14 30 40z"/>';

export const SILHOUETTE = { m: svg(MAN), f: svg(WOMAN), child: svg(CHILD) };
/** the silhouette for a son or daughter (or a man or a woman): a young child has the plain one */
export const silhouetteFor = (sex: 'son' | 'daughter' | 'm' | 'f' | undefined, young = false) =>
  young ? SILHOUETTE.child : sex === 'daughter' || sex === 'f' ? SILHOUETTE.f : SILHOUETTE.m;
