// The real news of every day the game covers, 10 March 1925 to 31 March 1926.
// Egypt first; on days with nothing from Egypt, the wider world. Written as the Courier's wire column,
// only with what was known on that day. Source for each month: the Wikipedia month page named in SOURCES.

export interface Wire { head: string; body: string; eg?: boolean }

export const SOURCES: Record<string, string> = {
  '1925-03': 'https://en.wikipedia.org/wiki/March_1925',
};

export const DAILY: Record<string, Wire[]> = {
  '1925-03-10': [
    { head: 'Vienna Author Shot in His Office', body: 'The writer Hugo Bettauer, whose novel "The City Without Jews" mocked the anti-Semites, has been shot in his Vienna office by a young Nazi, Otto Rothstock. He is gravely hurt.' },
    { head: 'Senate Deadlocked on Attorney General', body: 'The US Senate tied forty to forty on Charles B. Warren for Attorney General. Vice-President Dawes, who could have broken the tie, did not reach the Capitol in time.' },
  ],
  '1925-03-11': [
    { eg: true, head: 'Egypt Votes Tomorrow', body: 'Electors across Egypt go to the polls tomorrow. The Wafd of Zaghlul Pasha faces the new Ittihad party, which is close to the Palace, and the Liberal Constitutionalists.' },
    { head: '"No, No, Nanette" Opens in London', body: 'The American musical comedy "No, No, Nanette", with the song "Tea for Two", has opened at the Palace Theatre in London.' },
  ],
  '1925-03-12': [
    { eg: true, head: 'Egypt Votes for a New Chamber', body: 'Polling was held across Egypt today. The Wafd, which held nearly every seat in the last Chamber, faces close contests with the Ittihad and the Liberal Constitutionalists.' },
    { head: 'Sun Yat-sen Dies in Peking', body: 'Dr Sun Yat-sen, father of the Chinese Republic and leader of the Kuomintang, has died in Peking at the age of 58.' },
  ],
  '1925-03-13': [
    { eg: true, head: 'Election Returns Come In', body: 'Returns from the provinces show the Wafd ahead, but without the great majority it held before. The Ittihad and the Liberals claim many seats.' },
    { head: 'Police Fire on Meeting at Halle', body: 'German police broke up a Communist meeting at Halle addressed by Ernst Thälmann. Several men were killed and many wounded.' },
  ],
  '1925-03-14': [
    { head: 'Walter Camp Dies', body: 'Walter Camp, called the father of American football, has died in New York at 65.' },
  ],
  '1925-03-15': [
    { eg: true, head: 'Both Sides Claim the Chamber', body: 'The Wafd and the Government parties each claim a majority in the new Chamber. The count of seats will be settled only when Parliament meets on the 23rd.' },
  ],
  '1925-03-16': [
    { head: 'Earthquake in Yunnan', body: 'A great earthquake has struck the Chinese province of Yunnan. The city of Dali is reported largely destroyed, with thousands dead.' },
    { head: 'Senate Rejects Warren Again', body: 'The US Senate has rejected Charles B. Warren as Attorney General a second time. President Coolidge must find another man.' },
  ],
  '1925-03-17': [
    { head: 'Yunnan Death Roll Grows', body: 'Reports reaching Shanghai put the dead of the Yunnan earthquake at several thousand, most of them at Dali.' },
  ],
  '1925-03-18': [
    { eg: true, head: 'Deputies Arrive in Cairo', body: 'The new deputies are gathering in Cairo for the opening of Parliament on the 23rd. Hotels near the Chamber are full.' },
    { head: 'Fire Destroys Madame Tussaud\'s', body: 'Fire has gutted Madame Tussaud\'s waxworks in London. The Napoleon relics are lost; the moulds for the figures were saved.' },
  ],
  '1925-03-19': [
    { head: 'Tornado Kills Hundreds in America', body: 'A tornado tore across Missouri, Illinois and Indiana yesterday. Murphysboro, Illinois, is the worst hit, and the dead number several hundred.' },
  ],
  '1925-03-20': [
    { head: 'Lord Curzon Dies', body: 'Lord Curzon, Viceroy of India from 1899 to 1905 and later Foreign Secretary, has died in London at 66.' },
    { head: 'Catalan Commonwealth Abolished', body: 'General Primo de Rivera has dissolved the Mancomunitat, the joint government of the four Catalan provinces.' },
  ],
  '1925-03-21': [
    { head: 'Tennessee Forbids Teaching Evolution', body: 'Governor Peay has signed the Butler Act: no public school in Tennessee may teach that man descended from a lower order of animals.' },
  ],
  '1925-03-22': [
    { eg: true, head: 'Parliament Meets Tomorrow', body: 'All eyes are on tomorrow\'s opening of the Chamber. The Wafd will put up Zaghlul Pasha for Speaker; the Government parties will oppose him.' },
  ],
  '1925-03-23': [
    { eg: true, head: 'Parliament Opens and Is Dissolved the Same Day', body: 'The new Chamber elected Zaghlul Pasha its Speaker this afternoon. By evening King Fuad had dissolved it, on the advice of the Ziwar ministry.' },
  ],
  '1925-03-24': [
    { eg: true, head: 'Wafd Protests the Dissolution', body: 'The Wafd calls yesterday\'s dissolution a blow against the Constitution. By law new elections must follow.' },
  ],
  '1925-03-25': [
    { head: 'Palestine Strikes as Balfour Lands', body: 'Arab shops across Palestine closed and black flags were hung as Lord Balfour arrived for the opening of the Hebrew University.' },
  ],
  '1925-03-26': [
    { head: 'Hugo Bettauer Dies of His Wounds', body: 'The Viennese writer Hugo Bettauer, shot in his office on the 10th, has died in hospital.' },
  ],
  '1925-03-27': [
    { head: 'Balfour Tours Palestine', body: 'Lord Balfour is touring the Jewish colonies of Palestine ahead of the opening of the Hebrew University on 1 April. Arab leaders have called for a boycott.' },
  ],
  '1925-03-28': [
    { head: 'Lord Rawlinson Dies in India', body: 'Lord Rawlinson, Commander-in-Chief in India, has died at Delhi at 61.' },
    { head: 'Cambridge Win the Boat Race', body: 'Cambridge won the Boat Race on the Thames against Oxford.' },
  ],
  '1925-03-29': [
    { head: 'Germany Votes for a President', body: 'Germans voted today to choose a successor to President Ebert. Karl Jarres, Otto Braun and Wilhelm Marx lead the field.' },
  ],
  '1925-03-30': [
    { head: 'German Election Undecided', body: 'Karl Jarres led yesterday\'s presidential poll with nearly 39 per cent, but no candidate has a majority. There will be a second round in April.' },
    { head: 'Rudolf Steiner Dies', body: 'The Austrian philosopher Rudolf Steiner has died at Dornach, Switzerland, at 64.' },
  ],
  '1925-03-31': [
    { head: 'Iran Adopts a Solar Calendar', body: 'The Persian Majlis has adopted a solar calendar with the old Persian month names, the year beginning at the spring equinox.' },
    { head: 'Soldiers Drown in the Weser', body: 'A pontoon bridge collapsed under a German army column on the Weser near Minden. Dozens of soldiers were drowned.' },
  ],
};

