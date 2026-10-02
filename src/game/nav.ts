// Screens deep inside the game (Arran's lab, a town card) ask the app to show the map with a route
// planned to a town. The app owns navigation, so this is an event rather than a prop drilled down.
export const PLAN_EVENT = 'tof:plan-trip';
export const planTrip = (town: string) => window.dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: town }));
/** set off at once by the quickest way you can afford (train, ship, motor car or on foot) */
export const travelTo = (town: string) => window.dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: { town, go: true } }));

// "Lunch at Malek's" from the stall or the evening strip: the app shows the Giza district and the
// district opens his shop. The request waits here if the district is not on screen yet.
export const MALEK_EVENT = 'tof:open-malek';
let malekWanted = false;
export const openMalek = () => { malekWanted = true; window.dispatchEvent(new Event(MALEK_EVENT)); };
export const takeMalekRequest = () => { const w = malekWanted; malekWanted = false; return w; };
