// The date as the paper prints it ("Monday, 9 March 1925"). Its own small module: the map, the camp and the
// town screens need only this, and importing it from newspaper.ts pulled the whole paper (news, the 1925
// wires, the world) into the opening download.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** day 0 is Monday 9 March 1925 (the same calendar as life.ts dateOfDay) */
export function dateLine(day: number) {
  const d = new Date(Date.UTC(1925, 2, 9 + day));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
