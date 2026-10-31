import { useState } from 'react';
import { FAMILY_INSTALMENT, FAMILY_START } from '../../game/state/store';
import { FIRST_SUM, EARLY_OFF } from '../../game/firstWeek';
import { fmt } from '../../game/economy/money';
import { openHowItPlays } from './HowItPlays';

// How to play: short pages, plain words. Opens from Settings.
const PAGES: { id?: string; img: string; pos?: string; title: string; lines: string[] }[] = [
  {
    id: 'map', img: 'art/world/giza-district.jpg', pos: '50% 50%',
    title: 'The map is home',
    lines: ['The game lives on one map. Tap a place to walk there, or a town to travel. Drag to look around; pinch or use + and \u2212 to zoom.', 'Zoom out from the Giza lanes and the whole region opens up. The scroll button on the map lists your story, jobs and visitors.'],
  },
  {
    img: 'art/world/stall-top.jpg', pos: '50% 50%',
    title: 'Time',
    lines: ['The clock only moves while you travel or wait. It stops while you read the paper, listen to the radio or look at a menu, though the first read of the day costs a quarter of an hour.', 'The stall shuts at eight in the evening. A small note shows the day\'s takings; press Next day when you are ready.'],
  },
  {
    id: 'stall', img: 'art/stall-samira-v2.jpg', pos: '70% 35%',
    title: 'Your stall',
    lines: ['Your stall is in the Giza district: tap it in the lane to open it. Buyers only come when you press Wait.', 'Ask about their room and taste, lay a rug on the table, argue what they care about, and name a price. Every good sale adds to your name.', 'Interest is how much they want the rug. Patience is how long they will stay. Trust is how far they believe you. When patience runs out, they leave.'],
  },
  {
    id: 'today', img: 'art/stall-empty.webp', pos: '50% 50%',
    title: 'Today',
    lines: ['The Today button at the top holds three small things. Your gift: a present each day you play, a bigger one on the seventh. Rashid\'s runner: a purse he leaves for you. The errands: three small tasks a day, each paid in coin when done.', 'None of them is needed. They help on a thin day.'],
  },
  {
    id: 'rashid', img: 'art/portraits/rashid.jpg', pos: '50% 30%',
    title: 'Uncle Rashid and the family debt',
    lines: [`Rashid sells you stock. The estimate under each rug is what Giza buyers pay for it in good condition: buy well below it. Dirty or worn rugs are cheap; repair them in Stock before you sell them.`, `Your father owes him ${fmt(FAMILY_START.left)}. The first ${fmt(FIRST_SUM)} is due on the seventh day; pay it early at the foot of his page and he takes ${fmt(EARLY_OFF)} off. After that, ${fmt(FAMILY_INSTALMENT)} is taken on the 1st of every month, with rent and dues.`, 'Do his errand in Alexandria and he gives credit (rugs now, money later) and better rugs.'],
  },
  {
    id: 'stock', img: 'art/stall2/stall-empty-patched.webp', pos: '50% 60%',
    title: 'Your stock',
    lines: ['Stock lists every rug you own. Tap Inspect to look closer. Condition matters: a dirty or worn rug sells for less until it is repaired, and repair takes a little money and a few hours.', 'Pack a rug for the road to sell it in another town. Rugs left behind stay at the stall. Put a rug aside for a buyer who liked it, and nobody else is shown it for a week.'],
  },
  {
    id: 'me', img: 'art/hero/hero-portrait.webp', pos: '50% 30%',
    title: 'Me: rank, reputation and names',
    lines: ['Your rank runs from Stall keeper to Purveyor to Kings. Each rank needs a reputation and a net worth (what you own, less what you owe). Me shows what the next rank needs.', 'Reputation rises with good sales and kept promises, and falls with cheating. As your name grows, the bazaar gives you names from how you trade, like al-Sadiq, the Truthful, or al-Shatir, the Shrewd. Titles are earned for single deeds. Skills grow by doing.'],
  },
  {
    id: 'travel', img: 'art/world/travel-map.jpg', pos: '30% 70%',
    title: 'Travel',
    lines: ['Tap a town, then Travel. Walking is slow: about twelve days to Damascus. The Nile ferry takes you to Cairo in an hour and a half; trains, ships and the Nairn motor car go further, for a fare.', 'The ground sets the pace. Roads are quickest, farmland is fair going, open desert and hills are slow. No caravan crosses the mountains or the sea: the roads go through the passes, and ships go round.', 'Everyone eats. Buy food in a town before a long road, and pack rugs in your Stock to sell elsewhere.'],
  },
  {
    img: 'art/portraits/captainreed.jpg', pos: '50% 30%',
    title: 'Jobs and visitors',
    lines: ['Jobs wait in a town. Arrive with what the job asks for, a packed rug or two animals, and it pays on the spot.', 'Visitors stay in a town for a few days and want a certain grade of rug. Get there before they leave and they pay well.'],
  },
  {
    id: 'caravan', img: 'art/troops/guard.jpg', pos: '50% 30%',
    title: 'Your caravan',
    lines: ['The Caravan tab shows who travels with you: your men, your animals, your food and your load. Guards make you strong on the road. Animals carry rugs and go faster. Everyone eats a ration a day and the men are paid each morning; unpaid men go home.', 'Strength is your men added up. Load is how many rugs you can carry.'],
  },
  {
    id: 'fights', img: 'art/troops/escort-road.jpg', pos: '50% 40%',
    title: 'Guards and ambushes',
    lines: ['Raiders ride some roads, above all through Palestine and Syria. The map warns you before you set off. They weigh your strength against their own, and a strong caravan is left alone.', 'Hire guards in the town yards. They are paid every morning. If you are caught short, you can pay, fight, or turn back.'],
  },
  {
    id: 'auction', img: 'art/auction/pov/cairo-grand-pov.webp', pos: '50% 50%',
    title: 'Auctions',
    lines: ['Cairo, Alexandria, Jerusalem, Damascus, Amman, Baghdad and Constantinople each have sale rooms. The calendar shows the sale days.', 'Anyone may sit and watch. Inspect a lot before you bid; grand sales charge a premium, dealers\' rooms have bargains.'],
  },
  {
    img: 'art/stall-seller.jpg', pos: '25% 40%',
    id: 'radio',
    title: 'The paper and the radio',
    lines: ['Every day is a real day of 1925. The Courier and Radio Giza carry the real news of that day.', 'What happens in the world moves prices, brings buyers, and makes some roads safer or worse. Read it in the morning.', 'On the radio, "Skip to the news" jumps past the greeting; tap any line to hear it from there. Films of the people you meet play once and wait on the Buyers list (Me, then Progress).'],
  },
  {
    id: 'rugs', img: 'art/stall2/stall-empty-patched.webp', pos: '50% 60%',
    title: 'Choosing a rug for a buyer',
    lines: ['Three rugs fit on the counter. "All" lists every rug you can show, by what it usually sells for ("\u2248 \u00a3"), by name or condition; tap one to lay it on the table. A buyer you have learned shows what suits them.', 'A buyer who liked a rug but did not buy can come back for it: put it aside for them (on the result card, or in Stock) and nobody else is shown it for a week.'],
  },
  {
    id: 'arran', img: 'art/arran/13-lab-room.webp', pos: '50% 50%',
    title: "Arran's laboratory",
    lines: ['Arran, in the Giza lanes, tests a rug for a fee: what it is made of, whether the dye runs, whether it washes. A signed report travels with the rug and buyers believe it. The wash and the dye test also catch an aniline red sold as natural, or new wool stained with tea and sold as old.', 'Some tests need a book he lacks: find it (his notebook says where) and bring it to him. His cabinet sells tonics and kit for the road.'],
  },
  {
    id: 'cohen', img: 'art/portraits/cohen.jpg', pos: '50% 30%',
    title: "Cohen's orders",
    lines: ['Cohen, a wholesaler, does not haggle: he places an order for two matching corridor rugs by a date, at his price per rug. Promise it, bring two that pass his checks (size, hard-wearing wool, sound edges, colour that holds) and he pays.', 'He does not like you and watches his margin. Deliver on time and he comes back with more; push him on price before you have delivered and he walks.'],
  },
  {
    id: 'malek', img: 'art/malek/scene-serving.webp', pos: '40% 40%',
    title: "Malek's grill",
    lines: ['Malek feeds you round the corner from the stall: eat well and buyers find you more patient for a few hours. Road parcels keep for days on a journey.', 'Sit at one of his tables and his story goes on, one part each visit. He comes to your stall too, unpredictable with money; sell him a rug and his next plates are on his tab.'],
  },
  {
    id: 'seasons', img: 'art/arran/cat/cab-khamsin.webp', pos: '50% 50%',
    title: 'The seasons of 1925',
    lines: ['The year has its own trade. Winter brings the tourist steamers and foreign buyers; autumn brings cotton money from the Delta, and a cotton slump takes it away. The feasts send buyers looking for prayer rugs, a khamsin blows sand into rugs left out, the Nile flood slows the ferry and the Delta roads, and a quarantine holds ships in port. Each one is told in a morning card the day it begins, with what it means for your trade.'],
  },
  {
    id: 'papers', img: 'art/arran/cat/book-customs-ledger.webp', pos: '50% 50%',
    title: 'Frontiers and papers',
    lines: ['Palestine, Transjordan, Syria, Turkey and Iraq each have a frontier post. Get a passport with visas at the Passport Office in Cairo (\u00a3E1) before you go: without one you are fined at every crossing, and Turkey turns you back. At the post you declare the rugs you carry and pay duty on what you paid for them, or try a present for the clerk, or declare half and hope they do not search. The trip card warns you before you set off.'],
  },
  {
    id: 'money', img: 'art/world/city-damascus.jpg', pos: '50% 50%',
    title: 'Money abroad',
    lines: ['Prices abroad are in the money of the place: Syrian pounds, Turkish lira, Indian rupees in Iraq; Palestine and Transjordan still use Egyptian money. Your purse stays in Egyptian pounds, and a money-changer keeps a small share of your first deal each time you come to a town, so make that first deal a large one. The franc keeps falling, so a Syrian pound buys less as the months go by.'],
  },
  {
    id: 'fakes', img: 'art/arran/cat/dye-test.webp', pos: '50% 50%',
    title: 'Fakes and aniline dyes',
    lines: ['Some rugs are not what the dealer says. A cheap aniline red runs in the wash and fades in a year; a new rug washed in tea or acid is sold as old. City dealers cheat most, small auction rooms sometimes, the grand sales and Rashid hardly ever. A trained eye sees a hint; Arran\'s tests prove it. Sell one as sound and the buyer may find out and come back for his money.'],
  },
  {
    id: 'moths', img: 'art/arran/cat/cab-moth.webp', pos: '50% 50%',
    title: 'Moth in summer',
    lines: ['From June to September moth lays its eggs in wool kept dark and still. Stock gives a warning first: air and beat your rugs (two piastres and an hour, good for two weeks), or buy the camphor-wood chest for the stall. Silk and cotton-backed rugs are attacked less.'],
  },
  {
    id: 'boy', img: 'art/stall-empty.webp', pos: '50% 50%',
    title: 'Sami minds the stall',
    lines: ['A buyer who finds your stall empty waits a couple of hours and goes elsewhere. Hire Sami, Hajj Mahmoud\'s nephew, from the stall for two piastres a day: he keeps buyers waiting longer, or sells your plain rugs at the price you set. He is a boy, so now and then a buyer talks him down or a coin goes missing; he gets better the longer he works for you. Pay him, or he goes home.'],
  },
  {
    id: 'post', img: 'art/newspaper-stall.webp', pos: '50% 50%',
    title: 'Letters and telegrams',
    lines: ['News of trade comes by post: a buyer staying in a town, a new job, Cohen saying when he will call. Letters take a day or more, longer from the Levant, and wait in your post list. Towns with a telegraph office (Cairo, Alexandria, Port Said, Jerusalem, Damascus, Beirut, Baghdad, Constantinople) let you wire Rashid for stock or ask a dealer\'s prices for a few piastres.'],
  },
  {
    id: 'loans', img: 'art/portraits/rashid.jpg', pos: '50% 30%',
    title: 'Loans',
    lines: ['The Khan moneylender and the Banque Misr lend money in Cairo and Alexandria. The moneylender asks no questions and charges a lot; the bank is cheaper but wants stock worth the loan. Each loan has a date. Pay it late and the interest grows.', 'Debts and loans are all on one page: tap the warning under the top bar, or see Progress.'],
  },
  {
    id: 'weaving', img: 'art/loom/workshop-768.webp', pos: '50% 50%',
    title: 'Weaving your own carpet',
    lines: ['The weavers of Kerdasa, in the Giza lanes, weave a carpet to your design: choose the size, the pattern and the colours, and pay. It comes off the loom in a few weeks. A good design in the colours a town wants sells well.'],
  },
  {
    id: 'words', img: 'art/stall-seller.jpg', pos: '25% 40%',
    title: 'Words used in the game',
    lines: [
      'Estimate (≈ £): what a rug usually fetches in good condition.',
      'Fine, Exceptional, Legendary: grades of rug above the plain village rug. The better the grade, the more collectors pay for it.',
      'Condition: good, dirty or worn. Dirty and worn rugs sell for less until repaired.',
      'Reputation: your good name in the bazaar. It opens ranks, buyers and doors.',
      'Net worth: your money and rugs, less what you owe.',
      'Credit: rugs from Rashid now, paid for later.',
      'Errands: three small paid tasks each day, under Today.',
      'Strength: your guards added up. Raiders count it.',
      'Rations: food for the road, one a day for each person.',
      'Rumours: word in the bazaar. A town paying well, a buyer looking. They fade in a few days.',
    ],
  },
  {
    id: 'licence', img: 'art/counter-stall.webp', pos: '50% 50%',
    title: 'Your licence and the inspector',
    lines: ['A stall needs a trading licence, renewed each year by 30 April at the markets office; the Ledger shows when it runs out. The market inspector calls now and then with his brass metre, more often once a licence has lapsed. Trade without one, or with a short measuring rod, and he fines you; a good name gets a warning the first time.'],
  },
];

