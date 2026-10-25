// How each buyer sounds before the words: the small things people say as they start to speak. "Hm.",
// "Ya salaam!", "Po po po.", "I say." Each is recorded once in that buyer's own voice, and the game puts
// one in front of an ordinary line now and then, chosen by how they feel, so the same line does not
// always come out the same way and nobody sounds as if they are reading from a card.
//   warm: pleased, won over · doubt: not having it · think: weighing it up · go: on the way out
export type Colour = 'warm' | 'doubt' | 'think' | 'go';
export interface VoiceColour { warm: string[]; doubt: string[]; think: string[]; go: string[] }

export const VOICE_COLOUR: Record<string, VoiceColour> = {
  // the lane's own buyers
  samira: { warm: ['Ah. Yes.', 'Now then.', 'Oh, that is lovely.'], doubt: ['Is that so?', 'Really?', 'Oh dear.'], think: ['Let me see.', 'I see, I see.'], go: ['Well.', 'No, I think not.'] },
  yusuf: { warm: ['Good, good.', 'Ah, now we talk.', 'Yes, yes.'], doubt: ['No, no, no.', 'Too much, too much.', 'Ya akhi...'], think: ['Let me think.', 'One moment.'], go: ['Enough.', 'Another day, my friend.'] },
  mariam: { warm: ['Oh!', 'Oh, Karim would love this.', 'Ya salaam!'], doubt: ['Oh... I do not know.', 'Indeed?', 'That much?'], think: ['Let me look.', 'Well...'], go: ['I am sorry.', 'Maybe another time.'] },
  nabil: { warm: ['Good.', 'So.', 'Yes. This is work.'], doubt: ['No.', 'Pah.', 'Please.'], think: ['You think so?', 'Let me count.'], go: ['We are done.', 'Good day.'] },
  cohen: { warm: ['Good. Good.', 'Very well.', 'Now that is sensible.'], doubt: ['No, no, no.', 'Come now.', 'My friend.'], think: ['Let me work it out.', 'So...'], go: ['It does not add up.', 'Thank you, no.'] },
  hassan: { warm: ['Ya salaam!', 'Ahh, habibi.', 'Wallahi, nice.'], doubt: ['La, la, la.', 'Eh?', 'Yaa... no.'], think: ['Mmm.', 'Let me see, let me see.'], go: ['Khalas.', 'Ma\'a salama, ya ibni.'] },
  whitcombe: { warm: ['Oh, how lovely.', 'I say!', 'Oh, gosh.'], doubt: ['Oh dear.', 'Goodness.', 'I am not sure.'], think: ['Let me think.', 'Now, now.'], go: ['I really must go.', 'Perhaps not, thank you.'] },
  kasparian: { warm: ['Ah.', 'Yes. Good.', 'That is honest work.'], doubt: ['Ah, no.', 'I think not.', 'So you say.'], think: ['Let me look closely.', 'One moment.'], go: ['Forgive me.', 'Another time.'] },
  benakis: { warm: ['Bravo!', 'Ah, wonderful!', 'Now that is a carpet!'], doubt: ['Po po po.', 'Ach, no.', 'My dear fellow.'], think: ['Let me see.', 'I see, I see.'], go: ['Ach, enough.', 'Never mind, never mind.'] },
  salem: { warm: ['Wallahi!', 'Ha! Good.', 'Mashallah.'], doubt: ['La.', 'Ha. No.', 'You joke with me?'], think: ['Oh?', 'Let me look.'], go: ['Yalla.', 'God keep you.'] },
  levy: { warm: ['Ah, bon.', 'Très bien.', 'Now, that is nice.'], doubt: ['Non, non.', 'Mon Dieu.', 'Is it?'], think: ['Alors...', 'Let me see.'], go: ['Tant pis.', 'Au revoir.'] },
  antonios: { warm: ['God be praised.', 'Ah, my son.', 'Blessed work.'], doubt: ['Truly?', 'My son, my son.', 'Ah, no.'], think: ['Let me look.', 'I see, I see.'], go: ['God be with you.', 'Peace, my son.'] },
  wasif: { warm: ['Excellent.', 'Ah, very good.', 'Now that is persuasive.'], doubt: ['Objection.', 'Come, come.', 'Ah, no.'], think: ['Let me consider.', 'Well...'], go: ['The case is closed.', 'Good day to you.'] },
  hollister: { warm: ['Well, now!', 'Say, that is fine.', 'Boy, oh boy.'], doubt: ['Aw, no.', 'Come on, now.', 'Is that so?'], think: ['Let me see here.', 'Well...'], go: ['I will pass.', 'So long.'] },
  martel: { warm: ['Ah, charmant.', 'Voilà.', 'Bon. Very good.'], doubt: ['Non.', 'Puh.', 'Mais non.'], think: ['Voyons...', 'Indeed?'], go: ['Dommage.', 'Adieu.'] },
  rustam: { warm: ['Bah, bah!', 'Ah, now you speak my language.', 'Good, my brother.'], doubt: ['No, no, my brother.', 'Ah, come.', 'You think so?'], think: ['Let me look at the knots.', 'I see, I see.'], go: ['Enough.', 'God keep you, brother.'] },
  // the courts
  fuad: { warm: ['Good.', 'Acceptable.', 'Yes.'], doubt: ['No.', 'I think not.', 'So you say.'], think: ['Let me look.', 'I see, I see.'], go: ['That will be all.', 'Good day.'] },
  nazli: { warm: ['Oh, très chic.', 'Lovely.', 'Ah, yes.'], doubt: ['Oh, no.', 'Ah, non.', 'Oh?'], think: ['Let me see.', 'I see, I see.'], go: ['Never mind.', 'Au revoir.'] },
  abdullah: { warm: ['Ah, a fine move.', 'Beautiful.', 'Yes.'], doubt: ['Ah, no.', 'A poor move.', 'Indeed?'], think: ['Let me think.', 'I see, I see.'], go: ['Checkmate, I fear.', 'Peace be with you.'] },
  faisal: { warm: ['Good.', 'Mashallah.', 'Yes, this.'], doubt: ['No.', 'Is it?', 'Not this.'], think: ['Let me look.', 'Patience.'], go: ['Enough.', 'God keep you.'] },
  ataturk: { warm: ['Good.', 'Yes. Correct.', 'Efendim, good.'], doubt: ['No.', 'Ah, no.', 'That is wrong.'], think: ['One moment.', 'Let me write it down.'], go: ['That is all.', 'Good day.'] },
  shivakiar: { warm: ['Oh, splendid.', 'Ah, yes.', 'That will do beautifully.'], doubt: ['Oh, no.', 'Truly?', 'Really?'], think: ['Let me picture it.', 'I see, I see.'], go: ['Thank you, no.', 'Another time.'] },
  // public men and women
  'saad-zaghloul': { warm: ['Good.', 'Ah, my son.', 'Yes.'], doubt: ['No.', 'Is that so?', 'Come now.'], think: ['Let me think.', 'I see, I see.'], go: ['Enough.', 'God be with you.'] },
  'safiya-zaghloul': { warm: ['Oh, lovely.', 'Ah, yes.', 'Mashallah.'], doubt: ['Oh, no.', 'Indeed?', 'Really?'], think: ['Let me see.', 'I see, I see.'], go: ['Thank you, no.', 'Go in peace.'] },
  'huda-shaarawi': { warm: ['Good.', 'Yes. Exactly.', 'Ah.'], doubt: ['No.', 'You think so?', 'Please.'], think: ['Let me consider.', 'Well...'], go: ['We are done.', 'Good day.'] },
  'taha-hussein': { warm: ['Ah, yes.', 'Good.', 'I can feel it.'], doubt: ['So you say.', 'No.', 'I think not.'], think: ['Let me feel the pile.', 'I see, I see.'], go: ['Enough.', 'Peace be with you.'] },
  'ahmed-shawqi': { warm: ['Ah! Poetry.', 'Beautiful.', 'Ya salaam.'], doubt: ['Ah, no.', 'Oh?', 'Prose, merely prose.'], think: ['Let me see.', 'I see, I see.'], go: ['Alas.', 'Go in peace.'] },
  'munira-al-mahdiyya': { warm: ['Ah! Divine!', 'Oh, yes!', 'Bravo!'], doubt: ['Oh, please.', 'Ugh, no.', 'Is it?'], think: ['Let me see it in the light.', 'I see, I see.'], go: ['Bah.', 'Ciao, darling.'] },
  'umm-kulthum': { warm: ['Oh, mashallah.', 'Ah, yes.', 'That is lovely.'], doubt: ['Truly?', 'Oh, no.', 'I do not think so.'], think: ['Let me look.', 'I see, I see.'], go: ['Thank you, no.', 'God keep you.'] },
  'mohamed-abdel-wahab': { warm: ['Ah, what a line.', 'Beautiful.', 'Yes!'], doubt: ['Is that so?', 'Ah, no.', 'Out of tune.'], think: ['Let me hear it.', 'I see, I see.'], go: ['Never mind.', 'Peace be with you.'] },
  'sami-al-shawwa': { warm: ['Bravo.', 'Ah, it sings.', 'Yes.'], doubt: ['Indeed?', 'No, no.', 'Flat.'], think: ['One moment.', 'I see, I see.'], go: ['Enough.', 'Go well.'] },
  'daoud-hosni': { warm: ['Ah, good.', 'Yes, my son.', 'Ya salaam.'], doubt: ['You think so?', 'No, my son.', 'Ah, no.'], think: ['Let me see.', 'I see, I see.'], go: ['Enough.', 'Peace be with you.'] },
  'youssef-wahbi': { warm: ['Magnificent!', 'Ha! Yes!', 'Bravo!'], doubt: ['Never!', 'Ha. No.', 'Please.'], think: ['Let me picture the stage.', 'So you say.'], go: ['Curtain.', 'Farewell!'] },
  'aziza-amir': { warm: ['Oh, divine.', 'Oh, yes.', 'Like a picture!'], doubt: ['Oh, no.', 'Oh?', 'Really?'], think: ['Let me see.', 'I see, I see.'], go: ['Never mind.', 'Bye-bye.'] },
  'rose-al-youssef': { warm: ['Ha! Good.', 'Yes!', 'Now that will get talked about.'], doubt: ['No.', 'Ha. Please.', 'Is it?'], think: ['Let me see.', 'Well...'], go: ['Enough.', 'Bye.'] },
  'fatma-rushdi': { warm: ['Oh! Yes!', 'Oh, I love it!', 'Ya salaam!'], doubt: ['Oh, no.', 'Ugh.', 'Truly?'], think: ['Wait, wait.', 'I see, I see.'], go: ['Never mind!', 'Bye!'] },
  'charles-corm': { warm: ['Ah, bon.', 'Formidable.', 'Yes.'], doubt: ['Non.', 'Is that so?', 'Ah, no.'], think: ['Voyons.', 'I see, I see.'], go: ['Tant pis.', 'Au revoir.'] },
  'ronald-storrs': { warm: ['Oh, splendid.', 'I say.', 'Rather good.'], doubt: ['Oh, I think not.', 'Indeed?', 'Come, come.'], think: ['Let me see.', 'Now then.'], go: ['I think not, thank you.', 'Good day.'] },
  'raghib-nashashibi': { warm: ['Good.', 'Ah, yes.', 'Very fine.'], doubt: ['No.', 'You think so?', 'Please.'], think: ['Let me see.', 'I see, I see.'], go: ['Enough.', 'God keep you.'] },
  'sassoon-eskell': { warm: ['Good. Correct.', 'Yes.', 'That is in order.'], doubt: ['No.', 'So you say.', 'That does not balance.'], think: ['Let me check.', 'One moment.'], go: ['That is all.', 'Good day.'] },
  'khalil-sakakini': { warm: ['Ah, good.', 'Yes. Sensible.', 'Good.'], doubt: ['Oh?', 'No, no.', 'Too much.'], think: ['Let me see.', 'I see, I see.'], go: ['Never mind.', 'Peace be with you.'] },
  'gertrude-bell': { warm: ['Oh, splendid.', 'Ah! Yes.', 'Now that is the real thing.'], doubt: ['Oh, really.', 'Is it?', 'Nonsense.'], think: ['Let me look.', 'Now then.'], go: ['No, thank you.', 'Good day.'] },
};

/** the word a mood asks for */
export const colourOf = (mood?: string): Colour | undefined =>
  mood === 'pleased' || mood === 'warm' ? 'warm' : mood === 'skeptical' ? 'doubt' : mood === 'neutral' ? 'think' : mood === 'leaving' ? 'go' : undefined;
