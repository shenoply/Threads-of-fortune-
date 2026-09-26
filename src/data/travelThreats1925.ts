export type ThreatKind =
  | 'criminal_banditry'
  | 'tribal_or_criminal_raid'
  | 'criminal_robbery'
  | 'rebel_guerrilla'
  | 'smuggling_criminal_network';

export interface TravelThreat {
  id: string;
  displayName: string;
  regions: string[];
  kind: ThreatKind;
  activeFromMonth: number;
  activeToMonth: number;
  baseRisk: number;
  cargoValueSensitivity: number;
  nightRiskBonus: number;
  escortDeterrence: number;
  leaderImage: string;
  groupImage: string;
  preferredResolutions: string[];
  historicalNote: string;
}

export interface TravelThreatContext {
  month: number;
  region: string;
  cargoValuePt: number;
  travellingAtNight: boolean;
  escortProtection: number; // 0..1
  localGuideBonus: number;   // 0..1
  reputation: number;        // 0..100
}

export const TRAVEL_THREATS_1925: TravelThreat[] = [
  {
    "id": "egypt-rural-highway-robbers",
    "displayName": "Rural Highway Robbers",
    "regions": [
      "Giza outskirts",
      "Nile countryside",
      "secondary roads"
    ],
    "kind": "criminal_banditry",
    "activeFromMonth": 1,
    "activeToMonth": 12,
    "baseRisk": 0.12,
    "cargoValueSensitivity": 0.22,
    "nightRiskBonus": 0.1,
    "escortDeterrence": 0.55,
    "preferredResolutions": [
      "avoid",
      "pay",
      "negotiate",
      "escort_deters",
      "lose_small_cargo"
    ],
    "historicalNote": "Inspired by documented Egyptian rural banditry and robbery of travelling merchants; frequency is game-balanced, not a statistical reconstruction.",
    "leaderImage": "art/travel-threats/egypt-rural-highway-robbers-leader.jpg",
    "groupImage": "art/travel-threats/egypt-rural-highway-robbers-group.jpg"
  },
  {
    "id": "sinai-transjordan-desert-raiders",
    "displayName": "Desert Raiders",
    "regions": [
      "Sinai routes",
      "Aqaba road",
      "Transjordan desert",
      "Amman-Damascus approaches"
    ],
    "kind": "tribal_or_criminal_raid",
    "activeFromMonth": 1,
    "activeToMonth": 12,
    "baseRisk": 0.16,
    "cargoValueSensitivity": 0.18,
    "nightRiskBonus": 0.06,
    "escortDeterrence": 0.35,
    "preferredResolutions": [
      "reroute",
      "pay_passage",
      "negotiate_with_guide",
      "escort_deters",
      "delay"
    ],
    "historicalNote": "Use as a generic game category for raiding or predatory armed parties, not as a label for Bedouin communities generally.",
    "leaderImage": "art/travel-threats/sinai-transjordan-desert-raiders-leader.jpg",
    "groupImage": "art/travel-threats/sinai-transjordan-desert-raiders-group.jpg"
  },
  {
    "id": "palestine-road-thieves",
    "displayName": "Road Thieves",
    "regions": [
      "Jerusalem approaches",
      "Jaffa-Jerusalem road",
      "rural Palestine"
    ],
    "kind": "criminal_robbery",
    "activeFromMonth": 1,
    "activeToMonth": 12,
    "baseRisk": 0.08,
    "cargoValueSensitivity": 0.15,
    "nightRiskBonus": 0.08,
    "escortDeterrence": 0.6,
    "preferredResolutions": [
      "avoid",
      "turn_back",
      "pay",
      "escort_deters",
      "report_to_police"
    ],
    "historicalNote": "Generic criminal encounter. Do not portray Palestinian villagers or political organizations collectively as bandits.",
    "leaderImage": "art/travel-threats/palestine-road-thieves-leader.jpg",
    "groupImage": "art/travel-threats/palestine-road-thieves-group.jpg"
  },
  {
    "id": "syria-1925-rebels",
    "displayName": "Syrian Rebel Band",
    "regions": [
      "Hawran",
      "Ghouta",
      "Damascus countryside",
      "Anti-Lebanon approaches"
    ],
    "kind": "rebel_guerrilla",
    "activeFromMonth": 7,
    "activeToMonth": 12,
    "baseRisk": 0.28,
    "cargoValueSensitivity": 0.05,
    "nightRiskBonus": 0.06,
    "escortDeterrence": 0.12,
    "preferredResolutions": [
      "identify_as_merchant",
      "wait",
      "reroute",
      "negotiate_passage",
      "road_closed"
    ],
    "historicalNote": "Date-sensitive Great Syrian Revolt encounter. Rebels are not automatically criminals or hostile to Hassan. Treat this primarily as conflict-zone disruption, checkpoints, recruitment pressure, requisition risk, or blocked roads.",
    "leaderImage": "art/travel-threats/syria-1925-rebels-leader.jpg",
    "groupImage": "art/travel-threats/syria-1925-rebels-group.jpg"
  },
  {
    "id": "iraq-border-smuggler-brigands",
    "displayName": "Border Smuggler-Brigands",
    "regions": [
      "remote Iraq routes",
      "Syrian-Iraqi frontier",
      "northern caravan roads"
    ],
    "kind": "smuggling_criminal_network",
    "activeFromMonth": 1,
    "activeToMonth": 12,
    "baseRisk": 0.11,
    "cargoValueSensitivity": 0.14,
    "nightRiskBonus": 0.07,
    "escortDeterrence": 0.42,
    "preferredResolutions": [
      "avoid",
      "negotiate",
      "pay_passage",
      "reroute",
      "information_trade"
    ],
    "historicalNote": "Composite game encounter inspired by the illicit cross-border economy, smugglers and armed bands documented in the post-Ottoman frontier world.",
    "leaderImage": "art/travel-threats/iraq-border-smuggler-brigands-leader.jpg",
    "groupImage": "art/travel-threats/iraq-border-smuggler-brigands-group.jpg"
  }
] as TravelThreat[];


