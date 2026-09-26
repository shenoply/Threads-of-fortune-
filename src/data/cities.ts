// Map positions are percentages on the illustrated Levant map (art/map-levant.jpg).
export interface CityDef {
  id: string;
  name: string;
  x: number;
  y: number;
  blurb: string;
  demand: string;
  unlock: { sales: number; reputation: number; travel: number } | null;
}

export const CITIES: CityDef[] = [
  { id: 'giza', name: 'Giza', x: 44.9, y: 80, blurb: 'Your borrowed corner in the shadow of the pyramids.', demand: 'Households, hotels, travellers', unlock: null },
  { id: 'cairo', name: 'Cairo', x: 46.6, y: 65, blurb: 'Wealthy households, decorators and bigger suppliers.', demand: 'Fine wool, workshop pieces', unlock: { sales: 6, reputation: 8, travel: 80 } },
  { id: 'alexandria', name: 'Alexandria', x: 37.8, y: 62, blurb: 'Hotels, port traders and export buyers.', demand: 'Hard-wearing stock in bulk', unlock: { sales: 12, reputation: 15, travel: 110 } },
  { id: 'jerusalem', name: 'Jerusalem', x: 58.8, y: 57, blurb: 'Scholars, institutions and Levantine households.', demand: 'Prayer rugs, documented pieces', unlock: { sales: 20, reputation: 25, travel: 160 } },
  { id: 'damascus', name: 'Damascus', x: 66.9, y: 40, blurb: 'Expert dealers, fine textiles, elite collectors.', demand: 'Silk, antiques, provenance', unlock: { sales: 30, reputation: 40, travel: 220 } },
  { id: 'istanbul', name: 'Istanbul', x: 46.7, y: 8.5, blurb: 'Later chapter.', demand: 'Collectors and palace sales', unlock: { sales: 50, reputation: 60, travel: 320 } },
  { id: 'baghdad', name: 'Baghdad', x: 87, y: 42, blurb: 'Later chapter.', demand: 'Persian and Mesopotamian trade', unlock: { sales: 60, reputation: 70, travel: 360 } },
];
