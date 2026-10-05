// Illness for a 33-year-old male merchant, 1925. Every figure is an ESTIMATE from general
// medical-history sources (pre-antibiotic case fatality is well documented; incidence for a Cairo
// trader is a judgement scaled down from rural Egyptian data). Keep `estimate` until a dated source is attached.
export type Tier = 'common' | 'uncommon' | 'rare' | 'extreme';
export const TIER_LABEL: Record<Tier, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', extreme: 'Extremely rare' };
/** What an illness or injury does while it lasts. Fatigue is per day; the rest are points or percentages. */
export interface Effects {
  /** extra fatigue each day */ fatigue?: number;
  /** haggling patience at the stall (points) */ focus?: number;
  /** buyer trust at the stall (points) */ trust?: number;
  /** stall hours lost each day */ hours?: number;
  /** travel speed, % */ speed?: number;
  /** how much he can carry, % */ carry?: number;
  /** rug-inspection accuracy, % */ sight?: number;
}
export interface Disease {
  id: string; name: string; kind: 'disease' | 'injury'; tier: Tier;
  /** chance of catching it in a year of ordinary Cairo life (exposure multipliers scale it); 0 for injuries, which come from events */
  annual: number;
  /** chance a case ends in death with 1925 nursing care and no antibiotics */
  fatality: number;
  /** days it lasts */
  days: [number, number];
  effects: Effects;
  /** how it happens */ cause: string;
  symptom: string;
  /** what the doctor says (voice-over) */ doctor: string;
  /** prompt for the picture */ image: string;
  estimate: true;
}
export const DISEASES: Disease[] = [
  { id: "bacillary", name: "Bacillary dysentery", kind: "disease", tier: "common", annual: 0.15, fatality: 0.02, days: [3, 8], effects: {fatigue: 12, hours: 2}, cause: "Food or water fouled by flies or sewage.", symptom: "Cramps and a fever. You are never far from a bush.", doctor: "Dysentery is an infection of the bowel. The danger is not the infection itself but the water you lose. Drink boiled water with a little salt and sugar, rest, and eat plain rice or bread until it passes.", image: "A tired merchant in a bedroll holding his stomach, a water skin beside him, dusk light.", estimate: true },
  { id: "bronchitis", name: "Acute bronchitis", kind: "disease", tier: "common", annual: 0.2, fatality: 0.003, days: [5, 12], effects: {fatigue: 6, focus: -4}, cause: "Cold nights, dust and smoke.", symptom: "A rattling cough that interrupts every sentence.", doctor: "Bronchitis is inflammation of the airways. It usually follows a cold and settles with rest and warmth. If the fever climbs and the breathing becomes short, it may be turning to pneumonia, and that is when you come to me.", image: "A coughing man in a dusty bazaar lane at dusk, hand at his chest.", estimate: true },
  { id: "trachoma", name: "Trachoma", kind: "disease", tier: "common", annual: 0.25, fatality: 0, days: [30, 120], effects: {fatigue: 2, sight: -25}, cause: "Flies and shared cloths spread the germ from eye to eye.", symptom: "Red, gritty eyes. Rugs are harder to judge.", doctor: "Trachoma is a chronic eye infection, spread by flies and shared towels. Left alone it scars the eyelid until the lashes scrape the eye and sight is lost. Wash the face with clean water, never share a cloth, and come back for the eye treatment.", image: "Close-up of a man squinting at a rug fringe, eyelids red, golden lamp light.", estimate: true },
  { id: "bilharzia", name: "Bilharzia", kind: "disease", tier: "common", annual: 0.05, fatality: 0.001, days: [60, 240], effects: {fatigue: 3, hours: 1}, cause: "Wading in the Nile or canals where the snails live.", symptom: "A dull, steady tiredness you cannot sleep off.", doctor: "Bilharzia is a flatworm. Its young live in snails in still water and enter through the skin of a man who wades. It damages the bladder and liver over the years. Do not wade in the canals; the treatment is a long course of injections.", image: "A man ankle-deep in a green irrigation canal, a snail on a reed, soft morning light.", estimate: true },
  { id: "flu", name: "Influenza", kind: "disease", tier: "common", annual: 0.12, fatality: 0.006, days: [4, 10], effects: {fatigue: 10, focus: -5}, cause: "Crowded lanes in winter. The great pandemic was only seven years ago.", symptom: "Fever, aching bones and a head full of wool.", doctor: "Influenza spreads in crowds. Most men recover in a week, but it can strike the lungs. Stay in, keep warm, drink fluids, and do not go back to the stall too early.", image: "A shivering merchant wrapped in a blanket behind his stall, pale light.", estimate: true },
  { id: "sandfly", name: "Sandfly fever", kind: "disease", tier: "common", annual: 0.08, fatality: 0, days: [3, 5], effects: {fatigue: 14, hours: 3}, cause: "Bites from sandflies on summer nights.", symptom: "Three days of fever, headache and aching behind the eyes.", doctor: "Sandfly fever is a short, miserable fever carried by tiny biting flies. It does not kill, and it passes in about three days, but you will feel as if you have been beaten. Sleep under a net and wait.", image: "A man lying in a bed under a mosquito net, a lamp and tiny flies in the air.", estimate: true },
  { id: "scabies", name: "Scabies", kind: "disease", tier: "common", annual: 0.07, fatality: 0, days: [10, 25], effects: {fatigue: 3, focus: -3}, cause: "Close contact and shared bedding in crowded lodgings.", symptom: "An itch that is worst at night, and a rash between the fingers.", doctor: "Scabies is a tiny mite that burrows under the skin. It spreads in crowded lodgings. Wash the bedding, treat the skin with sulphur ointment, and treat the whole household or it returns.", image: "Hands with a red rash between the fingers, a jar of yellow ointment beside them.", estimate: true },
  { id: "amoebic", name: "Amoebic dysentery", kind: "disease", tier: "uncommon", annual: 0.045, fatality: 0.04, days: [10, 30], effects: {fatigue: 8, hours: 1}, cause: "Water with the amoeba. Unlike bacillary dysentery it keeps returning.", symptom: "It comes and goes, and each return is worse.", doctor: "This is dysentery caused by an amoeba, not a bacterium. It can hide for months and return, and it may reach the liver and form an abscess. Emetine, given by a doctor in careful doses, can cure it; do not buy it from a stall.", image: "A glass of cloudy water under a microscope-like circle, a tired man behind it.", estimate: true },
  { id: "hookworm", name: "Hookworm", kind: "disease", tier: "uncommon", annual: 0.03, fatality: 0, days: [60, 200], effects: {fatigue: 3, speed: -8}, cause: "Barefoot walking on wet soil where the larvae wait.", symptom: "Pale, breathless and heavy-legged.", doctor: "Hookworm enters through the bare foot and lives in the gut, feeding on blood. The slow loss of blood makes a man pale and weak. Wear shoes, and take the treatment a doctor prescribes: it is a poison to the worm and in too large a dose to you.", image: "Bare feet in damp earth, pale hands, a worker resting under a palm.", estimate: true },
  { id: "malaria", name: "Malaria", kind: "disease", tier: "uncommon", annual: 0.01, fatality: 0.01, days: [7, 21], effects: {fatigue: 10, hours: 3, speed: -15}, cause: "The Anopheles mosquito, at dusk and in summer, in the Fayum, the Delta and the south.", symptom: "Shaking cold, then fever, every second or third day.", doctor: "Malaria comes from a parasite carried by the mosquito. The fever returns in cycles and the attacks can come back for years. Quinine controls it. Sleep under a net and avoid standing water at dusk.", image: "A feverish man under a mosquito net, a canal and reeds at dusk behind him.", estimate: true },
  { id: "pneumonia", name: "Pneumonia", kind: "disease", tier: "uncommon", annual: 0.015, fatality: 0.25, days: [8, 14], effects: {fatigue: 18, hours: 6, focus: -8}, cause: "A chest infection that follows cold, exhaustion or influenza.", symptom: "A high fever and a chest like a locked door.", doctor: "Pneumonia is infection of the lung itself. There is no specific medicine yet. The crisis comes on about the seventh day: either the fever breaks and he lives, or it does not. Nursing, warmth, fluids and rest are everything.", image: "A man propped on pillows by a window, sweating, the doctor’s hand on his wrist.", estimate: true },
  { id: "tb", name: "Tuberculosis", kind: "disease", tier: "uncommon", annual: 0.008, fatality: 0.1, days: [60, 240], effects: {fatigue: 7, hours: 2}, cause: "Breathing the cough of a sick man in a crowded room.", symptom: "A cough that will not leave, night sweats, and a slow loss of flesh.", doctor: "Tuberculosis is a slow disease of the lungs, and one of the great killers of the age. There is no drug. The best treatment is rest, fresh air and good food, sometimes in a sanatorium, and a man who coughs blood must stop work.", image: "A thin man on a balcony in the sun, a blanket on his knees, a handkerchief in his hand.", estimate: true },
  { id: "brucellosis", name: "Brucellosis (Malta fever)", kind: "disease", tier: "uncommon", annual: 0.01, fatality: 0.02, days: [30, 90], effects: {fatigue: 8, focus: -4}, cause: "Raw goat or sheep milk and soft cheese.", symptom: "A fever that rises each evening, sweats at night, and aching joints, for weeks.", doctor: "Malta fever comes from unboiled milk and cheese from infected goats. It is a long, wearing fever that comes and goes. Boil your milk, and rest, and do not expect it to be gone in a week.", image: "A man at a camp fire holding a bowl of milk, goats in the background, golden light.", estimate: true },
  { id: "leish", name: "Oriental sore", kind: "disease", tier: "uncommon", annual: 0.006, fatality: 0, days: [60, 180], effects: {fatigue: 1, trust: -3}, cause: "A sandfly bite, usually on the face or hands.", symptom: "A sore that will not heal, and leaves a scar.", doctor: "This is a skin infection from a sandfly bite. It forms a crusted ulcer that lasts months and leaves a scar. It does not kill, but a scar on the face is noticed, and buyers do notice.", image: "Close-up of a hand with a round crusted sore, a fly on the wall, sepia light.", estimate: true },
  { id: "relapsing", name: "Relapsing fever", kind: "disease", tier: "uncommon", annual: 0.006, fatality: 0.04, days: [14, 28], effects: {fatigue: 10, hours: 2}, cause: "Lice and ticks in crowded lodgings and caravanserais.", symptom: "A fever that stops after a few days and then comes back.", doctor: "Relapsing fever is carried by lice and ticks. The fever goes away for a week and then returns, usually for several rounds. Burn the infested clothes, wash, and rest.", image: "A man in a crowded inn scratching at his collar, a tick on a wall.", estimate: true },
  { id: "tapeworm", name: "Tapeworm", kind: "disease", tier: "uncommon", annual: 0.015, fatality: 0, days: [40, 120], effects: {fatigue: 2}, cause: "Undercooked meat.", symptom: "Hunger that cannot be satisfied, and a loss of weight.", doctor: "The tapeworm lives in the gut and takes the food you eat. It comes from meat that was not cooked through. A doctor can remove it with the right medicine.", image: "A man staring at a plate of grilled meat, hand on his stomach.", estimate: true },
  { id: "typhoid", name: "Typhoid fever", kind: "disease", tier: "rare", annual: 0.006, fatality: 0.12, days: [21, 35], effects: {fatigue: 14, hours: 8, focus: -6}, cause: "Water or food fouled by a carrier.", symptom: "A fever that climbs each evening for weeks.", doctor: "Typhoid fever is a long illness. The fever rises in steps over the first week and stays high for weeks. In the third week the bowel can bleed or burst. It is nursing that saves a man: fluids, liquid food, and careful watching.", image: "A man in bed with a damp cloth on his forehead, a nurse with a thermometer.", estimate: true },
  { id: "smallpox", name: "Smallpox", kind: "disease", tier: "rare", annual: 0.002, fatality: 0.03, days: [18, 28], effects: {fatigue: 16, hours: 8, trust: -8}, cause: "Contact with the sick. A vaccinated man almost always lives.", symptom: "Fever, then pustules. The lane stays away.", doctor: "Smallpox is one of the oldest killers. Vaccination, with the cowpox lymph, almost always prevents it or makes it mild, which is why I will look for the scar on your arm. A man in the full disease must be isolated.", image: "A scarred arm showing a round vaccination mark, a physician’s lancet beside it.", estimate: true },
  { id: "diphtheria", name: "Diphtheria", kind: "disease", tier: "rare", annual: 0.002, fatality: 0.1, days: [10, 21], effects: {fatigue: 14, hours: 4}, cause: "Droplets from a sick child or adult in a crowded room.", symptom: "A sore throat with a grey skin across it, and a hoarse voice.", doctor: "Diphtheria forms a grey membrane that can choke the throat, and poisons the heart. The antitoxin, given early, saves lives. If you have a sore throat and a grey patch, send for me at once.", image: "A throat lit by a doctor’s lamp, a tongue depressor, a grey membrane at the back.", estimate: true },
  { id: "dental", name: "Dental abscess", kind: "disease", tier: "rare", annual: 0.012, fatality: 0.01, days: [5, 12], effects: {fatigue: 5, focus: -6, hours: 2}, cause: "A rotten tooth that has gone untreated.", symptom: "A swollen cheek and a throbbing jaw.", doctor: "A tooth that rots can fill with pus. If the infection spreads into the jaw and neck, it can kill a man. The tooth must be pulled, and the pus let out. It is not nothing.", image: "A man holding his swollen cheek, a pair of dental forceps on a tray.", estimate: true },
  { id: "heatstroke", name: "Heatstroke", kind: "disease", tier: "rare", annual: 0.015, fatality: 0.05, days: [2, 6], effects: {fatigue: 25, hours: 8}, cause: "Walking at midday in summer with too little water.", symptom: "A hot dry skin, confusion and a headache like a hammer.", doctor: "Heatstroke is when the body can no longer cool itself. The skin goes dry and hot and the mind wanders. Cool him in the shade, pour water over him, and give him fluids. It can kill in hours.", image: "A man collapsed in the sun near a camel, an empty waterskin in the sand.", estimate: true },
  { id: "tetanus", name: "Tetanus", kind: "disease", tier: "rare", annual: 0.0004, fatality: 0.5, days: [14, 30], effects: {fatigue: 20, hours: 8}, cause: "A dirty wound. The germ lives in soil and manure.", symptom: "A stiff jaw, and spasms that grow worse.", doctor: "Tetanus enters through a dirty wound. The jaw locks, then the whole body convulses. Antitoxin, given early after a wound, can prevent it. After any dirty wound, come to me the same day.", image: "A rusty nail in a wooden plank, a man’s locked jaw, a lamp in a dark room.", estimate: true },
  { id: "cholera", name: "Cholera", kind: "disease", tier: "extreme", annual: 0.0001, fatality: 0.4, days: [5, 10], effects: {fatigue: 25, hours: 8}, cause: "Water from a well fouled by a sick man’s waste. Egypt has been free since 1902.", symptom: "Sudden rice-water diarrhoea and cramps, and a man can lose a day’s water in an hour.", doctor: "Cholera kills by drying a man out. The treatment is salt water, given in quantity, and in hospital by injection. Egypt has had no cholera for years, so the arrival of one case closes the port.", image: "A village well with a quarantine flag, a doctor in a mask.", estimate: true },
  { id: "typhus", name: "Typhus", kind: "disease", tier: "extreme", annual: 0.0005, fatality: 0.15, days: [14, 21], effects: {fatigue: 16, hours: 6, focus: -8}, cause: "Lice from crowded, filthy quarters.", symptom: "Fever, a headache and a grey rash.", doctor: "Typhus is carried by body lice. It follows war, famine and crowding. Delouse the clothes, wash, and nurse the sick man through the second week, which is the crisis.", image: "A louse on a wool thread under a lamp, a man in a cot.", estimate: true },
  { id: "plague", name: "Plague", kind: "disease", tier: "extreme", annual: 0.0003, fatality: 0.6, days: [7, 14], effects: {fatigue: 20, hours: 8}, cause: "Infected rat fleas. Egypt still has cases at the ports.", symptom: "Swollen, painful glands in the groin or armpit and a high fever.", doctor: "Plague is carried by fleas on rats. The glands swell into buboes. It kills over half those who catch it, and in its lung form nearly all. The port authorities will isolate a case; do not hide it.", image: "A rat on a grain sack in a port warehouse, a quarantine flag on the wall.", estimate: true },
  { id: "rabies", name: "Rabies", kind: "disease", tier: "extreme", annual: 4e-05, fatality: 0.99, days: [10, 40], effects: {fatigue: 20, hours: 8}, cause: "The bite of a rabid dog, jackal or cat.", symptom: "Fear of water and spasms of the throat.", doctor: "Once the signs begin, rabies is nearly always fatal. If you are bitten by a dog you do not know, you must be treated at once, before the signs. There is a vaccine, and the Pasteur treatment is given in Cairo.", image: "A stray dog at a lane corner, a bite on a forearm.", estimate: true },
  { id: "concussion", name: "Head trauma (concussion)", kind: "injury", tier: "common", annual: 0, fatality: 0.005, days: [3, 14], effects: {fatigue: 10, focus: -14, hours: 3, sight: -10}, cause: "A blow to the head in a beating or a fall.", symptom: "A headache, dizziness and trouble keeping a thought in order.", doctor: "A blow to the head shakes the brain inside the skull. It brings a headache, dizziness and poor memory. Rest in a dark room, no work, no reading, and wake him if he is drowsy. If he vomits or is confused, it is more serious.", image: "A man sitting with a hand on his temple, a doctor holding up two fingers in front of him.", estimate: true },
  { id: "bruises", name: "Bruises and black eye", kind: "injury", tier: "common", annual: 0, fatality: 0, days: [3, 7], effects: {fatigue: 3, trust: -4, sight: -10}, cause: "A beating or a fist.", symptom: "Swelling, and a face that buyers notice.", doctor: "A bruise is bleeding under the skin. Cold cloths on the first day, warmth after. It will pass, but a battered face does not inspire trust at the stall.", image: "A black eye and a cut lip on a bearded man, a cold compress in the doctor’s hand.", estimate: true },
  { id: "ribs", name: "Cracked ribs", kind: "injury", tier: "common", annual: 0, fatality: 0.01, days: [14, 35], effects: {fatigue: 8, speed: -12, hours: 2, carry: -30}, cause: "A kick or a fall from a camel.", symptom: "A sharp pain at every breath.", doctor: "Ribs mend by themselves in a month. They are not bound tightly any more, because a man who cannot breathe deeply is at risk of pneumonia. Breathe deeply, cough gently, and do not lift.", image: "A man’s bare back with a bruise, a doctor’s hands on his ribs.", estimate: true },
  { id: "forearm", name: "Broken forearm", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.005, days: [35, 60], effects: {fatigue: 4, carry: -60, hours: 2, trust: -2}, cause: "Blocking a blow or a fall.", symptom: "A bent arm and pain at the wrist.", doctor: "A broken arm is set straight, and held in plaster or splints for about six weeks. The bones knit by themselves, but only if they are held still. He cannot lift bales until it is done.", image: "An arm in plaster and a sling, a bale of rugs he cannot lift beside him.", estimate: true },
  { id: "ankle", name: "Sprained ankle", kind: "injury", tier: "common", annual: 0, fatality: 0, days: [7, 21], effects: {speed: -30, carry: -20}, cause: "A bad step on rough ground or running.", symptom: "A swollen ankle that will not bear weight.", doctor: "A sprain is a torn ligament. Bind it, raise it and rest it, and then walk on it a little each day. Walking on it too soon makes it worse.", image: "A swollen bandaged ankle on a stool, a walking stick.", estimate: true },
  { id: "cut", name: "Deep cut", kind: "injury", tier: "common", annual: 0, fatality: 0.01, days: [7, 21], effects: {fatigue: 4, carry: -20}, cause: "A knife or a broken rug-loom.", symptom: "A bleeding gash that must be closed.", doctor: "A deep cut must be washed, stitched and kept clean. The danger is not the blood but infection. If it turns red and hot, it is going bad, and you need me within a day.", image: "A doctor stitching a forearm under a lamp, a bowl of washing water.", estimate: true },
  { id: "stab", name: "Stab wound", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.08, days: [21, 60], effects: {fatigue: 14, carry: -50, speed: -20, hours: 4}, cause: "A knife in a robbery.", symptom: "A deep wound that bleeds, and weakness.", doctor: "A stab wound may look small and still be deep. The risk is bleeding inside, and infection. Clean it, close it, rest. If the belly is rigid or he vomits, he must go to a hospital at once.", image: "A bandaged side, a bloodied shirt, a knife on the floor.", estimate: true },
  { id: "gunshot", name: "Gunshot wound", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.15, days: [30, 90], effects: {fatigue: 20, carry: -70, speed: -35, hours: 6, focus: -8}, cause: "A raider’s rifle or a revolver.", symptom: "A bleeding wound, shock and weakness.", doctor: "A bullet carries dirt and cloth into the wound, and the infection kills more men than the bullet. The wound is opened, cleaned, and left to drain. Do not push it closed. A hospital is the best place.", image: "A bullet on a metal tray with forceps, a bloody bandage, an operating lamp.", estimate: true },
  { id: "burn", name: "Burns", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.02, days: [14, 45], effects: {fatigue: 6, carry: -30, trust: -4}, cause: "A camp fire or lamp oil.", symptom: "Red, blistering skin and severe pain.", doctor: "A burn destroys the skin, which is the body’s defence against germs. Cool it with clean water, cover it, and do not break the blisters. A large burn needs hospital care.", image: "A bandaged hand over a camp fire, a bucket of clean water.", estimate: true },
  { id: "camelbite", name: "Camel bite", kind: "injury", tier: "common", annual: 0, fatality: 0.01, days: [10, 28], effects: {fatigue: 5, carry: -25}, cause: "A rutting or angry camel.", symptom: "A crushed, torn wound that gets infected easily.", doctor: "A camel’s bite is a crush as much as a cut, and it is full of bacteria. Wash the wound thoroughly. It is the infection I fear. Do not try to cover it up.", image: "A camel baring its teeth, a torn sleeve, a bandage.", estimate: true },
  { id: "kick", name: "Kick or fall from a mount", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.01, days: [7, 30], effects: {fatigue: 10, speed: -20, carry: -30}, cause: "A frightened horse or camel.", symptom: "Pain in the hip, back or ribs, and a limp.", doctor: "A fall can cause damage that does not show at first. Lie still, do not stand until I have examined the spine. Most mend with rest, but there may be a broken bone.", image: "A horse rearing, a man on the ground, a doctor’s hands at his hip.", estimate: true },
  { id: "scorpion", name: "Scorpion sting", kind: "injury", tier: "common", annual: 0, fatality: 0.001, days: [1, 3], effects: {fatigue: 8, hours: 2, focus: -4}, cause: "A hand or foot put into a dark crevice or bedding.", symptom: "Sharp pain and numbness, and a fever.", doctor: "Most scorpion stings in Egypt are painful rather than dangerous, but the yellow kind can kill a child. Keep him still, cool the sting, and watch the breathing.", image: "A scorpion on a boot, a man’s swollen hand.", estimate: true },
  { id: "snake", name: "Viper bite", kind: "injury", tier: "rare", annual: 0, fatality: 0.1, days: [7, 30], effects: {fatigue: 15, hours: 6, carry: -30}, cause: "The horned viper of the desert, hidden in the sand.", symptom: "Swelling, intense pain and bleeding from the bite.", doctor: "The horned viper is a real danger in the desert. A man bitten should lie still, with the limb below the heart, and be brought to a doctor. Do not cut the wound or suck the venom.", image: "A horned viper in the sand beside a footprint.", estimate: true },
  { id: "dislocation", name: "Dislocated shoulder", kind: "injury", tier: "uncommon", annual: 0, fatality: 0, days: [14, 35], effects: {carry: -50, hours: 2}, cause: "A fall or being dragged by a rope.", symptom: "A shoulder out of its socket, and an arm that cannot move.", doctor: "The shoulder is put back by a doctor with a firm, quick movement, and then held in a sling. It is a sharp pain, and then a relief. The shoulder will be weak for weeks.", image: "A man’s arm in a sling and a doctor’s hand on the shoulder.", estimate: true },
  { id: "crush", name: "Crushed hand", kind: "injury", tier: "rare", annual: 0, fatality: 0.01, days: [21, 60], effects: {carry: -70, hours: 3, trust: -3}, cause: "A bale or a loom beam.", symptom: "Swelling and bruising, and fingers that will not close.", doctor: "A crush injury damages bone and flesh together. It can stop the blood supply to the fingers. Keep it raised, and let me see it today.", image: "A heavy loom beam over a hand, bruised fingers.", estimate: true },
  { id: "eyeinjury", name: "Eye injury", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.002, days: [7, 21], effects: {sight: -50, focus: -6, hours: 3}, cause: "Sand, a thorn or a flying splinter.", symptom: "A painful eye that runs with tears.", doctor: "An eye with something in it must not be rubbed. Wash it with clean water. If it is a thorn or a splinter, I will take it out. A neglected eye injury can cost the sight.", image: "An eyecup, a doctor’s light, a man looking up.", estimate: true },
  { id: "infection", name: "Wound infection", kind: "injury", tier: "uncommon", annual: 0, fatality: 0.12, days: [7, 21], effects: {fatigue: 14, hours: 3}, cause: "A dirty wound that was not washed or dressed.", symptom: "Red, hot swelling, pus and a fever.", doctor: "An infected wound can poison the blood. It must be opened, washed and dressed again. If red lines run up the arm, come to me the same hour.", image: "A red infected forearm with streaks, a doctor’s lancet.", estimate: true },
];
export const DISEASE = (id: string) => DISEASES.find((d) => d.id === id);