function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function threatIsActive(threat: TravelThreat, month: number): boolean {
  return month >= threat.activeFromMonth && month <= threat.activeToMonth;
}

export function threatRisk(threat: TravelThreat, ctx: TravelThreatContext): number {
  if (!threatIsActive(threat, ctx.month)) return 0;
  if (!threat.regions.some(r => ctx.region.toLowerCase().includes(r.toLowerCase()) ||
                                r.toLowerCase().includes(ctx.region.toLowerCase()))) return 0;

  const cargoScale = clamp(ctx.cargoValuePt / 20000);
  const cargoRisk = cargoScale * threat.cargoValueSensitivity;
  const nightRisk = ctx.travellingAtNight ? threat.nightRiskBonus : 0;

  // Escorts reduce probability/severity. A guide is especially useful on desert and frontier routes.
  const escortReduction = clamp(ctx.escortProtection) * threat.escortDeterrence;
  const guideReduction = clamp(ctx.localGuideBonus) * 0.18;

  return clamp(threat.baseRisk + cargoRisk + nightRisk - escortReduction - guideReduction, 0, 0.75);
}

export type ThreatChoice =
  | 'AVOID'
  | 'NEGOTIATE'
  | 'PAY'
  | 'REROUTE'
  | 'WAIT'
  | 'TRUST_ESCORT';

export interface ThreatOutcome {
  resolved: boolean;
  cashLossPt: number;
  cargoLossPct: number;
  delayDays: number;
  textKey: string;
}

export function resolveThreatNonCombat(
  threat: TravelThreat,
  choice: ThreatChoice,
  escortProtection: number,
  localKnowledge: number,
  random01: number
): ThreatOutcome {
  const escort = clamp(escortProtection);
  const knowledge = clamp(localKnowledge);
  const roll = clamp(random01);

  if (choice === 'REROUTE') {
    return { resolved: true, cashLossPt: 0, cargoLossPct: 0, delayDays: 1, textKey: 'rerouted_safely' };
  }
  if (choice === 'WAIT') {
    return { resolved: true, cashLossPt: 0, cargoLossPct: 0, delayDays: 1, textKey: 'waited_for_safer_passage' };
  }
  if (choice === 'TRUST_ESCORT' && escort > 0.55) {
    return { resolved: true, cashLossPt: 0, cargoLossPct: 0, delayDays: 0, textKey: 'escort_deterred_threat' };
  }
  if (choice === 'NEGOTIATE' && roll < 0.35 + knowledge * 0.45) {
    return { resolved: true, cashLossPt: 0, cargoLossPct: 0, delayDays: 0, textKey: 'negotiated_passage' };
  }
  if (choice === 'PAY') {
    return { resolved: true, cashLossPt: 25, cargoLossPct: 0, delayDays: 0, textKey: 'paid_for_passage' };
  }
  if (choice === 'AVOID' && roll < 0.40 + knowledge * 0.35) {
    return { resolved: true, cashLossPt: 0, cargoLossPct: 0, delayDays: 0, textKey: 'avoided_contact' };
  }

  // Failure is abstracted; no tactical combat.
  return {
    resolved: true,
    cashLossPt: 20,
    cargoLossPct: threat.kind === 'criminal_banditry' ? 0.10 : 0.05,
    delayDays: 1,
    textKey: 'forced_loss_and_delay'
  };
}

