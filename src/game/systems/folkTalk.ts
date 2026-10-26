// What the world's people say when you stop to talk: a greeting that knows you, the news of their
// town and the road, their trade, their family, what they think of their neighbours, and their own
// story. Made from their role, their traits, how they feel about you and the day, so a second visit
// is not the first. Pure: the store keeps who you have met and how they feel (GameState.folk).
import { SETTLEMENTS } from '../../data/world';
import { rumoursOn } from '../economy/life';
import { marketOn } from '../economy/market';
import { world, ageNow, type Person } from './population';

export type Topic = 'news' | 'trade' | 'family' | 'gossip' | 'self';
export const TOPIC_WORD: Record<Topic, string> = { news: 'News of the town and the road', trade: 'His trade', family: 'His family', gossip: 'Ask about someone', self: 'His own story' };
export const topicWord = (t: Topic, p: Person) => (p.sex === 'f' ? TOPIC_WORD[t].replace(/\bHis\b/, 'Her') : TOPIC_WORD[t]);

export interface FolkState {
  /** how each feels about you, -100 to 100 */
  rel: Record<string, number>;
  /** the day you first spoke */
  met: Record<string, number>;
  /** the last day you spoke, so a day's talk counts once */
  talked: Record<string, number>;
  /** people you have heard of without meeting (named in talk): their pages open in the encyclopedia */
  heard: string[];
  /** what has passed between you, newest last */
  log: { day: number; who: string; text: string }[];
}
export const FOLK_START: FolkState = { rel: {}, met: {}, talked: {}, heard: [], log: [] };

export const relWord = (v: number, met: boolean) => (!met ? 'A stranger' : v <= -30 ? 'Hostile' : v <= -6 ? 'Cool' : v < 10 ? 'Knows you' : v < 30 ? 'Friendly' : v < 60 ? 'Trusts you' : 'A close friend');

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pickD = <T,>(a: T[], seed: string) => a[hash(seed) % a.length];
const town = (id: string) => SETTLEMENTS.find((s) => s.id === id)?.name ?? id;
const he = (p: Person) => (p.sex === 'f' ? 'she' : 'he');
const his = (p: Person) => (p.sex === 'f' ? 'her' : 'his');

export interface Said { text: string; mentions: string[] }
export interface TalkCtx { day: number; you: string; rel: number; met: boolean; times: number; band?: { leader: string; road: string } }

/** the first words, which know whether they have met you and how it went */
export function greeting(p: Person, c: TalkCtx): string {
  const seed = `${p.id}:${c.day}`;
  const t = p.traits;
  if (!c.met) {
    const bless = p.faith === 'christian' ? `"God keep you." ${p.short} sets down ${his(p)} glass and looks you over. "And who are you, son?"` : p.faith === 'jewish' ? `"Shalom, and peace." ${p.short} makes room on the bench. "Sit, sit. You are not from here."` : pickD([`"Peace be upon you." ${p.short} finishes ${his(p)} line of the Quran before looking up. "And who are you, son?"`, `"And upon you be peace." ${p.short} counts the beads of ${his(p)} rosary to the end before looking up.`], p.id);
    const open = t.includes('pious') ? bless : t.includes('proud') ? `${p.short} looks you over before he answers. "I have heard of a young man from Giza who sells rugs. Is that you?"` :
      t.includes('cheerful') ? `${p.short} is on his feet before you reach him. "A new face! Sit, sit. Tea, or coffee?"` :
      t.includes('cunning') ? `${p.short} smiles with his mouth only. "A Giza merchant. You will want something, then. Sit."` :
      t.includes('gossip') ? `"You are Hassan's boy, the one with the cat." ${p.short} already knows. "Sit down and tell me what is true."` :
      t.includes('stern') ? `${p.short} does not smile. "Hassan's son. I knew your father. Sit, and do not waste my morning."` :
      t.includes('curious') ? `"Giza? Then you will tell me what the English are building at the pyramids." ${p.short} pulls up a stool.` :
      t.includes('generous') ? `${p.short} has tea poured before you have said your name. "Drink first. Business after."` :
      t.includes('greedy') ? `${p.short} glances at your purse before your face. "Welcome, welcome. What are you buying?"` :
      t.includes('honest') ? `"I do not know you, but I know your trade. Sit." ${p.short} pours the tea himself.` :
      pickD([`${p.short} nods to the cushion beside him. "Sit. You have come a long way, by your shoes."`, `${p.short} looks up from ${his(p)} accounts. "A stranger. Sit, I need a rest from these figures."`], p.id);
    return p.sex === 'f' ? open.replace(/\bhe\b/g, 'she').replace(/\bhis\b/g, 'her').replace(/\bhim\b/g, 'her') : open;
  }
  if (c.rel <= -30) return pickD([`${p.short} does not get up. "You. Say what you came for."`, `"I thought I had seen the last of you." ${p.short} does not offer tea.`], seed);
  if (c.rel <= -6) return pickD([`${p.short} gives you a short nod. "Effendi."`, `"Back again." ${p.short} goes on with what ${he(p)} was doing.`], seed);
  if (c.rel >= 60) return pickD([`${p.short} embraces you. "My son! Why did you not send word you were coming?"`, `"There he is." ${p.short} is already calling for tea. "Sit, sit. How is the trade, how is your mother?"`], seed);
  if (c.rel >= 30) return pickD([`"Hassan's son!" ${p.short} waves you over. "The coffee is just made."`, `${p.short} laughs when ${he(p)} sees you. "Again! The road must be good to you."`], seed);
  return pickD([`${p.short} remembers you. "The Giza merchant. Sit."`, `"Ah, you." ${p.short} moves the glasses aside to make room. "What news from Cairo?"`, `${p.short} looks up. "Back in ${town(p.home)}? Sit."`], seed);
}

