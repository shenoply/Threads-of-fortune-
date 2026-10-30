// Motor cars for sale, and the roads they can use, 1925.
// The makes are the game's own. Prices are in piastres (100 PT = £1). A Dodge tourer sold for about
// £275 in Jerusalem in the mid-1920s; the other prices are set around it.

export interface CarModel {
  id: string;
  name: string;
  /** piastres */
  price: number;
  /** seats, the driver (you) included */
  seats: number;
  /** rugs that fit in the back and on the running boards */
  luggage: number;
  /** 1 = the light tourer's pace on the road times below */
  speed: number;
  /** 0..1: the higher, the fewer breakdowns */
  reliability: number;
  /** petrol, oil and tyres, piastres an hour on the road */
  perHour: number;
  /** garages that sell it */
  soldIn: string[];
  /** the only kind allowed across the Syrian desert */
  desert: boolean;
  /** arrive rested, however long the drive */
  rested?: boolean;
  /** a one-time rise in reputation the first time you own one */
  rep?: number;
  blurb: string;
}

export const CARS: CarModel[] = [
  {
    id: 'car-tourer', name: 'Pemberton Light Tourer', price: 15000, seats: 4, luggage: 2, speed: 1, reliability: 0.88, perHour: 8,
    soldIn: ['cairo', 'jaffa', 'beirut'], desert: false,
    blurb: 'Four seats, a canvas hood and very little else. Cheap on petrol and easy to mend by the roadside.',
  },
  {
    id: 'car-six', name: 'Halloway Six Tourer', price: 27500, seats: 5, luggage: 4, speed: 1.1, reliability: 0.91, perHour: 12,
    soldIn: ['cairo', 'jaffa', 'beirut'], desert: false,
    blurb: 'A six-cylinder touring car of the kind the hotels hire out to visitors. Strong springs, room for four rugs.',
  },
  {
    id: 'car-saloon', name: 'Bellmont Saloon', price: 45000, seats: 5, luggage: 3, speed: 1.1, reliability: 0.93, perHour: 15,
    soldIn: ['cairo', 'beirut'], desert: false, rested: true, rep: 5,
    blurb: 'Glass windows and leather seats. You step out at the far end as fresh as you got in, and people notice a man with a motor car.',
  },
  {
    id: 'car-desert', name: 'Marchetti Desert Eight', price: 95000, seats: 5, luggage: 4, speed: 1.15, reliability: 0.94, perHour: 25,
    soldIn: ['beirut', 'baghdad'], desert: true,
    blurb: 'Eight cylinders, double tyres, spare tanks of water and petrol strapped to the sides. The only car the authorities let across the Syrian desert.',
  },
  {
    id: 'car-lorry', name: 'Ardley One-Ton Lorry', price: 32000, seats: 2, luggage: 20, speed: 0.6, reliability: 0.86, perHour: 18,
    soldIn: ['baghdad', 'beirut', 'cairo'], desert: false,
    blurb: 'Slow, loud and built to carry. Twenty rugs in the back under a tarpaulin, and room for one man beside you.',
  },
];

export const CAR_BY_ID: Record<string, CarModel> = Object.fromEntries(CARS.map((c) => [c.id, c]));

/** towns with a motor garage */
export const GARAGE_TOWNS = ['cairo', 'jaffa', 'beirut', 'baghdad'];
export const carsSoldIn = (town: string) => CARS.filter((c) => c.soldIn.includes(town));

/** the garage buys a car back at this share of its price */
export const RESALE = 0.6;
/** desert papers from the authorities in Damascus or Baghdad, for each crossing */
export const DESERT_PAPERS = 500;
/** a car carried as deck cargo between two ports */
export const CAR_FREIGHT = 400;

export interface CarRoad {
  a: string;
  b: string;
  /** hours at the light tourer's pace */
  hours: number;
  /** the Syrian desert: the desert car only, with papers */
  desert?: boolean;
  /** a pass that snow can shut in winter */
  pass?: 'lebanon' | 'persia';
}

// Roads a motor car could use in 1925. The times are the game's estimates for a light tourer on the
// roads of the day, except Beirut to Damascus, about 3½ hours over the Lebanon by car (sourced).
export const CAR_ROADS: CarRoad[] = [
  { a: 'giza', b: 'cairo', hours: 1 },
  { a: 'cairo', b: 'suez', hours: 4 },
  { a: 'giza', b: 'saqqara', hours: 1.5 },
  { a: 'jaffa', b: 'jerusalem', hours: 2 },
  { a: 'jerusalem', b: 'amman', hours: 5 }, // down to Jericho, over the Jordan and up to Amman
  { a: 'jaffa', b: 'beirut', hours: 9 }, // the coast road by Haifa, Acre, Tyre and Sidon
  { a: 'beirut', b: 'damascus', hours: 3.5, pass: 'lebanon' },
  { a: 'damascus', b: 'amman', hours: 7 },
  { a: 'damascus', b: 'aleppo', hours: 12 },
  { a: 'baghdad', b: 'khanaqin', hours: 5 },
  { a: 'khanaqin', b: 'kermanshah', hours: 10, pass: 'persia' },
  { a: 'kermanshah', b: 'hamadan', hours: 8, pass: 'persia' },
  { a: 'hamadan', b: 'tehran', hours: 12, pass: 'persia' },
  { a: 'damascus', b: 'baghdad', hours: 30, desert: true }, // by Rutba wells
];

/** the roads a model may use, for the garage list */
export const roadsLine = (c: CarModel) =>
  c.desert
    ? 'Every motor road: Egypt, Palestine, Syria, the Persian road, and across the Syrian desert'
    : 'Egypt, Palestine, Syria and the Persian road. Not the Syrian desert';
