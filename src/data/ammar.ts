// Ammar: the childhood friend who comes back from Rome with money, a gold tooth, and an offer.
// A story character, not yet wired into gameplay — written so his lines can be recorded now and
// the investment/honour system built against them later. See tools/export-voice-script.ts.
//
// The arc: he comes back rich and offers capital to expand the business (shops, not just a
// stall). Taking it is the fast road; it also pulls you into his increasingly crooked practices,
// tracked by an honour stat (good/bad, like a Red Dead-style meter) the player steers by how they
// handle each of his asks. Two bad endings are possible down that road — you both get complacent
// and it quietly dies (bad honour), or he cuts you out with a lawyer and a signature you didn't
// read closely enough (also bad honour, more actively his doing) — and both end in bankruptcy.
// Decline the capital, or push back hard enough on the arc, and he prospers without you while you
// stay small and honest. Either way the story can end in bankruptcy; what differs after that is
// the road back — a good honour score gives you a real revenge/comeback arc, a bad one makes the
// climb back much harder, with fewer people willing to stand behind you.

export const AMMAR = {
  // ---------------- he turns up again, after years away ----------------
  reunion: [
    "Ya salam! Look at you — still in Giza, still smelling of wool. I'd know that frown anywhere, habibi.",
    "Ten years in Rome and the first ugly face I see coming home is yours. God has a sense of humour.",
    "They told me you had a stall now. A stall! I remember when you couldn't sell your own shoes.",
    "Don't look at the tooth. Everyone looks at the tooth. Yes, it's real gold. No, I won't tell you what it cost.",
    "I came back smelling of good coffee and better money, and the first thing I do is come find you. That's loyalty, habibi.",
    "You haven't changed. Still counting piastres like they're going to run away from you.",
  ],
  // small talk / catching up, a few visits before the pitch
  catchUp: [
    "Rome teaches you two things: how to dress, and how to spot a man who's about to be poor. You, my friend, are about to be poor.",
    "I didn't come back to sit in cafés and talk about the old days, ya basha. I came back because I saw an opportunity, and it has your face on it.",
    "You run this like your father did. That's sweet. It's also why you'll die with a stall and I'll die with a company.",
    "How much does this little operation of yours actually clear in a month? Go on, say the number. I'll try not to laugh.",
  ],

  // ---------------- the pitch: tempting, specific, repeated with more sweetening ----------------
  pitch: [
    "I have capital sitting idle, habibi, and you have a name people already trust. Put the two together and we stop selling rugs out of a cart and start owning shops.",
    "Think bigger than a stall. A real shopfront in the Khan. Then another in Alexandria. I bring the money, you bring the eye — you've always had the eye.",
    "This isn't charity. I want a share, of course I want a share. But I'd rather own half of something enormous than all of something small, and so should you.",
    "Say yes and in a year you're not a rug-seller, you're a merchant house. People will say your father's name and mean something different by it.",
    "I'm not asking you to trust Rome, or trust money, or trust luck. I'm asking you to trust me. We grew up on the same street.",
  ],
  pitchPress: [
    "You're thinking too long. Men who think this long die with a stall.",
    "Fine — I'll sweeten it. First shop's lease, I cover entirely. You keep every piastre of profit until it's paid back. Now what's the hesitation?",
    "Is it the tooth? It's the tooth, isn't it. Habibi, a gold tooth doesn't make a man a crook. It makes him a man who can afford dentistry.",
    "Every great house in this city started with somebody's uncle saying yes when his instinct said wait. Don't be the instinct, habibi. Be the uncle.",
    "Last offer, and I mean it kindly: take the money, open the first shop, and if in six months you hate what we've built, I'll buy you out myself. What do you lose?",
  ],

  // player accepts the capital
  accept: [
    "Now you're talking like a man with a future! Come, come — we'll drink to it properly, not with that tea you serve customers.",
    "Smart. I knew you had it in you somewhere under all that honesty.",
    "Good. Tomorrow we find you a shopfront. Today, we celebrate — and you're not paying, for once in your life.",
  ],
  // player declines, or stays cautious
  decline: [
    "Your choice. Stay small, stay proud, stay exactly where your father left you. I'll check in on you from my new office.",
    "I won't ask twice. Men who hesitate this hard usually mean no, they just can't say it to my face.",
    "Suit yourself. Just don't come to me in five years asking how I did it. You had the same chance.",
    "Honestly? I respect it. Doesn't mean I think it's smart. But I respect it.",
  ],

  // ---------------- accepted: early flourishing, before anything turns ----------------
  flourishEarly: [
    "Look at that signage! Your name, in gold, over an actual door. Tell me that doesn't feel better than a cart.",
    "Three weeks and we've already turned a profit the stall never saw in a season. I told you, habibi. I told you.",
    "Alexandria wants a shop too, now that word's got out. We are, officially, no longer small.",
    "People who used to haggle you down to nothing now ask for an appointment. That's what money does. It buys you manners.",
  ],

  // ---------------- the honour choices: each ask a little more crooked than the last ----------------
  corruptPitch1: [
    "Small thing. The customs man at the port wants a little something to not look too closely at a shipment. Everyone does it, habibi. It's not stealing, it's a toll.",
    "We could list these as 'antique, provenance unclear' and the import duty drops by half. Nobody checks. Nobody's ever checked.",
  ],
  corruptPitch2: [
    "A supplier's offering us his whole stock under the market price — because it isn't exactly his to sell. I didn't ask questions. You shouldn't either.",
    "We tell the Alexandria buyers it's Isfahan silk. It's good wool and a good dye job. They'll never know, and they'll pay triple.",
  ],
  corruptPitch3: [
    "I need your signature on something today, not next week. Don't read all of it, ya basha, just trust me — we're behind schedule and lawyers bill by the hour.",
    "The old partnership paper's outdated anyway. New one, same terms, mostly. Sign where I've marked it and let's stop wasting the morning on paperwork.",
  ],
  // his reaction when the player pushes back / chooses the honest road at any of the above
  honourPushback: [
    "Suit yourself, saint. I'll find another way. I always do.",
    "You and your principles. Fine. We'll make less money and you'll sleep better. Congratulations.",
    "One day that conscience of yours is going to cost us both everything. Remember I said that.",
    "Noted. I won't ask you again — I'll just stop telling you how the sausage is made.",
  ],
  // his reaction when the player goes along with it
  honourGoAlong: [
    "That's the man I need. Welcome to how business actually works.",
    "See? Painless. Nobody got hurt, and we're both richer for it.",
    "Good man. Keep doing what I tell you and that gold tooth of mine will have company in your own mouth someday.",
  ],

  // ---------------- if the player stayed honest / declined the capital: he prospers without you ----------------
  rivalFlourish: [
    "Habibi! Still at the stall, I see. I passed it on my way to my fourth shop. Charming, in its way.",
    "I'd offer you a job, but I don't think your pride could take it. No hard feelings — some men are built for small and honest.",
    "You were right about one thing, actually — I did get a little rich doing it my way. You were wrong about everything else.",
    "Come by the new place sometime. I'll have someone let you in the back, so the customers don't see the competition looking so... modest.",
  ],

  // ---------------- bad ending A: complacency, the partnership quietly dies, honour was already low ----------------
  fadeOut: [
    "When did we last actually talk business? I can't remember. I think we just... stopped.",
    "The books haven't been opened in a month. Neither of us wants to be the one who looks first.",
    "I used to come by every week. Now I send a boy with a note. That's not a partnership, that's a funeral nobody's announced yet.",
    "I'm not angry. I'm just tired. Tired men don't save failing shops, habibi, they let them close quietly and call it rest.",
  ],

  // ---------------- bad ending B: he backstabs with the paperwork ----------------
  backstabReveal: [
    "You should have read page four, habibi. It's all there, in very legal, very boring language. The shops were never really half yours.",
    "I'm not a monster. I'm a man who protected himself, which is more than you ever did for yourself.",
    "Don't look at me like that. You signed it. I didn't forge your hand, I just didn't underline the part that mattered.",
    "This isn't personal. It's paper. Paper doesn't remember we grew up on the same street — I'm not sure I do either, today.",
  ],
  backstabKickOut: [
    "The lease is in my name. The stock's in my name. As of this morning, so is the goodwill you built. I'd clear your desk, but there isn't one — you never had one, if you check the paper.",
    "Take your cart. It's the one thing in that building that was ever actually yours.",
    "I'll send a reference, if you want one. 'Honest, hardworking, and terrible with lawyers.' That should open doors.",
  ],

  // ---------------- bankruptcy, both roads lead here one way or another ----------------
  bankruptcy: [
    "Bankrupt. I never thought I'd see that word next to your name. I'm not sure if I feel sorry or vindicated.",
    "Everyone's heard by now. The Khan talks fast when a man falls, almost as fast as when he rises.",
    "Whatever happens next isn't my problem anymore. I did warn you, in my way, more than once.",
  ],

  // ---------------- the road back: lines he speaks depending on how the player's honour stands ----------------
  revengeGoodHonour: [
    "You're rebuilding? With that reputation of yours still clean, people are actually lining up to help you. I'll admit, I didn't see that coming.",
    "Half the Khan would rather lend to the honest man who lost everything than the rich one who stole it. I made that bed. Now I'm lying in it.",
    "You want to come at me properly? Fine. Do it. At least I'll know I'm losing to a better man.",
  ],
  revengeBadHonour: [
    "Rebuilding, are you? With your name? Habibi, I'm not the only one who remembers what you did to get here.",
    "Nobody's lining up to help the man who cut the same corners I did. That's the trouble with this road — it only forgives you once, and you already spent it.",
    "You want revenge? Get in line behind everyone else you burned on the way up. I'm not even near the front of it.",
  ],
  // if the player claws their way back and finally confronts him
  finalConfrontGoodHonour: [
    "Look at you. Clean hands and a full ledger. I genuinely didn't think you had it in you, habibi. I mean that as a compliment, for once.",
    "Fine. You win this one honestly, which is more than I can say for myself. Take what you came for.",
  ],
  finalConfrontBadHonour: [
    "So we're the same now, you and I. Funny — I always thought you'd be the one left standing on principle. Guess not.",
    "Don't lecture me. You signed the same shortcuts I did. We just got caught at different times.",
  ],
};

/** the honour meter's own flavour text, independent of any one speaker — for the narrator/UI */
export const HONOUR_LABEL: Record<'high' | 'mid' | 'low', string> = {
  high: 'Your name is still good in the Khan. Doors open before you knock.',
  mid: 'People trust you carefully. Fair, but not warmly.',
  low: 'Your name opens fewer doors than it used to. Some close on sight.',
};
