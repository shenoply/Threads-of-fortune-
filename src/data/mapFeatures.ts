// Hand-placed cartographic features, in real longitude/latitude, projected at runtime.
import geo from './geo.json';

export const PROJ = geo.proj as { lon0: number; lat1: number; kx: number; k: number };
export const proj = (lon: number, lat: number) => ({ x: (lon - PROJ.lon0) * PROJ.kx, y: (PROJ.lat1 - lat) * PROJ.k });

// Mountain ranges as polylines of [lon, lat]; peaks are drawn along them.
export const RANGES: { pts: [number, number][]; size: number }[] = [
  { pts: [[32.2, 36.9], [33.4, 36.9], [34.6, 37.1], [35.6, 37.4], [36.6, 37.7], [37.8, 37.9], [39.0, 38.2]], size: 1.25 }, // Taurus
  { pts: [[36.1, 36.2], [36.3, 36.9], [36.5, 37.3]], size: 1 }, // Amanus (Nur Dağları)
  { pts: [[35.6, 33.4], [35.9, 33.9], [36.1, 34.3], [36.35, 34.6]], size: 1.05 }, // Mount Lebanon
  { pts: [[35.8, 33.3], [36.1, 33.6], [36.4, 33.9], [36.7, 34.2]], size: 0.9 }, // Anti-Lebanon and Mount Hermon
  { pts: [[36.5, 32.4], [36.7, 32.7], [36.9, 32.9]], size: 0.75 }, // Jebel Druze
  { pts: [[35.0, 31.3], [35.15, 31.7], [35.25, 32.1]], size: 0.6 }, // Judean hills
  { pts: [[33.6, 28.3], [33.9, 28.6], [34.1, 28.9], [34.0, 29.2]], size: 1.05 }, // Sinai massif
  { pts: [[32.6, 28.2], [32.4, 28.8], [32.3, 29.4]], size: 0.8 }, // Red Sea hills (Galala)
  { pts: [[35.5, 29.3], [35.6, 30.0], [35.6, 30.8], [35.7, 31.4]], size: 0.75 }, // Edom and Moab
  { pts: [[40.5, 37.2], [41.5, 37.3], [42.4, 37.1]], size: 1 }, // Kurdish mountains
  { pts: [[32.9, 34.9], [33.1, 34.95]], size: 0.6 }, // Troodos
];

// Deserts: centre, radius in degrees
export const DESERTS: { lon: number; lat: number; r: number }[] = [
  { lon: 28.5, lat: 29.2, r: 2.6 }, // Western Desert
  { lon: 33.8, lat: 29.8, r: 1.2 }, // Sinai
  { lon: 38.8, lat: 32.4, r: 3.4 }, // Syrian Desert
  { lon: 36.8, lat: 29.2, r: 2.2 }, // northern Arabia
  { lon: 35.0, lat: 30.6, r: 0.7 }, // Negev
];

// Green, watered land
export const FERTILE: { pts: [number, number][]; w: number }[] = [
  { pts: [[31.0, 28.1], [30.9, 28.8], [31.2, 29.4], [31.25, 30.0], [31.1, 30.4]], w: 0.18 }, // Nile valley
  { pts: [[30.9, 30.3], [30.6, 30.8], [30.3, 31.2]], w: 0.45 }, // Delta west
  { pts: [[31.2, 30.3], [31.4, 30.8], [31.8, 31.2]], w: 0.45 }, // Delta east
  { pts: [[30.6, 29.3], [30.9, 29.3]], w: 0.3 }, // Fayoum
  { pts: [[34.6, 31.4], [34.9, 32.2], [35.1, 32.8], [35.5, 33.6], [35.9, 34.6], [35.9, 35.5]], w: 0.25 }, // Levant coast
  { pts: [[38.0, 36.6], [39.0, 36.0], [40.0, 35.3], [40.9, 34.5], [41.8, 34.2]], w: 0.25 }, // Euphrates
  { pts: [[36.2, 33.5], [36.35, 33.5]], w: 0.25 }, // Ghouta of Damascus
  { pts: [[37.1, 36.2], [36.7, 36.2]], w: 0.2 }, // Aleppo plain
];

export const PALMS: [number, number][] = [
  [31.2, 29.95], [31.18, 29.7], [31.05, 29.4], [30.95, 29.0], [30.85, 28.6], [31.05, 30.5], [30.8, 30.9], [31.4, 31.0],
  [30.7, 29.25], [30.95, 29.35], [33.6, 28.2], [34.55, 31.35], [35.45, 31.85], [36.3, 33.45], [34.3, 29.5], [35.0, 29.55],
];

