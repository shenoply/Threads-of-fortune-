// What each "How it plays" film shows and what the narrator says over it. One step = one screen: the
// narrator speaks while it is up, then the finger taps `tap` (a selector, or [x, y] on a 390 x 844
// phone) and the next screen follows. `before` runs first, `settle` is extra time for animations.
export const FILMS = [
  {
    id: 'stall', title: 'Selling at your stall',
    steps: [
      { say: 'This is your stall, in the lanes of Giza. Tap Stall to open it for the day.', tap: '[data-testid=nav-stall]' },
      { say: 'Nobody comes until you are ready. When you are, press Wait for a customer, and the next buyer walks up to your table.', tap: '[data-testid=stall-wait]', settle: 2500 },
      { say: 'A buyer arrives. Under the picture you can see three things: their interest in buying, their patience, and how far they trust you.', tap: '[data-testid=rugstrip] .rugcard:not(.empty)', settle: 3500 },
      { say: 'Lay a rug on the table. Pick one that suits what they are looking for. They will tell you what they think of it.', tap: '[data-testid=actions] .act', settle: 3500 },
      { say: 'Then talk. Ask about their room, tell the rug’s story, praise the craft. Every choice moves their interest up, or down.', tap: '[data-testid=actions] .act >> nth=1', settle: 3500 },
      { say: 'Watch their face and the bars. When their interest is high, name your price and close the sale. Every good sale adds to your name in the bazaar.', settle: 3500 },
    ],
  },
  {
    id: 'district', title: 'Walking Giza',
    steps: [
      { say: 'Giza is your home. The whole district is a map you can walk.', tap: [130, 470], settle: 1200 },
      { say: 'Tap anywhere in the lanes, and Hassan walks there.', tap: [270, 330], settle: 2600 },
      { say: 'Every marked place is somewhere you can go in: your stall, Bilgin’s coffee house, Arran’s laboratory, and Malek’s grill.', tap: [190, 560], settle: 2600 },
      { say: 'The clock moves while you walk and work, so plan your day. The stall shuts at eight in the evening.', settle: 2600 },
    ],
  },
  {
    id: 'rashid', title: 'Buying stock',
    steps: [
      { say: 'Your rugs come from Uncle Rashid, the wholesaler who supplied your father for thirty years. The objective bar takes you straight to him.', tap: '[data-testid=first-hour-go]' },
      { say: 'He shows you what he has today, each rug with his asking price. Tap one to look at it closely.', tap: '[data-testid^=look-]', settle: 1500 },
      { say: 'Check the pattern, the wear and the size before you spend a piastre.', tap: '[data-testid=inspector-close]', settle: 1500 },
      { say: 'You can haggle. Rashid enjoys it, but he knows exactly what his rugs are worth.', tap: '[data-testid=haggle]', settle: 1500 },
      { say: 'Then pay in cash, or take the rug on credit and settle with him later. Buy well below what Giza will pay.', tap: '[data-testid=buy-cash]', settle: 1500 },
      { say: 'The rug goes into your stock, ready for the stall.', settle: 1500 },
    ],
  },
  {
    id: 'inspect', title: 'Inspecting a rug',
    steps: [
      { say: 'Your stock lists every rug you own: what you paid, and what it usually sells for.', before: async (p) => { await p.click('[data-testid=nav-inventory]'); }, tap: 'button:has-text("Inspect")' },
      { say: 'Open a rug to inspect it, the way a buyer would.', tap: '[data-testid=inspector] button[aria-label="Zoom in"]', settle: 1500 },
      { say: 'Zoom right in to see the knots and the colours.', tap: '[data-testid=inspector] button[aria-label="Rotate"]', settle: 1500 },
      { say: 'Turn it round and look again. Then read its condition, its weave and its history.', tap: '[data-testid=inspector] button:has-text("Condition")', settle: 1500 },
      { say: 'Buyers who know rugs will ask. Know what you are selling before you name a price.', settle: 1500 },
    ],
  },
  {
    id: 'travel', title: 'Travelling',
    steps: [
      { say: 'When Giza is not enough, zoom out to the world.', tap: '[data-testid=district-world]' },
      { say: 'This is the region in nineteen twenty-five: Egypt, Palestine, Syria, Iraq and Anatolia, with every town you can trade in.', tap: 'button[aria-label="Zoom out"]', settle: 1500 },
      { say: 'Tap a town to set off. Your route is drawn, and the clock starts to run.', before: async (p) => { await p.locator('button[aria-label="Zoom out"]').first().click().catch(() => {}); }, tap: '[data-testid=place-cairo]', settle: 1500 },
      { say: 'Speed the journey up, or stop at any time. Roads are quick and the desert is slow. Ferries, trains and ships cost a fare, but they save days.', settle: 3000 },
      { say: 'Arrive, and the town is yours to trade in: its buyers, its jobs and its sale rooms.', before: async (p) => { for (let i = 0; i < 60 && !(await p.locator('[data-testid=settlement]').count()); i++) await p.waitForTimeout(250); }, settle: 1500 },
    ],
  },
  {
    id: 'caravan', title: 'Your caravan',
    steps: [
      { say: 'Before a long road, open your caravan.', tap: '[data-testid=nav-caravan]' },
      { say: 'At the top: how many days of food you carry, your pace, your strength, and how much you can load.', tap: '[data-testid=buy-food-days]', settle: 1200 },
      { say: 'Everyone eats. Buy bread, dates and water for the days ahead.', tap: '[data-testid=buy-falahi]', settle: 1200 },
      { say: 'Animals carry your rugs. A donkey is cheap. A camel carries far more, and walks further.', tap: '[data-testid=hire-fellah]', settle: 1200 },
      { say: 'And hire men to guard the road. Raiders ride some routes, but they leave a strong caravan alone. Guards are paid every morning.', settle: 1200 },
    ],
  },
  {
    id: 'cafe', title: 'Chess and tawla',
    prep: 'Object.assign(s.world, { hour: 10 });',
    steps: [
      { say: 'Bilgin’s coffee house is just round the corner from your stall.', tap: '[data-testid=poi-coffee]' },
      { say: 'Talk to him for the news, or sit down at his chess table, or the tawla board.', tap: '[data-testid=cafe-play-tawla]', settle: 1500 },
      { say: 'Play for tea, or for a few piastres, and choose how hard he plays.', tap: '[data-testid=cafe-tawla]', settle: 1200 },
      { say: 'Throw the dice to see who starts.', tap: '[data-testid=tw-open]', settle: 1500 },
      { say: 'Tap a glowing checker, then the point where it goes. Bilgin answers every move, and laughs at his own jokes.', tap: '.tw-pt.can', settle: 2500 },
      { say: 'Bear all fifteen off before he does, and the stake is yours.', tap: '.tw-pt.dest', settle: 2500 },
    ],
  },
  {
    id: 'news', title: 'Paper and radio',
    steps: [
      { say: 'Every day in the game is a real day of nineteen twenty-five.', tap: '[data-testid=paper-btn]' },
      { say: 'The Giza Courier carries that day’s real news. Read it in the morning: it moves prices, brings buyers, and makes roads safer, or worse.', tap: '[data-testid=newspaper-close]', settle: 2000 },
      { say: 'Or turn on Radio Giza.', tap: '[data-testid=radio-btn]' },
      { say: 'The radio reads the day’s news aloud while you work. Tap any line to hear it from there.', settle: 2000 },
    ],
  },
];
