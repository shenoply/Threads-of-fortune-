// Buyers who once had ids taken from real people's names. The new ids are neutral; the recordings
// (public/voices) are still filed under the old ones, and older saves still hold them.
export const RENAMED_BUYERS: Record<string, string> = {
  'saad-zaghloul': 'fawzi-badri',
  'safiya-zaghloul': 'nawal-badri',
  'huda-shaarawi': 'amina-hilmi',
  'taha-hussein': 'yahya-mansur',
  'ahmed-shawqi': 'jamil-rawi',
  'munira-al-mahdiyya': 'maha-qadri',
  'umm-kulthum': 'salwa-nassar',
  'mohamed-abdel-wahab': 'adel-farouk',
  'sami-al-shawwa': 'bassem-khoury',
  'daoud-hosni': 'halim-saba',
  'youssef-wahbi': 'rafiq-najjar',
  'aziza-amir': 'muna-sayegh',
  'rose-al-youssef': 'dalia-barakat',
  'fatma-rushdi': 'lamia-shafiq',
  'charles-corm': 'georges-haddad',
  'ronald-storrs': 'edmund-fairburn',
  'raghib-nashashibi': 'salim-amin',
  'sassoon-eskell': 'isaac-benatar',
  'khalil-sakakini': 'tawfiq-nassar',
  'gertrude-bell': 'margaret-hensley',
};

/** new id -> the id its recordings and portraits are still filed under */
export const FILED_AS: Record<string, string> = Object.fromEntries(Object.entries(RENAMED_BUYERS).map(([o, n]) => [n, o]));
/** the id a buyer's files (art/portraits/<id>.jpg, voices/<id>.mp3) carry */
export const filedAs = (id: string) => FILED_AS[id] ?? id;

/** An old save, with every old buyer id (as a value, a key, or the head or tail of a "a:b" key) put to its new one. */
export function renameBuyerIds<T>(v: T): T {
  const str = (s: string): string => {
    if (RENAMED_BUYERS[s]) return RENAMED_BUYERS[s];
    if (s.includes(':')) return s.split(':').map((p) => RENAMED_BUYERS[p] ?? p).join(':');
    return s;
  };
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return str(x);
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x as Record<string, unknown>)) out[str(k)] = walk(val);
      return out;
    }
    return x;
  };
  return walk(v) as T;
}