import EGYPT from './egypt1925_research.json';
import Q2 from './world/1925-04_06.json';
import Q3 from './world/1925-07_09.json';
import Q4 from './world/1925-10_12.json';
import Q5 from './world/1926-01_03.json';

// the rest of the year, researched month by month from the Wikipedia month pages and cross-checked
for (const q of [Q2, Q3, Q4, Q5] as Record<string, unknown>[]) {
  for (const [k, v] of Object.entries(q)) {
    if (k === '_src') { Object.assign(SOURCES, v as Record<string, string>); continue; }
    DAILY[k] = (v as { head: string; body: string; eg?: boolean }[]).map((x) => ({ head: x.head, body: x.body, eg: x.eg || undefined }));
  }
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const title = (h: string) => (h === h.toUpperCase() ? h.toLowerCase().replace(/(^|[\s'"(-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase()) : h);
/** Egypt and the region, researched item by item; only items with a sourced exact date are printed. */
const EG: Record<string, Wire[]> = {};
for (const e of EGYPT as { date: string; head: string; body: string; src: string; approx?: boolean }[]) {
  if (e.approx) continue;
  (EG[e.date] ??= []).push({ head: title(e.head), body: e.body, eg: true });
}

/** The real news of a calendar date: Egypt first, then the world. */
export function wiresOn(date: Date): Wire[] {
  const k = iso(date);
  const w = [...(EG[k] ?? []), ...(DAILY[k] ?? []).filter((x) => !(EG[k] ?? []).some((y) => y.head === x.head))];
  return [...w.filter((x) => x.eg), ...w.filter((x) => !x.eg)];
}
export const sourceFor = (date: Date) => SOURCES[iso(date).slice(0, 7)];
