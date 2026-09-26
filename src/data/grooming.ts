/** How each buyer reacts to the merchant's appearance and stock. */
export interface Grooming { smell: string[]; ragged: string[]; mockStock: string[]; mockLeave: string[] }

export const GROOMING: Record<string, Grooming> = {
  samira: {
    smell: [
      'Forgive me for saying so, but the hammam is only two streets away.',
      'I will stand a little upwind, if you do not mind. It is nothing personal.',
      'My husband smells like this after a week at the ginning mill. He, at least, has an excuse.',
    ],
    ragged: [
      'That galabiya has seen better years. So, I think, have you.',
      'I do not mind plain clothes. I only mind dust on the carpets you want me to buy.',
      'A merchant who looks tired sells rugs that look tired. Just an observation.',
    ],
    mockStock: [
      'Nothing here for my receiving room, I am afraid. I had hoped for a little more.',
      'These are honest pieces, but my mother-in-law would see through every one of them.',
      'I came looking for something fine. Perhaps next week.',
    ],
    mockLeave: [
      'Do send word when something good comes in. I mean it kindly.',
      'Good day. And perhaps the hammam before I come back.',
    ],
  },
  yusuf: {
    smell: [
      'My friend, I run a hotel. I know what three days without a bath smells like.',
      'If a guest smelled like this I would move him to the room over the kitchen.',
      'A bath costs two piastres. I have it in the ledger. You should too.',
    ],
    ragged: [
      'You look like my night porter at five in the morning.',
      'Dust on the galabiya, dust on the rugs. At least you are consistent.',
      'I do not need a dandy. But a clean collar sells a carpet faster.',
    ],
    mockStock: [
      'Nothing I can put in the lobby. The lobby is where they judge me.',
      'These are for the back stairs. I have already carpeted the back stairs.',
      'I had money in my pocket for once. A pity.',
    ],
    mockLeave: [
      'I will write in my ledger: no purchase. It is a sad little line.',
      'Next time, my friend. The station trains wait for no one, and neither do I.',
    ],
  },
  mariam: {
    smell: [
      'Oh. You must be working very hard. Karim gets like this at the telegraph office.',
      'Forgive me, it is only that my mother always says a bath makes a man lucky.',
      'I do not mean to be rude. Only, perhaps the hammam, when you have a moment?',
    ],
    ragged: [
      'Your galabiya looks like Karim\'s old one. I patched that one twice.',
      'You look tired. Have you eaten today?',
      'I would offer to mend that sleeve, but my mother would say it is not proper.',
    ],
    mockStock: [
      'Oh. There is nothing quite right today. That is all right.',
      'I think these are a little too plain even for our little flat. Maybe next time.',
      'I had so hoped to surprise Karim. Never mind.',
    ],
    mockLeave: [
      'I will come back, I promise. God keep you.',
      'Do not worry. Something lovely will come in, I am sure of it.',
    ],
  },
  hassan: {
    smell: [
      'Ya salaam! You smell like the back room of my coffee house on a Friday.',
      'Brother, even my backgammon players go to the hammam once a week.',
      'Stand there, not here. The wind is from your side.',
    ],
    ragged: [
      'That galabiya! Did you win it at backgammon, or lose it?',
      'You look like my customers. That is not a compliment, but it is not an insult either.',
      'Dusty, eh? Never mind. Dust is free, and so is my advice.',
    ],
    mockStock: [
      'Nothing today that would survive forty men and their coffee.',
      'Hmm. I came with coins in my pocket, and they are going home with me.',
      'Not today, brother. Not today.',
    ],
    mockLeave: [
      'Come for coffee, and bring me better rugs. In that order.',
      'I will tell everyone you are a good man. I will not mention the rugs.',
    ],
  },
  whitcombe: {
    smell: [
      'Oh dear. I say this as a friend. Soap is really quite inexpensive.',
      'I shall breathe through my handkerchief, if you don\'t mind. It\'s the heat, I expect.',
      'Goodness. I shall have to leave that out of my letter home. Mother would faint.',
    ],
    ragged: [
      'The pasha\'s coachman dresses better, and he is not trying to sell me anything.',
      'Rather dusty, aren\'t we? Never mind. So is Cairo.',
      'In Surrey one would at least brush one\'s coat before opening the shop.',
    ],
    mockStock: [
      'Oh. I\'m afraid these look rather like the mats outside the vicarage.',
      'I did so want something to write home about. There is nothing to write home about.',
      'Forgive me, but the children would wear through these by Easter.',
    ],
    mockLeave: [
      'Well, I shall say you were very charming, and leave it at that.',
      'Good afternoon. Do try a little harder, won\'t you?',
    ],
  },
  salem: {
    smell: [
      'You smell like my camels. My camels, at least, have the excuse of the desert.',
      'In Sinai we have no water and we wash. You have the Nile.',
      'Ha. Stand downwind, my friend, like a good camel.',
    ],
    ragged: [
      'Your clothes are like mine after the crossing. But I have crossed the Canal. You have crossed nothing.',
      'Dust does not frighten me. I was born in it.',
      'A poor coat on an honest man is no shame. We will see if you are honest.',
    ],
    mockStock: [
      'Nothing here I would put before a guest in my tent. A pity.',
      'These would not last one night of wind. I am sorry, but it is true.',
      'I sold good camels to buy a good rug. There is no good rug.',
    ],
    mockLeave: [
      'I go back to Imbaba. The camel traders lie, but at least they have camels.',
      'Peace be upon you. Find better wool, and I will find you.',
    ],
  },
  kasparian: {
    smell: [
      'Speaking as a physician, you are overdue for a bath. By some days.',
      'I would prescribe hot water, soap and a good scrubbing. The fee is waived.',
      'My patients sit closer to me than this, and they are ill. You have no excuse.',
    ],
    ragged: [
      'I came here with nothing once. I still brushed my coat every morning.',
      'The dust is general. The frayed cuff is a choice.',
      'My consulting room sees pashas. They would not let you past the porter.',
    ],
    mockStock: [
      'These are honest, but they are not fine. My patients notice fine.',
      'In Aintab the village looms made better than this. I remember them.',
      'Is there nothing with a proper knot count? No? I see.',
    ],
    mockLeave: [
      'Good day. My diagnosis is poor stock. The cure is patience.',
      'I will come again when you have something worthy of the consulting room.',
    ],
  },
  levy: {
    smell: [
      'Monsieur, you smell like a camel that has read about soap but never tried it.',
      'I have no time, and now I have no air either.',
      'Please. Even the bales in our basement smell better, and they came from Basra.',
    ],
    ragged: [
      'Our porters dress better. And we pay our porters very badly.',
      'Is this a costume? Are you playing the poor merchant for the tourists?',
      'You look like a rug nobody bought. How fitting.',
    ],
    mockStock: [
      'Is this a carpet shop or the bargain table at a jumble sale?',
      'My customers have left the village. They do not wish to buy it back.',
      'I cannot sell this on Rue Chérif Pacha. I could not give it away on Rue Chérif Pacha.',
    ],
    mockLeave: [
      'I write your name in my notebook. Under the heading: do not return.',
      'Merci, no. I have a train, and you have a great deal of work to do.',
    ],
  },
  antonios: {
    smell: [
      'My son, cleanliness is a kind of prayer. You have missed a few.',
      'Forgive an old man. The hammam would do you good, body and soul.',
      'Even the monks in the desert wash, now and then. Now would be a good time.',
    ],
    ragged: [
      'A plain robe is no sin. I have worn this cassock for twenty years.',
      'You look like you have been sweeping the church. That is honest work.',
      'Never mind the dust, my son. We are all dust in the end.',
    ],
    mockStock: [
      'These are humble, my son. But the church deserves a little more than humble.',
      'The committee gave me money for a good rug. I cannot bring them a mat.',
      'Nothing quite fit for the altar today. Perhaps God will send you something.',
    ],
    mockLeave: [
      'God keep you. And your stock. Especially your stock.',
      'I will pray for you, my son. And for better carpets.',
    ],
  },
  benakis: {
    smell: [
      'My God. Did something die in that galabiya, or are you merely resting?',
      'I have smelled better at the cotton exchange in August, and they sweat for money.',
      'Stand back, my friend. My tailor will charge me to air this suit.',
    ],
    ragged: [
      'My servants dress better than you, and they complain about their wages.',
      'You look like a man who lost everything in the cotton crash. Did you?',
      'Please tell me you have a better galabiya at home. Please.',
    ],
    mockStock: [
      'Is this a carpet shop or a doormat museum?',
      'My servants walk on rugs like this. My dogs walk on rugs like this.',
      'Salvago would laugh. Salvago has a villa full of real carpets. Show me real carpets.',
    ],
    mockLeave: [
      'I go to the races. At least there the horses are groomed.',
      'Call me when you have something from a pasha\'s house, not his stable.',
    ],
  },
  wasif: {
    smell: [
      'Let the record show the merchant has not bathed. The evidence is overwhelming.',
      'I have cross-examined sweatier men, but they were in the dock.',
      'Your case is not helped by the smell, my friend. No judge would sit this close.',
    ],
    ragged: [
      'You dress like a defendant who could not afford counsel.',
      'In Paris they would call this rustic. In Qasr el-Nil we call it shabby.',
      'Dust on a galabiya is circumstantial. Dust on everything is conclusive.',
    ],
    mockStock: [
      'Is this the stock, or the evidence against you?',
      'I have seen better rugs in the clerks\' room at the Mixed Courts.',
      'My study is lined with law books. These would embarrass the law books.',
    ],
    mockLeave: [
      'Case dismissed. For lack of merit.',
      'I rest my case. Somewhere with a better class of carpet.',
    ],
  },
  martel: {
    smell: [
      'Ah. One notices things, monsieur. One notices this rather strongly.',
      'At the legation we would call this an incident. I shall be discreet.',
      'I have negotiated with men in the Hauran who bathed more recently.',
    ],
    ragged: [
      'A most informal costume. Very authentic. Very dusty.',
      'The High Commission has a dress code. You would fail it at the gate.',
      'One need not wear a frock coat. But one could perhaps wear a clean one.',
    ],
    mockStock: [
      'Charming. For a consulate in a very small town.',
      'I am furnishing a residence, monsieur, not a guardhouse.',
      'Show me something that has hung in a palace. These have lain in a courtyard.',
    ],
    mockLeave: [
      'I shall say nothing of this in my report. Nothing at all.',
      'Au revoir. When you find something worthy of Beirut, send word to the legation.',
    ],
  },
  rustam: {
    smell: [
      'In Isfahan a merchant bathes before he unrolls a carpet. It is only respect.',
      'Brother, you smell like a wool bale after the monsoon.',
      'I crossed the desert in a Nairn car and I smell better than you.',
    ],
    ragged: [
      'A merchant who dresses like this is either very poor or very clever. I think poor.',
      'In Baghdad we say, sell the robe before you sell the rug.',
      'Dust on the merchant, dust on the rugs. Paris does not buy dust.',
    ],
    mockStock: [
      'These? In Baghdad I use these to wrap the good ones.',
      'I sell to Paris, my friend. Paris does not buy village mats.',
      'Show me a Kashan, a Tabriz, something from a royal loom. This is from somebody\'s goat.',
    ],
    mockLeave: [
      'I will buy from the Armenian in the Khan. He at least lies about better rugs.',
      'Peace be upon you, brother. And upon your poor stock.',
    ],
  },
  hollister: {
    smell: [
      'Say, friend, have you been sleeping in the stable with the camels?',
      'Back home in Ohio we have a thing called a bathtub. You\'d love it.',
      'Whew. Shepheard\'s would not let you past the terrace. Not even for tea.',
    ],
    ragged: [
      'You look like a fellow who sold his best clothes to buy his worst rugs.',
      'Is that galabiya an antique? Because I don\'t collect those.',
      'I\'ve seen railway tramps better turned out than this. And I\'ve met a few.',
    ],
    mockStock: [
      'I have seen finer rugs under the feet of mules at Jaffa Gate.',
      'I came for a museum piece. These are for wiping boots on.',
      'Friend, I buy what palaces are ashamed to part with. Not what villages are glad to be rid of.',
    ],
    mockLeave: [
      'I\'ll be at Shepheard\'s. Come find me when you have something worth the walk.',
      'So long. Don\'t take it personal. Actually, take it a little personal.',
    ],
  },
  shivakiar: {
    smell: [
      'Good heavens. Has somebody opened a drain, or is it only you?',
      'You smell like the servants\' quarters on a hot night. I have never been there, and now I need not go.',
      'Please do not come any closer. My perfume came from Paris and it is losing.',
    ],
    ragged: [
      'My footmen would be dismissed for looking like that. Twice.',
      'How very picturesque. Like a beggar in an Orientalist painting.',
      'Did you dress in the dark, or simply in the dust?',
    ],
    mockStock: [
      'My dear, my maid\'s maid would not wipe her slippers on these.',
      'Mon Dieu. My kitchen maids would be ashamed of these.',
      'Come back when you have something from a palace, not a village.',
    ],
    mockLeave: [
      'I shan\'t be sending you an invitation this season. Or any season.',
      'Do not trouble to bow. It would only stir up the smell.',
    ],
  },
  fuad: {
    smell: [
      'You come before your king unwashed? That is either very brave or very foolish.',
      'The chamberlain will air this room when you are gone. For some days.',
      'A merchant at Abdeen should smell of rosewater, not of the road.',
    ],
    ragged: [
      'My palace guards are better dressed, and they stand in the sun all day.',
      'You come to Abdeen in a galabiya fit for the field. Remarkable.',
      'In Italy they taught me that a man is known by his linen. What should I know of you?',
    ],
    mockStock: [
      'This is a village piece. You have brought village pieces to Abdeen.',
      'I founded a university, merchant. I know a doormat when I see one.',
      'Come back with a carpet from a palace loom, or do not come back.',
    ],
    mockLeave: [
      'The audience is ended. The chamberlain will show you out, quickly.',
      'We shall not speak of this again. And neither, I think, will you.',
    ],
  },
  nazli: {
    smell: [
      'Oh! Somebody bring the eau de cologne. Quickly.',
      'The sea air at Ras el-Tin is so fresh. You have undone it in a moment.',
      'In Paris the merchants smell of lavender. Here, apparently, of camel.',
    ],
    ragged: [
      'Is this what they wear in the bazaar now? I shall not tell Vogue.',
      'My ladies-in-waiting are staring. I cannot blame them.',
      'Such a sad little galabiya. Did it come with the rugs?',
    ],
    mockStock: [
      'These would not do for my maid\'s bedroom, let alone mine.',
      'In Paris they would call this charming. In Cairo we call it firewood.',
      'I read the Paris magazines, darling. Nothing in them looks like this.',
    ],
    mockLeave: [
      'Adieu. Do find something beautiful. I am told it exists.',
      'I shall go and look at the sea. It, at least, is not shabby.',
    ],
  },
  abdullah: {
    smell: [
      'In the tent we smell of smoke and horses. You smell of neither. Worse.',
      'A poet would find a verse for this smell. I am a poet, and I will not.',
      'My guards have asked to wait outside. I do not blame them.',
    ],
    ragged: [
      'I prefer the tent to the palace. But even in the tent, one brushes one\'s robe.',
      'A poor robe does not trouble me. A careless one does.',
      'You look like a man who lost a chess game and his coat with it.',
    ],
    mockStock: [
      'I am building a palace, merchant. You show me what goes under a goat.',
      'In chess one does not open with a pawn and call it a queen.',
      'Bring me a carpet worthy of my father\'s house in Mecca. These are worthy of a stable.',
    ],
    mockLeave: [
      'Checkmate, merchant. You never had the pieces.',
      'I return to Amman. The wind there is cleaner, and so are the carpets.',
    ],
  },
  faisal: {
    smell: [
      'I have ridden with Bedouin through the whole war. None smelled quite like this.',
      'Forgive me. A king learns to be polite. But not this polite.',
      'In Damascus the merchants bathed before the Friday market. It was a good custom.',
    ],
    ragged: [
      'I have seen fine things in Istanbul, in Damascus, in London. This is not one of them.',
      'The court in Baghdad has patience. But it also has a dress code.',
      'A merchant should look like his best carpet. I hope your best carpet looks better.',
    ],
    mockStock: [
      'I lived in Istanbul, merchant. I have seen what a real palace carpet is.',
      'These are fine for a guardroom. I did not come to furnish a guardroom.',
      'Come back when you have something from the old courts, not the old market.',
    ],
    mockLeave: [
      'I am a patient man. Not, it seems, patient enough.',
      'Peace be upon you. May your next caravan carry better wool.',
    ],
  },
  ataturk: {
    smell: [
      'The Republic has abolished many old customs. Bathing was not one of them.',
      'A modern nation begins with a clean man. Start with yourself.',
      'I have smelled the trenches at Gallipoli. You are a close second.',
    ],
    ragged: [
      'We have banned the fez. Do not tempt me to ban that galabiya.',
      'A man in a clean collar can build a country. A man in that can barely sell a rug.',
      'Dress for the century you live in, merchant. It is 1925.',
    ],
    mockStock: [
      'I want good Anatolian work, not the sweepings of a sleepy village.',
      'The Republic has abolished the old ways, and it seems you have abolished the good carpets. Answer quickly, I have a country to run.',
      'Bring me the finest loom in Anatolia. Not the tiredest.',
    ],
    mockLeave: [
      'Forward, merchant. That way. Out.',
      'Çankaya deserves better. Frankly, so do your customers.',
    ],
  },
};
import { CELEBS_1_GROOMING } from './celebs1';
import { CELEBS_2_GROOMING } from './celebs2';
import { CELEBS_3_GROOMING } from './celebs3';
import { CELEBS_4_GROOMING } from './celebs4';
Object.assign(GROOMING, CELEBS_1_GROOMING, CELEBS_2_GROOMING, CELEBS_3_GROOMING, CELEBS_4_GROOMING);