/** everything currently wrong with him, added up (focus, trust, sight, speed, carry, hours and fatigue) */
export function healthEffects(list: Illness[] | undefined): Required<Effects> {
  const t: Required<Effects> = { fatigue: 0, focus: 0, trust: 0, hours: 0, speed: 0, carry: 0, sight: 0 };
  for (const il of list ?? []) { const e = DISEASE(il.id)?.effects; if (!e) continue; for (const k of Object.keys(t) as (keyof Effects)[]) t[k] += e[k] ?? 0; }
  t.speed = Math.max(-80, t.speed); t.carry = Math.max(-90, t.carry); t.sight = Math.max(-80, t.sight);
  return t;
}

/** add a case (an injury from a fight, say) unless he already has it; returns the new list */
export function addIllness(list: Illness[] | undefined, id: string, day: number, rand: () => number = Math.random): Illness[] {
  const d = DISEASE(id); const cur = list ?? [];
  if (!d || cur.some((i) => i.id === id)) return cur;
  return [...cur, { id, since: day, until: day + d.days[0] + Math.floor(rand() * (d.days[1] - d.days[0] + 1)) }];
}

export interface Illness { id: string; since: number; until: number; peaked?: boolean; /** Dr Feras has treated it */ treated?: boolean }
/** `at`: the settlement he sleeps in (null on the road). `mounted`: he rides or leads animals. `wounds`: open wounds he has. */
export interface ExposureCtx { day: number; onRoad: boolean; thirsty: boolean; fatigue: number; at?: string | null; mounted?: boolean }

