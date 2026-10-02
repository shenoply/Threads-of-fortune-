import { useState } from 'react';
import { FAMILY_INSTALMENT, FAMILY_START } from '../../game/state/store';
import { fmt } from '../../game/economy/money';

// How to play: short pages, plain words. Opens from Settings.
const PAGES: { id?: string; img: string; pos?: string; title: string; lines: string[] }[] = [
  {
    img: 'art/world/giza-district.jpg', pos: '50% 50%',
    title: 'The map is home',
    lines: ['The game lives on one map. Tap a place to walk there, or a town to travel. Drag to look around; pinch or use + and \u2212 to zoom.', 'Zoom out from the Giza lanes and the whole region opens up. The scroll button on the map lists your story, jobs and visitors.'],
  },
  {
    img: 'art/world/stall-top.jpg', pos: '50% 50%',
    title: 'Time',
    lines: ['The clock only moves while you travel or wait. It stops while you read the paper, listen to the radio or look at a menu, though the first read of the day costs a quarter of an hour.', 'The stall shuts at eight in the evening. A small note shows the day\'s takings; press Next day when you are ready.'],
  },
  {
    img: 'art/stall-samira-v2.jpg', pos: '70% 35%',
    title: 'Your stall',
    lines: ['Your stall is in the Giza district: tap it in the lane to open it. Customers only come when you press Wait.', 'Ask about their room and taste, lay a rug on the table, argue what they care about, and name a price. Every good sale adds to your name.'],
  },
  {
    img: 'art/portraits/rashid.jpg', pos: '50% 30%',
    title: 'Uncle Rashid and the family debt',
    lines: [`Rashid sells you stock. Buy well below what Giza pays, and restore dirty rugs before you sell them.`, `Your father owes him ${fmt(FAMILY_START.left)}. ${fmt(FAMILY_INSTALMENT)} is taken on the 1st of every month, with rent and dues. Do his errand in Alexandria and he gives credit and better rugs.`],
  },
  {
    img: 'art/world/travel-map.jpg', pos: '30% 70%',
    title: 'Travel',
    lines: ['Tap a town, then Travel. Walking is slow: about twelve days to Damascus. The Nile ferry takes you to Cairo in an hour and a half; trains, ships and the Nairn motor car go further, for a fare.', 'The ground sets the pace. Roads are quickest, farmland is fair going, open desert and hills are slow. No caravan crosses the mountains or the sea: the roads go through the passes, and ships go round.', 'Everyone eats. Buy food in a town before a long road, and pack rugs in your Stock to sell elsewhere.'],
  },
  {
    img: 'art/portraits/captainreed.jpg', pos: '50% 30%',
    title: 'Jobs and visitors',
    lines: ['Jobs wait in a town. Arrive with what the job asks for, a packed rug or two animals, and it pays on the spot.', 'Visitors stay in a town for a few days and want a certain grade of rug. Get there before they leave and they pay well.'],
  },
  {
    img: 'art/troops/escort-road.jpg', pos: '50% 40%',
    title: 'Guards and ambushes',
    lines: ['Raiders ride some roads, above all through Palestine and Syria. The map warns you before you set off. They weigh your strength against their own, and a strong caravan is left alone.', 'Hire guards in the town yards. They are paid every morning. If you are caught short, you can pay, fight, or turn back.'],
  },
  {
    img: 'art/auction/pov/cairo-grand-pov.webp', pos: '50% 50%',
    title: 'Auctions',
    lines: ['Cairo, Alexandria, Jerusalem, Damascus, Amman, Baghdad and Istanbul each have sale rooms. The calendar shows the sale days.', 'Anyone may sit and watch. Inspect a lot before you bid; grand sales charge a premium, dealers\' rooms have bargains.'],
  },
  {
    img: 'art/stall-seller.jpg', pos: '25% 40%',
    id: 'radio',
    title: 'The paper and the radio',
    lines: ['Every day is a real day of 1925. The Courier and Radio Giza carry the real news of that day.', 'What happens in the world moves prices, brings buyers, and makes some roads safer or worse. Read it in the morning.', 'On the radio, "Skip to the news" jumps past the greeting; tap any line to hear it from there. Films of the people you meet play once and wait on the Customers screen.'],
  },
  {
    id: 'rugs', img: 'art/stall2/stall-empty-patched.webp', pos: '50% 60%',
    title: 'Choosing a rug for a buyer',
    lines: ['Three rugs fit on the counter. "All" lists every rug you can show, by what it usually sells for ("\u2248 \u00a3"), by name or condition; tap one to lay it on the table. A buyer you have learned shows what suits them.', 'A buyer who liked a rug but did not buy can come back for it: put it aside for them (on the result card, or in Stock) and nobody else is shown it for a week.'],
  },
  {
    id: 'arran', img: 'art/arran/13-lab-room.webp', pos: '50% 50%',
    title: "Arran's laboratory",
    lines: ['Arran, in the Giza lanes, tests a rug for a fee: what it is made of, whether the dye runs, whether it washes. A signed report travels with the rug and buyers believe it.', 'Some tests need a book he lacks: find it (his notebook says where) and bring it to him. His cabinet sells tonics and kit for the road.'],
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
