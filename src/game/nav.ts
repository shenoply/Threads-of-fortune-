// Screens deep inside the game (Arran's lab, a town card) ask the app to show the map with a route
// planned to a town. The app owns navigation, so this is an event rather than a prop drilled down.
export const PLAN_EVENT = 'tof:plan-trip';
export const planTrip = (town: string) => window.dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: town }));