const PORTS = ['alexandria', 'portsaid', 'jaffa', 'beirut', 'istanbul'];
const BIG_TOWNS = ['cairo', 'alexandria', 'portsaid', 'istanbul', 'damascus', 'aleppo', 'baghdad', 'jerusalem', 'beirut'];
const OUTSIDE_EGYPT_CHOLERA = ['baghdad', 'damascus', 'aleppo', 'beirut'];
const WET_EGYPT = ['giza', 'cairo', 'tanta', 'fayoum', 'saqqara', 'portsaid', 'alexandria'];
/** wounds that stay open and can go bad */
export const OPEN_WOUNDS = ['cut', 'stab', 'gunshot', 'camelbite', 'burn', 'crush', 'snake'];

const GUT = ['bacillary', 'amoebic', 'typhoid'];
const month = (day: number) => new Date(Date.UTC(1925, 2, 9 + day)).getUTCMonth(); // 0 = January

/** how much the day's circumstances scale a disease's yearly chance */
export function exposure(id: string, c: ExposureCtx): number {
  const m = month(c.day), summer = m >= 4 && m <= 9, winter = m === 11 || m <= 1, spring = m >= 2 && m <= 4;
  const at = c.at ?? '', town = BIG_TOWNS.includes(at);
  let x = 1;
  if (GUT.includes(id)) { if (c.onRoad) x *= 2.5; if (c.thirsty) x *= 1.5; if (summer) x *= 1.5; if (town) x *= 1.3; }
  if (id === 'malaria') { x *= summer ? 2.5 : 0.3; if (c.onRoad) x *= 3; if (at === 'fayoum') x *= 3; }
  if (id === 'bilharzia' || id === 'hookworm') { if (c.onRoad) x *= 3; if (WET_EGYPT.includes(at)) x *= 1.5; }
  if (id === 'bronchitis' || id === 'pneumonia') { if (winter) x *= 2.5; if (c.onRoad && winter) x *= 1.5; }
  if (id === 'influenza') { if (winter) x *= 3; if (town) x *= 1.6; }
  if (id === 'trachoma' && c.onRoad) x *= 1.5;
  if (id === 'heatstroke') { x *= summer ? 3 : 0.1; if (c.onRoad) x *= 2; if (c.thirsty) x *= 4; }
  if (id === 'relapsing' || id === 'typhus') { if (c.onRoad) x *= 3; if (town && winter) x *= 2; if (c.fatigue >= 70) x *= 1.3; }
  if (id === 'brucellosis' || id === 'tapeworm') { if (c.onRoad) x *= 2; }
  if (id === 'leish') { if (c.onRoad) x *= 2; if (summer) x *= 2; }
  if (id === 'tb' || id === 'smallpox' || id === 'diphtheria') { if (town) x *= 2; if (winter && id === 'diphtheria') x *= 2; }
  if (id === 'plague') { if (PORTS.includes(at)) x *= 10; if (spring) x *= 2; }
  if (id === 'cholera') { if (OUTSIDE_EGYPT_CHOLERA.includes(at)) x *= 25; else if (c.onRoad) x *= 2; }
  if (id === 'rabies' && c.onRoad) x *= 4;
  if (id === 'dental' && c.fatigue >= 60) x *= 1.4;
  if (c.fatigue >= 70) x *= 1.5; // a worn-out man falls ill more easily
  return x;
}

