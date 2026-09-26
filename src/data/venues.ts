// Royal venues: explorable palace grounds, each unlocked from its city on the world map.
// Coordinates are pixels on the venue's painted map (art/royal/<id>-map.jpg, 1448 x 1086).

export interface VenuePoi {
  id: string;
  name: string;
  sub: string;
  x: number;
  y: number;
  glyph: string;
  kind: 'exit' | 'audience' | 'talk' | 'note' | 'goto';
  text?: string[];
  /** for 'goto': market | animals | guards | palace | town | npc:<id> */
  action?: string;
}

export interface Venue {
  id: string;
  settlement: string;
  royal?: string;
  name: string;
  where: string;
  history: string;
  map?: string;
  exterior?: string;
  start: { x: number; y: number };
  pois: VenuePoi[];
}

export const VENUE_W = 1448, VENUE_H = 1086;

export const VENUES: Record<string, Venue> = {
  abdeen: {
    id: 'abdeen', settlement: 'cairo', royal: 'fuad', name: 'Abdeen Palace', where: 'Cairo',
    history: 'Built for Khedive Ismail between 1863 and 1874 and the seat of government ever since. King Fuad receives here.',
    map: 'art/royal/abdeen-map.jpg', exterior: 'art/royal/abdeen-exterior.jpg',
    start: { x: 727, y: 1010 },
    pois: [
      { id: 'gate', name: 'Palace gates', sub: 'Back to Cairo', x: 727, y: 1050, glyph: '⇣', kind: 'exit' },
      { id: 'stairs', name: 'The red stair', sub: 'Guards of the Royal Bodyguard', x: 727, y: 700, glyph: 'S', kind: 'note', text: ['Two guardsmen in tarboosh and dark tunics watch you climb. One of them looks at your rolled carpets with open curiosity.'] },
      { id: 'hall', name: 'Hall of ceremonies', sub: 'Where petitioners wait', x: 727, y: 440, glyph: 'H', kind: 'note', text: ['A dozen men in frock coats wait beneath the chandelier, each rehearsing what he will say. Nobody speaks above a murmur.', 'A clerk carries a stack of files marked "University" towards the King\'s study.'] },
      { id: 'chamberlain', name: 'Office of the Chamberlain', sub: 'Ask how the King receives', x: 340, y: 262, glyph: 'C', kind: 'talk', text: ['The Chamberlain looks you over. "His Majesty studied in Turin and was taught that a thing is either done properly or not at all. Show him fine knotting and a provenance you can prove. He will not look twice at village pieces, and he knows every pasha in Cairo, so do not invent one."'] },
      { id: 'throne', name: 'Throne room', sub: 'Audience with King Fuad I', x: 727, y: 170, glyph: '♛', kind: 'audience' },
      { id: 'salon', name: 'Diplomatic salon', sub: 'The bare marble floor', x: 1090, y: 262, glyph: 'D', kind: 'note', text: ['This is the room the King spoke of: tall mirrors, gilt chairs and an echoing marble floor where ambassadors wait to be received.'] },
      { id: 'dining', name: 'State dining room', sub: 'A table for forty', x: 1060, y: 565, glyph: 'T', kind: 'note', text: ['Footmen are laying a table for forty under a crimson carpet that has seen better decades. You note its size for the future.'] },
      { id: 'grandstair', name: 'Grand staircase', sub: 'To the private apartments', x: 222, y: 520, glyph: 'G', kind: 'note', text: ['A guard steps in front of you politely. The private apartments are not for merchants.'] },
      { id: 'stores', name: 'Palace storerooms', sub: 'Barrels, crates and old carpets', x: 1380, y: 330, glyph: 'R', kind: 'note', text: ['The storekeeper shows you a pile of worn Ushak carpets waiting for repair. "The household buys fine things and throws out tired ones," he says. "Remember that."'] },
    ],
  },
  rasettin: {
    id: 'rasettin', settlement: 'alexandria', royal: 'nazli', name: 'Ras el-Tin Palace', where: 'Alexandria',
    history: 'Muhammad Ali\'s palace on the western harbour, rebuilt for King Fuad in the 1920s. The court moves here for the summer.',
    map: 'art/royal/rasettin-map.jpg',
    start: { x: 330, y: 805 },
    pois: [
      { id: 'pier', name: 'Harbour pier', sub: 'Back to Alexandria', x: 300, y: 815, glyph: '⇣', kind: 'exit' },
      { id: 'seagate', name: 'Sea gate', sub: 'The guard checks your name', x: 773, y: 765, glyph: 'G', kind: 'note', text: ['The officer of the gate finds your name on a list and waves you through. A carriage with the royal crest passes on its way to the yacht club.'] },
      { id: 'fountain', name: 'Front fountain', sub: 'Carriages and palms', x: 780, y: 672, glyph: 'F', kind: 'note', text: ['Two coachmen polish a black landau in the shade of the palms. The sea wind smells of salt and jasmine.'] },
      { id: 'lady', name: 'Lady-in-waiting', sub: 'Ask what the Queen likes', x: 467, y: 335, glyph: 'L', kind: 'talk', text: ['The lady-in-waiting lowers her voice. "Her Majesty reads the Paris magazines. She wants the summer rooms to feel light, like the sea. Pale grounds, soft silk, a story she can tell at dinner. Nothing heavy, nothing Ottoman, and please, do not lecture her about knots."'] },
      { id: 'salon', name: 'Summer salon', sub: 'Audience with Queen Nazli', x: 787, y: 420, glyph: '♛', kind: 'audience' },
      { id: 'gazebo', name: 'Garden pavilion', sub: 'Palms and bougainvillea', x: 280, y: 265, glyph: 'P', kind: 'note', text: ['Two young princesses are having a picnic in the pavilion under the eye of an English governess. They stare at your carpets as if you were a travelling circus.'] },
      { id: 'battery', name: 'Harbour battery', sub: 'Old guns facing the sea', x: 60, y: 490, glyph: 'B', kind: 'note', text: ['Muhammad Ali\'s old guns still face the harbour mouth. A soldier dozes beside one of them.'] },
      { id: 'stables', name: 'Carriage yard', sub: 'Horses and landaus', x: 1240, y: 400, glyph: 'Y', kind: 'note', text: ['The grooms are brushing four matched greys. One of them asks whether you have saddle rugs. You do not, this time.'] },
      { id: 'garden', name: 'Rose garden', sub: 'Behind the palace', x: 773, y: 160, glyph: 'R', kind: 'note', text: ['Gardeners work around a white fountain. From here you can see the whole western harbour and the ships at anchor.'] },
    ],
  },
  raghadan: {
    id: 'raghadan', settlement: 'amman', royal: 'abdullah', name: 'Raghadan Palace', where: 'Amman',
    history: 'The Emir\'s new palace on the hill of Raghadan, still being finished in 1925. Until it is done, much of the court still happens in tents.',
    map: 'art/royal/raghadan-map.jpg', exterior: 'art/royal/raghadan-exterior.jpg',
    start: { x: 720, y: 880 },
    pois: [
      { id: 'gate', name: 'Palace gate', sub: 'Back to Amman', x: 720, y: 905, glyph: '⇣', kind: 'exit' },
      { id: 'fountain', name: 'Courtyard fountain', sub: 'Sheikhs waiting in the shade', x: 727, y: 565, glyph: 'F', kind: 'note', text: ['Sheikhs of the Bani Sakhr sit by the fountain waiting for the majlis, their camels hobbled outside the walls.'] },
      { id: 'stables', name: 'Stables', sub: 'The Emir\'s horses', x: 213, y: 262, glyph: 'S', kind: 'note', text: ['A groom walks a grey Arabian mare in circles. "Her line goes back to the Anazeh," he tells you proudly, before you have asked.'] },
      { id: 'orchard', name: 'Citrus garden', sub: 'Where the Emir writes', x: 167, y: 575, glyph: 'O', kind: 'note', text: ['A servant is laying out cushions and a chessboard under the orange trees. The Emir writes poetry here in the afternoons.'] },
      { id: 'steward', name: 'Steward of the diwan', sub: 'Ask how the Emir receives', x: 547, y: 125, glyph: 'C', kind: 'talk', text: ['The steward pours you coffee first. "His Highness likes a story, as he likes a poem. He wants wool that can take sheikhs in muddy boots, warm colours, a carpet for the majlis. Silk will not do. And never talk price before the coffee."'] },
      { id: 'majlis', name: 'The majlis', sub: 'Audience with Emir Abdullah', x: 720, y: 205, glyph: '♛', kind: 'audience' },
      { id: 'pergola', name: 'Vine terrace', sub: 'Guests from the tribes', x: 1200, y: 520, glyph: 'V', kind: 'note', text: ['Men from the Hejaz, still dusty from the road, drink tea under the vines. One of them asks if you have come from Mecca.'] },
      { id: 'stores', name: 'Masons\' yard', sub: 'The palace is still being built', x: 1280, y: 295, glyph: 'M', kind: 'note', text: ['Stone blocks and scaffolding. A Circassian foreman says the east wing will be finished before winter, God willing.'] },
    ],
  },
  baghdad: {
    id: 'baghdad', settlement: 'baghdad', royal: 'faisal', name: 'The Royal Court', where: 'Baghdad',
    history: 'The court of King Faisal I, crowned in 1921. Sheikhs, deputies of the new parliament and British advisers all pass through its audience hall.',
    map: 'art/royal/baghdad-map.jpg', exterior: 'art/royal/baghdad-exterior.jpg',
    start: { x: 700, y: 880 },
    pois: [
      { id: 'gate', name: 'Palace gate', sub: 'Back to Baghdad', x: 700, y: 905, glyph: '⇣', kind: 'exit' },
      { id: 'forecourt', name: 'Forecourt fountain', sub: 'Deputies and petitioners', x: 713, y: 460, glyph: 'F', kind: 'note', text: ['Deputies of the new parliament argue in low voices by the fountain. A British adviser in a sun helmet checks his watch.'] },
      { id: 'aide', name: 'Chief of the Diwan', sub: 'Ask how the King receives', x: 713, y: 385, glyph: 'C', kind: 'talk', text: ['The Chief of the Diwan speaks carefully. "His Majesty has lived in Mecca, Istanbul and Damascus. He can smell an invented history. He wants quiet dignity: fine weave, deep colours, nothing that shouts. The hall must belong to no faction and welcome all of them."'] },
      { id: 'hall', name: 'Audience hall', sub: 'Audience with King Faisal I', x: 1147, y: 165, glyph: '♛', kind: 'audience' },
      { id: 'stables', name: 'Royal stables', sub: 'Horses and a carriage', x: 253, y: 160, glyph: 'S', kind: 'note', text: ['A motor car and a horse carriage stand side by side in the stable yard. The grooms clearly prefer the horses.'] },
      { id: 'garden', name: 'Orange garden', sub: 'Cypress and fountains', x: 227, y: 473, glyph: 'O', kind: 'note', text: ['Gardeners water the orange trees by hand from the canal. The smell of blossom follows you across the courtyard.'] },
      { id: 'pool', name: 'Pool pavilion', sub: 'Shade by the water', x: 1253, y: 480, glyph: 'P', kind: 'note', text: ['An old courtier asleep in the pavilion wakes long enough to tell you the Tigris was higher when he was young.'] },
      { id: 'service', name: 'Service gate', sub: 'Porters and deliveries', x: 987, y: 75, glyph: 'R', kind: 'note', text: ['Porters carry in crates of Persian tea and bolts of Manchester cloth. Everything comes through Baghdad.'] },
    ],
  },
  cankaya: {
    id: 'cankaya', settlement: 'ankara', royal: 'ataturk', name: 'Çankaya', where: 'Ankara',
    history: 'A vineyard house on a hill above Ankara, the President\'s residence since 1921. Ankara has been the capital of the Republic since 1923.',
    start: { x: 0, y: 0 },
    pois: [],
  },
};

export const venueFor = (settlement: string) => Object.values(VENUES).find((v) => v.settlement === settlement);