export function talk(p: Person, topic: Topic, c: TalkCtx): Said {
  const w = world();
  const seed = `${p.id}:${topic}:${c.day}:${c.times}`;
  if (topic === 'news') {
    const rs = rumoursOn(c.day).filter((r) => !r.sid || r.sid === p.home || p.role === 'caravan');
    const r = rs.length ? pickD(rs, seed) : null;
    const m = marketOn(c.day);
    const market = m ? ` ${m.why}` : '';
    const band = c.band && p.role !== 'kin' && hash(seed) % 3 === 0 ? ` And keep off ${c.band.road} without men: ${c.band.leader} is out again.` : '';
    return { text: `"${r ? r.text : `Nothing much in ${town(p.home)}. Prices up, tempers down, the same as always.`}"${market}${band}`, mentions: [] };
  }
  if (topic === 'trade') {
    const st = SETTLEMENTS.find((s) => s.id === p.home);
    const wants = Object.entries(st?.demand ?? {}).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase());
    if (p.role === 'souq' || p.role === 'dealer') {
      const what = wants.length ? `What sells here is ${wants.slice(0, 2).join(' and ')}.` : 'Here they buy what is cheap and talk about what is fine.';
      const tip = p.traits.includes('honest') ? 'If you buy from me, I will tell you what it is. That is more than the man next door will.' : p.traits.includes('greedy') ? 'I pay fair and I sell dear, and I sleep well.' : p.traits.includes('cunning') ? 'Bring me something nobody else has, and we will both do well out of it.' : 'Bring me good village work, clean, and I will always take it.';
      return { text: `"${what} ${tip}"`, mentions: [] };
    }
    if (p.role === 'caravan') {
      const [a, b] = p.route ?? [p.home, p.home];
      return { text: `"${p.goods ? p.goods[0].toUpperCase() + p.goods.slice(1) : 'Goods'}, ${town(a)} to ${town(b)} and back, twice a season. ${pickD(['The camels know the road better than I do.', 'The wells were low at the half-way station last time.', 'Every customs post wants a little more each year.', 'I lost two camels in the spring. The Lord gives and takes.'], seed)}${p.goods && /carpet/i.test(p.goods) ? ' If you want a rug from the bales, we can talk.' : ''}"`, mentions: [] };
    }
    if (p.role === 'merchant') return { text: `"${p.goods ? p.goods[0].toUpperCase() + p.goods.slice(1) : 'Goods'}. ${pickD(['Prices are up, because everybody says they are.', 'The English buy everything and pay late.', 'I buy in the spring and sell in the winter, as my father did.', 'A man in my line hears every rumour first. Most of them are true.'], seed)}"`, mentions: [] };
    if (p.role === 'notable') {
      const fam = (w.byCity[p.home] ?? []).map((id) => w.people[id]).find((x) => x.bride && x.id !== p.id);
      const intro = fam ? ` There is a good family in this town with a daughter of age: ${fam.title.replace('Daughter of ', '')}'s. I could put in a word.` : '';
      return { text: `"People bring me their quarrels, and I send them home with less of them." ${p.short} smiles.${intro}`, mentions: fam ? [fam.id, ...(fam.father ? [fam.father] : [])] : [] };
    }
    if (p.role === 'craft') return { text: `"${pickD(['Madder for red, indigo for blue, pomegranate rind for yellow. The rest is patience.', 'A rug comes to me with a hole in it and goes home without one, and nobody can say where it was.', 'Bring me your torn fringes. I will not cheat you, I am too old to bother.'], seed)}"`, mentions: [] };
    return { text: `"${pickD(['My father sees to the trade. I see to my father.', 'Ask my father. He will tell you more than you wish to know.'], seed)}"`, mentions: p.father ? [p.father] : [] };
  }
  if (topic === 'family') {
    const kin = [p.spouse, ...p.children].filter(Boolean).map((id) => w.people[id!]);
    if (!kin.length) return { text: `"No wife yet, no sons. My mother says it every morning." ${p.short} laughs.`, mentions: [] };
    const parts = kin.map((k) => (k.id === p.spouse ? `my ${p.sex === 'f' ? 'husband' : 'wife'}, ${k.short}` : `${k.sex === 'm' ? 'a son' : 'a daughter'}, ${k.short}, ${ageNow(k, c.day)}`));
    const proud = kin.find((k) => k.bride) ? ` ${kin.find((k) => k.bride)!.short} is the clever one. Half the families of ${town(p.home)} have asked for her.` : '';
    return { text: `"God has been kind: ${parts.join('; ')}."${proud}`, mentions: kin.map((k) => k.id) };
  }
  if (topic === 'gossip') {
    const others = (w.byCity[p.home] ?? []).map((id) => w.people[id]).filter((x) => x.id !== p.id && x.role !== 'kin' && x.house !== p.house);
    const o = others.length ? pickD(others, seed) : null;
    if (!o) return { text: '"I mind my own business, effendi. It keeps me busy enough."', mentions: [] };
    const view = o.traits.includes('honest') ? 'as honest as the day is long. Dull, but honest' : o.traits.includes('greedy') ? 'would sell his mother\'s shroud and haggle over the stitching' : o.traits.includes('cunning') ? 'never says what he means. Count your fingers after you shake his hand' : o.traits.includes('generous') ? 'too generous for his own good. His sons will have nothing' : o.traits.includes('proud') ? 'proud as a pasha. Never ask him to wait' : o.traits.includes('pious') ? 'a good man, and lets everyone know it' : o.traits.includes('gossip') ? 'a worse gossip than I am, and that is saying something' : 'decent enough. We do not quarrel';
    const said = p.traits.includes('honest') ? `"${o.name}? I will say only good of him: he is ${view.split('.')[0]}."` : `"${o.name}?" ${p.short} lowers ${his(p)} voice. "He is ${view}."`;
    return { text: o.sex === 'f' ? said.replace(/\bhe\b/g, 'she').replace(/\bHe\b/g, 'She').replace(/\bhis\b/g, 'her').replace(/\bhim\b/g, 'her') : said, mentions: [o.id] };
  }
  // self
  const years = p.role === 'caravan' ? `${Math.max(6, p.age - 24)} years on the road` : `${Math.max(8, p.age - 18)} years in ${town(p.home)}`;
  const tail = pickD([`"${years}. Long enough to know better, not long enough to stop."`, `"${years}. My father did the same, and his father. Where else would I go?"`, `"${years}, and the best of it was the year before last. It is always the year before last."`, `"${years}. Ask me again in ten and I will tell you something worth hearing."`], `${p.id}:${c.times}`);
  return { text: `${p.bio} ${tail}`, mentions: [] };
}
