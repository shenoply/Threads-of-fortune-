// Malek's grill shop in Giza: the menu from the owner's handoff (malek-menu.json, kept in
// art-src/malek), adapted to the game's own systems. The handoff's illustrative 0-100 meters map
// like this (src/game/systems/malek.ts applies them):
//   satiety   -> the merchant's own "fed" meter (new, 0-100). Fed at nightfall means your own ration
//                is not drawn from the caravan's food that night.
//   energy    -> takes that much off fatigue (the existing 0-100 tiredness the stall already reads).
//   morale    -> "Well fed": that much extra patience with buyers at the stall for four game hours.
//   hydration -> the merchant's water meter (new, 0-100). Low water at nightfall adds fatigue.
// Prices are in piastres and are invented game balance, like the storage days: not 1925 prices, not
// real food-safety guidance. A day's bread for one person costs about 2 PT in the game's markets, so
// a 2 PT breakfast sits with them.

export type MalekItemId =
  | 'malek_ful' | 'malek_lentils' | 'malek_kofta' | 'malek_kebab' | 'malek_liver' | 'malek_stew'
  | 'malek_bastirma' | 'malek_road_pack' | 'malek_caravan_pack' | 'malek_tea';
export type MalekAvailability = 'morning' | 'all_day' | 'grill_hours' | 'daily_special';
export interface MalekEffects { satiety: number; energy: number; morale: number; hydration: number }
export interface MalekItem {
  id: MalekItemId; name: string; nameAr: string; price: number; description: string;
  availability: MalekAvailability; consumption: 'eat_in' | 'inventory';
  servings: number; weightKg: number; storageDays: number; effects: MalekEffects;
  /** fresh meat runs out: portions he grills a day (undefined: as much as anyone wants) */
  dailyStock?: number;
}

export const MALEK_MENU: MalekItem[] = [
  { id: 'malek_ful', name: 'Ful and flatbread', nameAr: 'فول وعيش', price: 2, description: 'Cheap filling breakfast; one simmering pot.', availability: 'morning', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 40, energy: 2, morale: 1, hydration: 0 } },
  { id: 'malek_lentils', name: 'Lentil soup and bread', nameAr: 'شوربة عدس وعيش', price: 3, description: 'Warm, cheap, and it counts as a drink.', availability: 'all_day', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 35, energy: 4, morale: 2, hydration: 10 } },
  { id: 'malek_kofta', name: 'Charcoal kofta plate', nameAr: 'كفتة مشوية', price: 7, description: 'Minced meat skewers, bread, onions and parsley.', availability: 'grill_hours', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 65, energy: 8, morale: 4, hydration: 0 }, dailyStock: 8 },
  { id: 'malek_kebab', name: 'Lamb kebab plate', nameAr: 'كباب ضاني', price: 10, description: 'The best plate he does, and he does not do many of them.', availability: 'grill_hours', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 75, energy: 10, morale: 6, hydration: 0 }, dailyStock: 4 },
  { id: 'malek_liver', name: 'Grilled liver and bread', nameAr: 'كبدة مشوية وعيش', price: 5, description: 'Liver straight off the charcoal, in bread.', availability: 'grill_hours', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 50, energy: 6, morale: 3, hydration: 0 }, dailyStock: 6 },
  { id: 'malek_stew', name: 'Beef and onion stew', nameAr: 'لحمة بالبصل', price: 8, description: "Today's pot, with bread. When it is gone, it is gone.", availability: 'daily_special', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 70, energy: 9, morale: 5, hydration: 0 }, dailyStock: 6 },
  { id: 'malek_bastirma', name: 'Bastirma travel portion', nameAr: 'بسطرمة للسفر', price: 6, description: 'Dry-cured spiced beef from his supplier in Cairo, wrapped in paper. The salt costs you water.', availability: 'all_day', consumption: 'inventory', servings: 1, weightKg: 0.15, storageDays: 7, effects: { satiety: 30, energy: 2, morale: 1, hydration: -8 } },
  { id: 'malek_road_pack', name: 'Road parcel: bastirma and dry bread', nameAr: 'زاد الطريق: بسطرمة وعيش ناشف', price: 9, description: 'Cured beef and dry bread in separate paper parcels, a cloth outer wrap. No fresh vegetables.', availability: 'all_day', consumption: 'inventory', servings: 1, weightKg: 0.3, storageDays: 7, effects: { satiety: 50, energy: 3, morale: 2, hydration: -8 } },
  { id: 'malek_caravan_pack', name: 'Three-serving caravan parcel', nameAr: 'زاد القافلة', price: 24, description: 'Three separately wrapped road portions. Each one counts when you eat it, not when you buy it.', availability: 'all_day', consumption: 'inventory', servings: 3, weightKg: 0.9, storageDays: 7, effects: { satiety: 50, energy: 3, morale: 2, hydration: -8 } },
  { id: 'malek_tea', name: 'Small sweet tea', nameAr: 'شاي', price: 1, description: 'Takes the edge off. Once every four hours does any good.', availability: 'all_day', consumption: 'eat_in', servings: 1, weightKg: 0, storageDays: 0, effects: { satiety: 0, energy: 2, morale: 1, hydration: 8 } },
];
export const malekItem = (id: MalekItemId) => MALEK_MENU.find((m) => m.id === id)!;
