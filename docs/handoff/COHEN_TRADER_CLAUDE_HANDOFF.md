# Cohen, textile wholesaler: summary of what was built

Source: `COHEN_TRADER_CLAUDE_HANDOFF.md` in the Drive folder "Threads of Fortune - Cohen trader".

- **Who he is:** Cohen, 43, a fictional Egyptian Jewish wholesaler born in Alexandria, with a modest Cairo office. His wife Miriam keeps the books. He buys corridor rugs for hotels and steamship lines. His identity is part of his life and calendar and never a bargaining modifier. There are no money tropes and no "difficult negotiator" framing. There was no earlier "Ezra" draft in the repo to replace.
- **Files:**
  - `src/data/cohen.ts`: buyer and dialogue
  - `src/game/systems/cohen.ts`: order rules, checks and visit schedule
  - `negotiation.ts`: his own action set instead of the haggle
- **Art:** `art-src/cohen/cohen-trader.png` becomes `public/art/portraits/cohen-stall2.webp` (the counter cutout, standard buyer scale, already facing the seller) and `cohen.jpg` (portrait).
- **When he comes:** from 3 total sales. Never on Saturday; the calendar was checked, day 1 is Tue 10 Mar 1925. With an open order he checks in; after a completed order about 6 days later, after a missed one about 10.
- **The order:** two medium rugs (170–240 cm long, at least 100 cm wide), hard-wearing wool, sound edges (Good or Excellent), colour that holds, and a matching pair (same colour family).
  - The due date is 7 days out; one that falls on a Saturday moves to Sunday.
  - The contract price is £3 per rug, fixed when you promise and paid exactly on delivery.
- **Colour:**
  - Arran's rub result is proof.
  - Without it, you can rub the colour yourself. That is less reliable: a colour that runs is caught about six times in ten, fixed per rug. If a rug you rubbed yourself runs, he says so on the next visit and his trust drops.
- **Choices at the stall:** ask the measurements, ask about the deadline, promise, decline (no penalty), check each rug (every failure has a plain reason), set one aside, show its match, hand over the pair, or "not ready yet".
- **Missed date:** at day's end the order closes as missed and his trust drops by 20. He returns later with a new order.
- **Side-task cue:** his open order and Arran's book errand show as one-line chips under the objective.
- **Lab live-play fix:** the activity text now describes what is on screen. The room painting shows an empty bench, and Arran is the portrait below.
- **Not built:** the "Cairo textile-contact lead" route to meeting him. He appears at the Giza stall after a few sales.