export const LABELS: { text: string; lon: number; lat: number; kind: 'region' | 'sea' | 'minor' | 'river'; size?: number; rot?: number }[] = [
  { text: 'EGYPT', lon: 29.2, lat: 29.9, kind: 'region', size: 1.25 },
  { text: 'SINAI', lon: 33.6, lat: 29.7, kind: 'region', size: 0.9 },
  { text: 'PALESTINE', lon: 34.2, lat: 31.1, kind: 'region', size: 0.75, rot: -62 },
  { text: 'TRANSJORDAN', lon: 36.6, lat: 31.2, kind: 'region', size: 0.8 },
  { text: 'SYRIA', lon: 38.3, lat: 34.4, kind: 'region', size: 1.1 },
  { text: 'LEBANON', lon: 36.0, lat: 34.05, kind: 'region', size: 0.6, rot: -55 },
  { text: 'TURKEY', lon: 34.7, lat: 37.0, kind: 'region', size: 1 },
  { text: 'IRAQ', lon: 41.6, lat: 32.6, kind: 'region', size: 1 },
  { text: 'HEJAZ', lon: 37.6, lat: 28.5, kind: 'region', size: 0.85 },
  { text: 'CYPRUS', lon: 33.1, lat: 35.25, kind: 'minor', size: 0.8 },
  { text: 'Mediterranean Sea', lon: 29.6, lat: 33.8, kind: 'sea', size: 1.5 },
  { text: 'Red Sea', lon: 33.45, lat: 28.25, kind: 'sea', size: 0.75, rot: -58 },
  { text: 'Gulf of Suez', lon: 32.85, lat: 29.35, kind: 'sea', size: 0.5, rot: -60 },
  { text: 'Gulf of Aqaba', lon: 34.75, lat: 28.75, kind: 'sea', size: 0.5, rot: -75 },
  { text: 'Dead Sea', lon: 35.62, lat: 31.3, kind: 'minor', size: 0.45, rot: -80 },
  { text: 'Nile', lon: 31.35, lat: 28.7, kind: 'river', size: 0.7, rot: -80 },
  { text: 'Euphrates', lon: 39.6, lat: 35.85, kind: 'river', size: 0.7, rot: 30 },
  { text: 'Western Desert', lon: 28.4, lat: 28.7, kind: 'minor', size: 0.75 },
  { text: 'Syrian Desert', lon: 38.9, lat: 32.4, kind: 'minor', size: 0.85 },
  { text: 'Suez Canal', lon: 32.6, lat: 30.5, kind: 'river', size: 0.45, rot: -82 },
];

// Railways open in 1925: Egyptian State Railways, the wartime Sinai line (Kantara–Lydda), Palestine Railways,
// the Hejaz line and its Haifa branch, the Beirut–Damascus line and the Rayak–Homs–Aleppo line.
export const RAILWAYS: [number, number][][] = [
  [[29.92, 31.2], [30.45, 31.05], [31.0, 30.79], [31.25, 30.05]], // Alexandria–Tanta–Cairo
  [[31.25, 30.05], [31.13, 29.99], [31.1, 29.6], [30.84, 29.31]], // Cairo–Giza–Wasta–Fayoum
  [[31.25, 30.05], [31.6, 30.3], [32.27, 30.6], [32.3, 31.26]], // Cairo–Ismailia–Port Said
  [[31.25, 30.05], [31.9, 30.0], [32.55, 29.97]], // Cairo–Suez
  [[32.32, 30.82], [33.1, 31.1], [33.8, 31.15], [34.3, 31.4], [34.9, 31.95], [34.75, 32.05]], // Kantara–El Arish–Gaza–Lydda–Jaffa
  [[34.9, 31.95], [35.0, 31.75], [35.23, 31.78]], // Lydda–Jerusalem
  [[34.9, 31.95], [34.95, 32.5], [35.0, 32.8], [35.6, 32.7], [36.1, 32.6], [36.29, 33.51]], // Lydda–Haifa–Deraa–Damascus
  [[36.1, 32.6], [35.95, 31.95], [35.8, 31.0], [35.7, 30.2]], // Hejaz line south
  [[35.5, 33.89], [35.9, 33.8], [36.0, 33.85], [36.29, 33.51]], // Beirut–Rayak–Damascus
  [[36.0, 33.85], [36.72, 34.73], [36.75, 35.13], [37.16, 36.2]], // Rayak–Homs–Hama–Aleppo
];
