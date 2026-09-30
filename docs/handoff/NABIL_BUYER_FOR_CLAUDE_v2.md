# Threads of Fortune — Nabil al-Khatib, wealthy rug merchant (handoff v2, summary)

The full handoff is `NABIL_BUYER_FOR_CLAUDE_v2.md` in the Drive folder "Threads of Fortune - Nabil buyer". This summary records what was implemented.

- **Art:** use `nabil-al-khatib-v2.png` only; the first `nabil-al-khatib.png` is an archived draft.
  - Source: `art-src/nabil/nabil-al-khatib-v2.png`.
  - Counter cutout: `public/art/portraits/nabil-stall2.webp`. It is mirrored so he faces the seller, with his feet on the shared floor line and the whole figure scaled to 0.86.
  - Framed portrait: `public/art/portraits/nabil.jpg`.
  - The first visit shows a full-figure arrival card.
- **Character:** an adult merchant of short stature and one of Cairo's wealthiest textile buyers. He is hard to deal with because he knows the stock and can walk away, never because of his stature. In player-facing text he is "Nabil" or "the merchant".
- **Data:** `src/data/nabil.ts` holds his buyer definition and dialogue. `src/game/systems/nabil.ts` holds the assessment, memory, scheduling and package rules.
- **His rules in the haggle** (`negotiation.ts`):
  - **Ceiling:** set by value, rarity, condition and evidence. A hidden repair cuts it to 0.78; a disclosed one raises it to 1.03.
  - **First inspection:** he raises repairs, thin history and wear straight away.
  - **Honest answer:** raises his trust.
  - **Bluffs:** "facts" instead of an answer, a repeated pitch, or a price moved by less than 3% each count as one. The third makes him leave.
  - **Counter-offers:** every one comes with a stated reason.
  - **Two-rug package:** offered once he trusts you.
- **Memory** (`GameState.nabil`, keyed by uid + condition + repair):
  - trust, visits, rugs he turned down and faults you disclosed
  - whether he left annoyed: he returns after about 4 days, or 9 after bluffing
  - he comes only once your reputation is 12 or more
