// Small things that happen on a walk between towns, 1925: Egypt, the Sinai and the Levant.
// Most are a line that passes with the caravan; a few ask a quick choice. None stops the walk.
// The rules for when they happen, and what they do, are in game/systems/roadEvents.ts.

/** What an event or a choice does. Cash is in piastres; food in rations; water, morale and fatigue in
 *  points of 100; hours passed on the road (a negative number is time saved on the way). */
export interface RoadFx {
  cash?: number;
  food?: number;
  water?: number;
  morale?: number;
  fatigue?: number;
  hours?: number;
  rep?: number;
  /** a common rug comes into the packs */
  rugGain?: boolean;
  /** one of your common rugs goes, and another common rug comes in its place */
  rugSwap?: boolean;
  /** word of prices in the town you are walking to: true when the bazaar says so, sometimes not */
  rumour?: boolean;
}

export interface RoadChoice {
  id: string;
  label: string;
  /** what happens, said in a line afterwards */
  result: string;
  fx?: RoadFx;
  /** sometimes it goes another way: with this chance, this line and these effects instead */
  odds?: { p: number; result: string; fx?: RoadFx };
  /** what the choice needs to be offered */
  needs?: { cash?: number; rug?: boolean; water?: number };
}

export interface RoadEvent {
  id: string;
  /** what is seen on the road; {dest} is the town you are walking to */
  text: string;
  /** the ground it can happen on: open desert and hills, or the farmland, villages and made roads */
  where: 'desert' | 'sown' | 'any';
  /** daylight only (06:00 to 19:00), or night only */
  when?: 'day' | 'night';
  /** only with animals, or with men, in the caravan */
  needs?: { animals?: boolean; men?: boolean; rug?: boolean };
  /** no choice: this happens as the caravan passes */
  fx?: RoadFx;
  /** a quick choice on the card; the caravan walks on while you decide */
  choices?: RoadChoice[];
  /** the choice taken if the card is left alone */
  def?: string;
}