/** Chance per night of a mishap, by injury. Triggers: rough ground and a long day, mounts, pack animals,
 *  a cold camp in the desert, the fire, wind and sand, and heavy loading. */
export function injuryRisk(id: string, c: ExposureCtx): number {
  const m = month(c.day), summer = m >= 4 && m <= 9;
  const tired = c.fatigue >= 70 ? 1.6 : 1;
  const road = c.onRoad;
  switch (id) {
    case 'ankle': return (road ? 0.003 : 0.0003) * tired;
    case 'kick': return (c.mounted ? (road ? 0.002 : 0.0004) : 0) * tired;
    case 'camelbite': return c.mounted ? (road ? 0.002 : 0.0006) : 0;
    case 'dislocation': return (road ? 0.0005 : 0.0001) * tired;
    case 'ribs': return c.mounted && road ? 0.0008 * tired : 0;
    case 'scorpion': return road ? (summer ? 0.004 : 0.001) : 0.0002;
    case 'snake': return road ? (summer ? 0.0015 : 0.0003) : 0;
    case 'burn': return road ? 0.0012 : 0.0002;
    case 'eyeinjury': return road ? 0.0012 : 0.0003;
    case 'crush': return road ? 0.0004 : 0.0002;
    case 'cut': return road ? 0.0008 : 0.0004;
    default: return 0;
  }
}

