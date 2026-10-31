// What the regulars tell you when they come back after a long while: their own news, in their own words,
// once each, in order. Buyers without a list of their own take one from the common pool.
// `note` is how the buyer's card keeps it.

export interface LifeNews {
  k: string;
  /** said at the counter */
  line: string;
  /** the same said by a woman, where it differs */
  she?: string;
  /** for the buyer's card */
  note: string;
}

export const LIFE_NEWS: Record<string, LifeNews[]> = {
  samira: [
    { k: 'son', line: 'You have not seen me for a while. My son was born in the winter. We have called him Adel, after my father-in-law, which has made peace in the house.', note: 'A son, Adel, born in the winter' },
    { k: 'moved', line: 'We have moved from Garden City to Zamalek. My husband says it is nearer the club. I say it is further from his mother.', note: 'Moved to Zamalek' },
    { k: 'widowed', line: 'My father-in-law died in the spring. The whole house is changed. My husband runs the family business now, and I run him.', note: 'Lost her father-in-law; her husband runs the firm' },
  ],
  yusuf: [
    { k: 'rooms', line: 'I have bought the house next door. Twenty-two rooms now, not fourteen. Twenty-two floors that want rugs, and one man who must pay for them.', note: 'Bought the house next door: 22 rooms now' },
    { k: 'married', line: 'My daughter is married, to a clerk at the Crédit Lyonnais. A good boy. He eats like three men and pays for nothing yet.', note: 'His daughter married a bank clerk' },
    { k: 'ill', line: 'I was in bed for six weeks with my chest. My nephew kept the ledger. I have been finding his mistakes ever since.', note: 'Six weeks ill with his chest' },
  ],
  mariam: [
    { k: 'baby', line: 'Karim and I have a little girl now. Hoda. She does not sleep, and so neither do we. The rug is where she crawls.', note: 'A daughter, Hoda' },
    { k: 'promoted', line: 'Karim has been made senior clerk at the telegraph office. Two pounds more a month. He walks differently now.', note: 'Karim made senior clerk' },
    { k: 'moved', line: 'We have three rooms now, in Heliopolis, near Karim\'s mother. The tram is very modern. The mother-in-law is not.', note: 'Moved to three rooms in Heliopolis' },
  ],
  hassan: [
    { k: 'grandson', line: 'My grandson was born, praise God. A boy, loud as a hawker. I gave every man in the coffee house his coffee free that night, and lost a pound.', note: 'A grandson born' },
    { k: 'radio', line: 'I have bought a wireless set for the coffee house. Now they come for the news from Cairo and the singing, and stay for three coffees instead of one.', note: 'Bought a wireless for the Nile Star' },
    { k: 'widowed', line: 'My wife died before the feast. Thirty-one years. The coffee house is full every night and I have never been so alone in it.', note: 'Lost his wife of thirty-one years' },
  ],
  whitcombe: [
    { k: 'engaged', line: 'I am engaged, if you can believe it. To an engineer with the Irrigation Service. My mother has written four letters about it and I have answered none.', she: 'I am engaged, if you can believe it. To an engineer with the Irrigation Service. My mother has written four letters about it and I have answered none.', note: 'Engaged to an irrigation engineer' },
    { k: 'school', line: 'The pasha\'s boys have gone to school in England. I have stayed, and opened a little school of my own in Zamalek. Eleven girls and a piano.', she: 'The pasha\'s boys have gone to school in England. I have stayed, and opened a little school of my own in Zamalek. Eleven girls and a piano.', note: 'Opened her own school in Zamalek' },
  ],
  salem: [
    { k: 'son', line: 'My eldest son brings the camels across now. I come to Cairo for the arguing only. I am better at it than he is.', note: 'His eldest son drives the camels now' },
    { k: 'drought', line: 'There was no rain in Sinai this winter. We lost forty head. I have come to sell what is left, and to buy a little comfort for my wife.', note: 'A dry winter: lost forty camels' },
  ],
  kasparian: [
    { k: 'married', line: 'I have married, at last. A widow from Aleppo, a teacher. She has rearranged my rooms and my patients are afraid of her.', note: 'Married a teacher from Aleppo' },
    { k: 'brother', line: 'A letter came from Aintab, from my brother. Ten years I thought he was dead. He is in Beirut, and he is coming here.', note: 'Found his brother alive, in Beirut' },
  ],
  levy: [
    { k: 'promoted', line: 'The store has made me head of the whole floor: carpets, curtains and linen. More money, and three men who think it should have been one of them.', she: 'The store has made me head of the whole floor: carpets, curtains and linen. More money, and three men who think it should have been one of them.', note: 'Made head of her floor at the store' },
    { k: 'paris', line: 'I was in Paris in the spring, at the decorators\' fair. They want Eastern rugs, but pale, pale, pale. As if the colour had been washed out of the world.', she: 'I was in Paris in the spring, at the decorators\' fair. They want Eastern rugs, but pale, pale, pale. As if the colour had been washed out of the world.', note: 'Went to Paris for the decorators\' fair' },
  ],
  antonios: [
    { k: 'roof', line: 'The church roof came down in the rain, part of it. The committee has the money for the beams and not for the carpets that were under them.', note: 'Part of the church roof fell in the rain' },
    { k: 'deacon', line: 'My grandson has been made a deacon. He sings better than I ever did. I do not tell him so.', note: 'His grandson made a deacon' },
  ],
  benakis: [
    { k: 'married', line: 'I have married again. She is from Smyrna, and half my age, and she has opinions about carpets. God help us both.', note: 'Married again, a wife from Smyrna' },
    { k: 'loss', line: 'Cotton has been bad to me this year. Not ruin, but I have sold the horses. The villa stays. The box at the races stays. Some things a man keeps.', note: 'A bad cotton year: sold his horses' },
  ],
  wasif: [
    { k: 'deputy', line: 'I have been elected to the Chamber, for a district in Assiut. Now everyone I have ever met wants a favour, and my own wife wants a new salon.', note: 'Elected a deputy for Assiut' },
    { k: 'son', line: 'My son has passed his examinations and goes to Paris to read law, as I did. I have told him to work. He will not.', note: 'His son gone to Paris to read law' },
  ],
  martel: [
    { k: 'posted', line: 'I am posted to Peking in the autumn. The far end of the world. I want something from this end of it to take with me.', note: 'Posted to Peking' },
    { k: 'married', line: 'I am to be married in Paris. My fiancée has seen the photographs of my rooms in Beirut and has asked, politely, that the carpets be improved.', note: 'To be married in Paris' },
  ],
  rustam: [
    { k: 'son', line: 'My son runs the Baghdad warehouse now. He writes every week to tell me what I am doing wrong.', note: 'His son runs the Baghdad warehouse' },
    { k: 'paris', line: 'I have opened a room in Paris, in the rue de Châteaudun. Four carpets and a French clerk. The French buy slowly and pay late.', note: 'Opened a room in Paris' },
  ],
  hollister: [
    { k: 'museum', line: 'I have promised my collection to the museum in Cleveland, when I am gone. So now I buy for posterity, and posterity is very particular.', note: 'Left his collection to a museum in Cleveland' },
    { k: 'widowed', line: 'Mrs Hollister passed away in the summer, at home in Ohio. She never liked the East. I find I cannot stay away from it.', note: 'Lost his wife in the summer' },
  ],
};

/** for anyone without a list of their own */
export const LIFE_ANY: (LifeNews & { she?: string })[] = [
  { k: 'married', line: 'I was married since we last met. A quiet wedding, and a loud family.', she: 'I was married since we last met. A quiet wedding, and a loud family.', note: 'Married since you last met' },
  { k: 'moved', line: 'I have moved house, to Heliopolis. Bigger rooms, longer tram.', she: 'I have moved house, to Heliopolis. Bigger rooms, longer tram.', note: 'Moved to Heliopolis' },
  { k: 'promoted', line: 'I have been promoted. More money, more work, and less time to come here.', she: 'I have been promoted. More money, more work, and less time to come here.', note: 'Promoted' },
  { k: 'widowed', line: 'My wife died in the winter. I am furnishing the house again because I cannot sit in it as it is.', she: 'My husband died in the winter. I am furnishing the house again because I cannot sit in it as it is.', note: 'Widowed in the winter' },
  { k: 'child', line: 'We have a son since I was here last. Everything in the house is now about him.', she: 'We have a son since I was here last. Everything in the house is now about him.', note: 'A son born' },
];