export const ROAD_EVENTS: RoadEvent[] = [
  // ---- passing things: a line, and the walk goes on ----
  { id: 'dust-devil', where: 'desert', when: 'day', text: 'A dust devil crosses the track and fills every fold of cloth with sand. The skins are opened to wash out mouths.', fx: { water: -8 } },
  { id: 'mirage', where: 'desert', when: 'day', text: 'Water shines on the skyline all afternoon and is never there. The men stop looking at it.', fx: { morale: -2 } },
  { id: 'noon-heat', where: 'desert', when: 'day', text: 'The noon heat comes off the stones like an oven. Everyone drinks more than they meant to.', fx: { water: -10, fatigue: 4 } },
  { id: 'scorpion', where: 'desert', text: 'A scorpion is shaken out of a blanket at the halt. Nobody is stung.' },
  { id: 'jackals', where: 'any', when: 'night', text: 'Jackals call round the caravan in the dark, and the animals will not settle.', fx: { morale: -1 } },
  { id: 'patrol-desert', where: 'desert', when: 'day', text: 'Two men of the Camel Corps ride up, read your papers slowly and wave you on.', fx: { hours: 0.5 } },
  { id: 'patrol-sown', where: 'sown', when: 'day', text: 'A police patrol stops the caravan at a village edge and reads your papers. Half an hour, and you are let go.', fx: { hours: 0.5 } },
  { id: 'cart-axle', where: 'sown', when: 'day', text: 'A cart has broken its axle across the road. Your party helps lift it clear: an hour lost, and the carter\'s thanks.', fx: { hours: 1, rep: 1 } },
  { id: 'lame-beast', where: 'any', needs: { animals: true }, text: 'One of the animals goes lame on a stone. Its load is shared out and the pace drops for a while.', fx: { hours: 2 } },
  { id: 'girth-strap', where: 'any', needs: { animals: true }, text: 'A girth strap breaks and a load slides into the dust. Repacking it costs an hour.', fx: { hours: 1 } },
  { id: 'funeral', where: 'sown', when: 'day', text: 'A funeral goes by on its way to the village burial ground. You stand aside until it has passed.', fx: { hours: 0.5 } },
  { id: 'stray-goat', where: 'any', when: 'day', text: 'An old man asks whether you have seen a goat with a red rag tied to its horn. You have not.' },
  { id: 'fellow-walker', where: 'any', when: 'day', text: 'A trader bound for {dest} walks with you for a stretch for the company, and shares his dates.', fx: { food: 1, morale: 2 } },
  { id: 'rumour-muleteer', where: 'sown', when: 'day', text: 'A muleteer coming from {dest} has news of the bazaar there.', fx: { rumour: true } },
  { id: 'rumour-herdsman', where: 'desert', when: 'day', text: 'A herdsman at a cistern has heard talk of {dest} from the last caravan through.', fx: { rumour: true } },

  // ---- a quick choice: the card waits about an hour of road, then the caravan goes on ----
  {
    id: 'pilgrims-water', where: 'desert', when: 'day', def: 'refuse',
    text: 'A family of pilgrims walking home from the Hejaz asks for water. Their skins are dry.',
    choices: [
      { id: 'give', label: 'Share your water', needs: { water: 20 }, result: 'You fill their skins. The old man blesses your journey.', fx: { water: -15, morale: 2, rep: 1 } },
      { id: 'refuse', label: 'Walk on', result: 'You walk on. The pilgrims follow your track for a while, then fall behind.', fx: { morale: -1 } },
    ],
  },
  {
    id: 'wedding-bread', where: 'sown', when: 'day', def: 'pass',
    text: 'A village is marrying off a daughter today, and the women sell wedding bread cheap at the roadside.',
    choices: [
      { id: 'buy', label: 'Buy bread · 3 PT', needs: { cash: 3 }, result: 'Four days\' bread for three piastres, and sweet besides.', fx: { cash: -3, food: 4, morale: 2 } },
      { id: 'pass', label: 'Go on', result: 'You go on to the sound of the drums behind you.' },
    ],
  },
  {
    id: 'trader-swap', where: 'any', when: 'day', needs: { rug: true }, def: 'no',
    text: 'A Syrian pedlar going the other way likes one of your rugs and offers one of his own in exchange, with something on top.',
    choices: [
      { id: 'swap', label: 'Swap, take 5 PT', result: 'Hands are shaken and the rugs change packs. His is plainer than it looked in the sun.', fx: { rugSwap: true, cash: 5 } },
      { id: 'no', label: 'Keep yours', result: 'He shrugs and goes on his way.' },
    ],
  },
  {
    id: 'bedouin-guide', where: 'desert', when: 'day', def: 'no',
    text: 'A Bedouin of the Tarabin offers to show you a shorter way across the sand, for ten piastres.',
    choices: [
      { id: 'pay', label: 'Pay him · 10 PT', needs: { cash: 10 }, result: 'He takes you over a ridge you would never have tried. You save half a day.', fx: { cash: -10, hours: -12 },
        odds: { p: 0.3, result: 'His shorter way goes round a great dune and back. He keeps the money.', fx: { cash: -10, hours: 3 } } },
      { id: 'no', label: 'Keep to the track', result: 'You thank him and keep to the track you know.' },
    ],
  },
  {
    id: 'found-bale', where: 'any', def: 'leave',
    text: 'A bale lies beside the track, dropped from some caravan ahead. The cord is still tied.',
    choices: [
      { id: 'take', label: 'Load it', result: 'Inside, wrapped in sacking, is a rug. Nobody comes back for it.', fx: { rugGain: true },
        odds: { p: 0.35, result: 'Inside is rotten sacking and a few pounds of raw wool, not worth carrying.', fx: { hours: 0.5 } } },
      { id: 'leave', label: 'Leave it', result: 'You leave it for whoever dropped it.' },
    ],
  },
  {
    id: 'sheikh-coffee', where: 'sown', when: 'day', def: 'go',
    text: 'The sheikh of a village sees you pass and sends a boy to ask you in for coffee.',
    choices: [
      { id: 'sit', label: 'Sit an hour', result: 'Three cups, as custom asks, and talk of the harvest. Word of your manners goes ahead of you.', fx: { hours: 1, rep: 2, morale: 2, fatigue: -3 } },
      { id: 'go', label: 'Send thanks', result: 'You send your thanks and apologies with the boy, and go on.' },
    ],
  },
  {
    id: 'water-carrier', where: 'sown', when: 'day', def: 'no',
    text: 'A water-carrier at a village well offers to fill your skins for a piastre.',
    choices: [
      { id: 'pay', label: 'Pay · 1 PT', needs: { cash: 1 }, result: 'The skins are filled to the neck.', fx: { cash: -1, water: 40 } },
      { id: 'no', label: 'Go on', result: 'You go on with what you carry.' },
    ],
  },
  {
    id: 'laban-boy', where: 'any', when: 'day', def: 'no',
    text: 'A shepherd boy runs alongside with a skin of laban, sour milk, to sell.',
    choices: [
      { id: 'buy', label: 'Buy it · 1 PT', needs: { cash: 1 }, result: 'Cool and sour. It goes round the whole party.', fx: { cash: -1, water: 10, morale: 2 } },
      { id: 'no', label: 'Wave him off', result: 'He drops back, still calling his price.' },
    ],
  },
  {
    id: 'dervish', where: 'any', when: 'day', def: 'no',
    text: 'A wandering dervish asks for alms in the name of the saints.',
    choices: [
      { id: 'give', label: 'Give a piastre', needs: { cash: 1 }, result: 'He prays for your trade, loudly, until you are out of hearing.', fx: { cash: -1, rep: 1, morale: 1 } },
      { id: 'no', label: 'Walk on', result: 'You walk on.' },
    ],
  },
  {
    id: 'bridge-toll', where: 'sown', when: 'day', def: 'pay',
    text: 'Village watchmen at a canal bridge want two piastres for the crossing, a toll no one in Cairo has heard of.',
    choices: [
      { id: 'pay', label: 'Pay · 2 PT', needs: { cash: 2 }, result: 'You pay and cross.', fx: { cash: -2 } },
      { id: 'argue', label: 'Argue', result: 'You argue. They give way and wave you over for nothing.',
        odds: { p: 0.4, result: 'You argue for an hour and pay all the same.', fx: { cash: -2, hours: 1 } } },
    ],
  },
  {
    id: 'loom-village', where: 'sown', when: 'day', def: 'no',
    text: 'Women at a village loom offer a small new kilim, the dye still strong on it, for thirty piastres.',
    choices: [
      { id: 'buy', label: 'Buy it · 30 PT', needs: { cash: 30 }, result: 'It is rolled, tied and loaded.', fx: { cash: -30, rugGain: true } },
      { id: 'no', label: 'Not today', result: 'You admire the work and go on.' },
    ],
  },
  {
    id: 'men-rest', where: 'any', when: 'day', needs: { men: true }, def: 'on',
    text: 'Your men ask for an hour in the shade of a tamarisk before the worst of the heat.',
    choices: [
      { id: 'rest', label: 'Give them the hour', result: 'They sleep, and get up better for it.', fx: { hours: 1, morale: 4, fatigue: -5 } },
      { id: 'on', label: 'Keep walking', result: 'They grumble and keep walking.', fx: { morale: -2 } },
    ],
  },
];

export const roadEventById = (id: string) => ROAD_EVENTS.find((e) => e.id === id);