/** annual chance -> the chance on one day, so a year of the same exposure gives that annual chance */
export const dailyHazard = (annual: number) => 1 - Math.pow(1 - Math.min(0.95, annual), 1 / 365);

export interface IllnessStep { illnesses: Illness[]; fatigueAdd: number; notes: string[]; died?: { id: string } }

/** One night. `deadly`: a fatal case really kills (Ironman); otherwise the man pulls through, much weaker. */
export function stepIllness(list: Illness[] | undefined, c: ExposureCtx, o: { risk?: number; deadly?: boolean; rand?: () => number; resting?: boolean } = {}): IllnessStep {
  const rand = o.rand ?? Math.random;
  const risk = o.risk ?? 1;
  const notes: string[] = [];
  let fatigueAdd = 0;
  const out: Illness[] = [];
  let died: { id: string } | undefined;
  for (const il of list ?? []) {
    const d = DISEASE(il.id); if (!d) continue;
    fatigueAdd += d.effects.fatigue ?? 0;
    if (c.day >= il.until) {
      // the crisis: nursing in a town helps, the road and exhaustion do not
      const care = o.resting ? 0.8 : 1.3;
      const p = Math.min(0.9, d.fatality * care * (c.fatigue >= 80 ? 1.3 : 1));
      if (d.fatality > 0 && rand() < p) {
        if (o.deadly) { died = { id: d.id }; break; }
        notes.push(`${d.name}: you came close to dying and pulled through. You are very weak.`);
        fatigueAdd += 40;
      } else notes.push(d.kind === 'injury' ? `${d.name}: it has healed enough to work.` : `${d.name} has run its course. You are on your feet again.`);
      continue;
    }
    out.push(il);
  }
  if (!died) {
    const have = new Set(out.map((i) => i.id));
    // wounds that stay open and untreated can go bad: wound infection, and rarely tetanus
    const open = out.filter((i) => OPEN_WOUNDS.includes(i.id) && !i.treated);
    if (open.length) {
      const mult = (c.onRoad ? 2 : 1) * (c.fatigue >= 70 ? 1.4 : 1) * risk;
      if (!have.has('infection') && rand() < 0.006 * mult * open.length) {
        out.push({ id: 'infection', since: c.day, until: c.day + 7 + Math.floor(rand() * 15) }); have.add('infection');
        notes.push('The wound has gone bad. It is hot, swollen and weeping. Go and see Dr Feras.');
      }
      if (!have.has('tetanus') && rand() < 0.0004 * mult * open.length) {
        out.push({ id: 'tetanus', since: c.day, until: c.day + 14 + Math.floor(rand() * 17) }); have.add('tetanus');
        notes.push('Your jaw is stiff and the muscles in your back have begun to spasm. This is serious.');
      }
    }
    // accidents of the road and the camp
    for (const d of DISEASES) {
      if (d.kind !== 'injury' || have.has(d.id)) continue;
      const q = injuryRisk(d.id, c) * risk;
      if (q > 0 && rand() < q) {
        const len = d.days[0] + Math.floor(rand() * (d.days[1] - d.days[0] + 1));
        out.push({ id: d.id, since: c.day, until: c.day + len }); have.add(d.id);
        notes.push(`Hurt: ${d.name.toLowerCase()}. ${d.symptom}`);
      }
    }
    for (const d of DISEASES) {
      if (have.has(d.id) || d.annual <= 0) continue;
      if (rand() < dailyHazard(d.annual * exposure(d.id, c) * risk)) {
        const len = d.days[0] + Math.floor(rand() * (d.days[1] - d.days[0] + 1));
        out.push({ id: d.id, since: c.day, until: c.day + len });
        notes.push(`You have fallen ill: ${d.name.toLowerCase()}. ${d.symptom}`);
      }
    }
  }
  return { illnesses: out, fatigueAdd, notes, died };
}

/** which injury a bad day can cause, by kind of trouble (weights) */
const HURT: Record<string, [string, number][]> = {
  beating: [['bruises', 4], ['concussion', 3], ['ribs', 3], ['cut', 2], ['forearm', 1]],
  fight: [['cut', 3], ['bruises', 3], ['concussion', 2], ['stab', 2], ['gunshot', 2], ['forearm', 1], ['burn', 1]],
  fall: [['ankle', 4], ['kick', 2], ['dislocation', 1], ['ribs', 2], ['forearm', 1]],
  camel: [['camelbite', 3], ['kick', 2], ['crush', 1]],
};
export function rollInjury(kind: keyof typeof HURT | string, rand: () => number = Math.random): string {
  const t = HURT[kind] ?? HURT.fight; let r = rand() * t.reduce((a, [, w]) => a + w, 0);
  return (t.find(([, w]) => (r -= w) <= 0) ?? t[0])[0];
}
