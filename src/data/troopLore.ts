// The full page on each kind of man you can hire: who they are, what they are good for, where they let
// you down. Shown when you tap a guard in a hiring yard or in your caravan.
export interface TroopLore { who: string; good: string[]; weak: string[]; says: string }
export const TROOP_LORE: Record<string, TroopLore> = {
  fellah: {
    who: 'Sons of the villages along the Nile, hired by the week between harvests. They walk all day, carry what they are given and know which wells are sweet. Few of them have ever fired a gun.',
    good: ['Cheapest men on the road', 'Make a caravan look bigger than it is', 'Content with little'],
    weak: ['Run when the shooting starts', 'No use against real raiders'],
    says: '"My uncle says the road is safe this month. My uncle says many things."',
  },
  watchman: {
    who: 'The lamp-and-staff men of Giza who guard shops and storerooms at night. They know every thief in the district by name, and most of the thieves know them.',
    good: ['Cheap protection for short hauls', 'Steady around the bazaar and the villages'],
    weak: ['Out of their depth in the desert', 'Weak against armed raiders'],
    says: '"Nobody steals from a stall I am sitting beside. Nobody steals from my own cousin either."',
  },
  guard: {
    who: 'Former gendarmes and police, let go after the war, who now sell their old Martini rifles and their experience by the day. They have walked these roads before and expect to again.',
    good: ['Good strength for the price', 'Reliable on any Egyptian road'],
    weak: ['Grumble quickly when unpaid', 'No scouting'],
    says: '"Pay on the morning, effendi, and we shoot whoever you want on the afternoon."',
  },
  sentinel: {
    who: 'Cairo city watchmen who know the warehouses, the customs sheds and the men who visit both at night. Disciplined, a little proud, and well armed.',
    good: ['Solid strength on any road in Egypt', 'Steady under pressure'],
    weak: ['Not cheap', 'City men: unhappy far into the desert'],
    says: '"In Cairo we know who the thief is before he does."',
  },
  harbour: {
    who: 'Alexandria dock guards. They have seen every trick played on imported cargo, speak a little Greek and Italian, and can read a ship\'s papers.',
    good: ['Strong, and see trouble coming a little early', 'Best for cargo from the ports'],
    weak: ['The most expensive of the town guards'],
    says: '"A bale that weighs too much has something in it. A bale that weighs too little has someone\'s hand in it."',
  },
  bedouin: {
    who: 'Riders of the desert tribes, on their own horses. They read tracks, know which wells have water this season, and see raiders long before raiders see you.',
    good: ['Scout far ahead: the map opens around you', 'Bring their own mounts', 'Know the desert roads'],
    weak: ['Proud: hate to be left unpaid', 'Moderate strength in a straight fight'],
    says: '"The sand tells you who passed. You only have to listen."',
  },
  desertcaptain: {
    who: 'Bedouin chiefs\' sons who lead caravans from Suez to Amman. Raiders know their camel brands and think twice before attacking anything they ride with.',
    good: ['Strong and scouts far ahead', 'Raiders hesitate when they see him'],
    weak: ['Expensive', 'Expects respect, and good coffee'],
    says: '"Every well from here to Amman knows my father\'s name."',
  },
  veteran: {
    who: 'Men who fought in the Great War, in Palestine or at the Canal. Quiet, steady, and nobody on the road wants to test them.',
    good: ['Very strong', 'Do not panic'],
    weak: ['Expensive', 'Do not like to be hurried'],
    says: '"I have been shot at by better men than these, effendi."',
  },
  arnaut: {
    who: 'Albanian soldiers of fortune, the old Ottoman bodyguards, scarred and feared from Cairo to Damascus. Nobody robs a caravan an Arnaut rides with.',
    good: ['The strongest man you can hire', 'Raiders back away', 'For legendary cargo'],
    weak: ['Very expensive', 'Answers to nobody but the man who pays him'],
    says: '"I do not ride for the cause. I ride for the purse. Keep it full."',
  },
  reformed: {
    who: 'Raiders who chose to join you after a fight rather than be handed to the police. Cheap, mounted, and handy with a gun.',
    good: ['Almost free', 'Mounted', 'Know how raiders think'],
    weak: ['Loyalty is new and thin', 'Weak in a long fight'],
    says: '"Last week we wanted your rugs. This week we want your bread. Next week, who knows."',
  },
};