// ---- Threads of Fortune wiring ----
import type { Party } from '../game/systems/world';

/** The 1925 month for a game day (day 1 is 10 March 1925). */
export const monthOfDay = (day: number) => new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth() + 1;

/** Which kind of band a hostile party on the map is, from where it rides. */
export function threatForParty(p: Party, day: number): TravelThreat {
  const by = (id: string) => TRAVEL_THREATS_1925.find((t) => t.id === id)!;
  const month = monthOfDay(day);
  const band: Record<string, string> = { rb0: 'egypt-rural-highway-robbers', rb1: 'sinai-transjordan-desert-raiders', rb2: 'palestine-road-thieves', rb3: month >= 7 ? 'syria-1925-rebels' : 'sinai-transjordan-desert-raiders', rb4: 'iraq-border-smuggler-brigands', rb5: 'iraq-border-smuggler-brigands', r0: 'sinai-transjordan-desert-raiders', r1: month >= 7 ? 'syria-1925-rebels' : 'sinai-transjordan-desert-raiders' };
  return by(band[p.id] ?? 'egypt-rural-highway-robbers');
}

/** What each band says when it stops you. */
/** Who speaks for each band: the leader's voice in the recorded dialogue. */
export const THREAT_VOICE: Record<string, string> = {
  'egypt-rural-highway-robbers': 'robberchief',
  'sinai-transjordan-desert-raiders': 'raiderchief',
  'palestine-road-thieves': 'roadthief',
  'syria-1925-rebels': 'rebelcommander',
  'iraq-border-smuggler-brigands': 'smugglerchief',
};

export const THREAT_LINES: Record<string, { open: string; demand: string; strip: string; talkOk: string; talkBad: string }> = {
  'egypt-rural-highway-robbers': {
    open: 'Men with cudgels and one old rifle step out from the sugar cane and block the track.',
    demand: 'Their leader spits. "A merchant pays for the road. Everyone pays for the road."',
    strip: 'They pull the bales off your animals, empty your purse into a cloth and leave you standing in the dust.',
    talkOk: 'You talk about the price of cotton and the Tanta mawlid. Someone knows your father. They wave you on.',
    talkBad: 'They laugh at your jokes and then name their price.',
  },
  'sinai-transjordan-desert-raiders': {
    open: 'Riders come over the ridge in a long line and stop, rifles across their saddles. Nobody hurries.',
    demand: 'Their leader names a price for safe passage through his country, very politely. "You are welcome in our country, merchant. But welcome has a price."',
    strip: 'They take the best of your cargo, your coins and your spare water, and ride off singing.',
    talkOk: 'Your guide greets their leader by his grandfather\'s name. Coffee is poured. You ride on as guests.',
    talkBad: 'Coffee is poured, and then the price is named.',
  },
  'palestine-road-thieves': {
    open: 'Three men with scarves over their faces step out from behind the olive terraces.',
    demand: '"Your purse, effendi, and nobody gets hurt."',
    strip: 'They cut your purse and grab what they can carry before a lorry comes round the bend.',
    talkOk: 'You mention the police post at the next village. They melt back into the olive trees.',
    talkBad: 'They are not impressed by talk of the police.',
  },
  'syria-1925-rebels': {
    open: 'Armed men in keffiyehs stop you at a stone wall across the road. This is the revolt\'s country now.',
    demand: 'Their commander asks for a contribution to the cause. It is not really a question. "Every merchant on this road gives something for Syria. What will you give?"',
    strip: 'They requisition your animals\' loads "for the fighters" and give you a signed paper that no one will honour.',
    talkOk: 'You show your papers and say you are only a merchant from Giza. The commander lets you pass, and warns you off the Ghouta.',
    talkBad: 'The commander listens, then asks again for the contribution.',
  },
  'iraq-border-smuggler-brigands': {
    open: 'A string of loaded camels and armed men comes out of a dry wadi. Smugglers, and not friendly ones.',
    demand: '"This is our road. You pay the road, or you trade with us, or you go home."',
    strip: 'They strip your bales for anything worth carrying across the frontier and leave the rest in the sand.',
    talkOk: 'You trade news of French patrols for a safe passage. Everyone leaves happy.',
    talkBad: 'They listen to your news and then name their price anyway.',
  },
};