/** open How to play on a given page (the "?" buttons where each thing lives) */
export const openGuide = (page?: string) => window.dispatchEvent(new CustomEvent('tof-guide', { detail: page }));
export const guidePage = (id?: string) => Math.max(0, PAGES.findIndex((p) => p.id === id));

export function Guide({ onClose, start = 0 }: { onClose: () => void; start?: number }) {
  const [i, setI] = useState(start);
  const p = PAGES[i];
  const last = i === PAGES.length - 1;
  return (
    <div className="guide" role="dialog" aria-label="How to play" data-testid="guide">
      <div className="guide-card">
        <div className="guide-img" style={{ backgroundImage: `url(${p.img})`, backgroundPosition: p.pos }} />
        <div className="guide-body">
          <small>HOW TO PLAY · {i + 1} OF {PAGES.length}</small>
          <h2>{p.title}</h2>
          {p.lines.map((l) => <p key={l}>{l}</p>)}
          {i === 0 && <button className="linkish guide-how" onClick={() => { onClose(); openHowItPlays(); }} data-testid="guide-how">▶ Watch how it plays</button>}
        </div>
        <div className="guide-dots">{PAGES.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Page ${k + 1}`} />)}</div>
        <div className="guide-foot">
          <button className="ghost-btn" onClick={onClose} data-testid="guide-skip">{last ? '' : 'Skip'}</button>
          {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>Back</button>}
          <button className="btn primary" onClick={() => (last ? onClose() : setI(i + 1))} data-testid="guide-next">{last ? 'Start exploring' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
