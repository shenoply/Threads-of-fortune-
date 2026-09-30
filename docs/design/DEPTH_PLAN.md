# More depth: design plan

This plan was written after an audit of the current systems (30 Sep 2026). It is split into stages, and each stage is playable on its own.

## Where the game stands

- **Start.** Cash is £1.20, reputation 0, Rashid's trust 20 and the father's debt £100. Reputation rises 1–5 with every sale, so the early game is gentle.
- **Money failure.** There is no bankruptcy. Cash may go negative, and the only consequence is a note. A monthly bill paid late costs 10% more and −3 reputation; after 15 days you lose your top pitch upgrade. A missed instalment on the father's debt costs Rashid's trust.
- **Calendar.** Events already change buyer budgets, city bids and prices, demand, closed markets and checkpoints. They are mild and short, and the daily news is flavour only.
- **Hero.** He has no age in the game state; only the art prompt says "about 45". He has 8 skills and 4 manner axes.
- **People.** Buyers keep a relationship record, and NPCs have fixed dialogue trees. There is no partner, spouse, family, insurance, loan or bank system.
- **Saves.** The format is at `SAVE_VERSION` 13, migrated with `if (version < N)` blocks. New state can be added safely.

## Stage 1: a hard start and real ruin (money)

1. **A harder climb.** Reputation per sale is +1, or +2 for a Fine rug that fits the buyer well. It falls faster for embellishing, lowballing and walk-outs. Titles and buyer unlocks keep their thresholds, so they take longer to reach. The early buyers haggle harder.
2. **Bankruptcy, Bannerlord style: gradual and recoverable, never a sudden "Game Over".**
   - Your standing is net worth (cash, stock and animals) minus debts.
   - When debts go past a threshold, you get warnings, then creditors come to the stall, then the court.
   - **Declared bankrupt:** the stall's upgrades and all but three rugs are seized, reputation falls to half, and Rashid's credit stops. Your father's name is shamed, and a new story mission, "Starting over", begins.
   - A second bankruptcy ends the run with a closing newspaper page. It is a real ending, with the option to begin again.
3. **Loans.** Real 1925 lenders: a Greek moneylender in the Khan (quick but steep), the Banque Misr (opened 1920; needs reputation and collateral), and Rashid's credit as it is now. Missed repayments feed the bankruptcy track.
4. **Insurance for cargo on the road and at sea.** Lloyd's agents in Alexandria and Port Said, and a Cairo broker.
   - You pay a premium per journey, based on what you carry and how risky the route is.
   - If raiders, thieves or a storm take goods, the insurer pays about 70%. The claim is paid in the next port town, not on the spot.
   - Fraud (claiming goods you never had) is possible and risky. If you're caught, your reputation collapses and you're blacklisted.

## Stage 2: partnerships and scams (story)

- As your rank rises, people approach you with offers: a caravan share, a Beirut agent, a hotel supply contract, a "Persian lot at half price", or an investor for a second stall.
- **Each offer has a hidden honesty value.** You can find clues by asking around: the coffee house, Abu Hamid, a letter to a contact. Clues cost time and money.
- **Honest partners** pay a share every month, and some grow into long-term income.
- **Scams** vary: the partner vanishes with your stake, the goods are fake, the contract says something else, or a shell company collapses.
- A scam can leave you a thread to follow ("recover your money" missions), which is a way back from ruin.
- The existing Qamar share becomes the first partnership in this system.

## Stage 3: calendar events with weight

- A few historical events per year that change the game for weeks, each announced ahead on the calendar and in the paper so you can prepare:
  - the 1926 cotton price collapse (buyers' budgets fall)
  - the Syrian revolt (the road to Damascus closes and its prices spike)
  - Ramadan (fewer customers by day, a busy market at night)
  - the Hajj season (pilgrim buyers, and the Suez route full)
  - cholera quarantine (a port closes)
  - the new tariffs (Rashid's prices rise)
  - the 1927 Alexandria exhibition (Fine rugs in demand)
- Events with a choice: stock up before the revolt, or take the risk.

## Stage 4: marriage, children and aging (family)

- **Age.** The hero is 45 in March 1925 and has a birthday each year. Every 5 years (at 50, 55, 60 and so on) his body art moves to an older version.
- **Marriage, adapted from Bannerlord.** Courting a few candidates met through the story, with suitability depending on reputation, rank and manner. There is a dowry or bride price, and a wedding event. A wife brings a skill: bookkeeping lowers bills, languages help with foreign buyers, a family network opens a city.
- **Children.**
  - They are born with the years and age with the calendar: child, youth, adult.
  - You shape their character with choices at ages 6, 12 and 16: school or the stall, which city to apprentice in, and which manner axis to encourage.
  - As adults they can run the stall while you travel, lead a caravan, or keep a branch in another city.
  - They can marry and move away, or quarrel with you if neglected.
- **Aging.** The wife and children also have art for each 5-year age band.
- **Time scale.** At the current pace a game year is about 365 in-game days, so most players would never see 5 years pass. The fix is a "years pass" jump between chapters, like Bannerlord's quick seasons: after a major mission you can close the shop for the season or skip ahead a year, with a summary of what happened. Without it, aging would rarely be seen.
- **Art.**
  - hero base at ages 50, 55, 60 and 65 (4 images)
  - wife at 3 age bands × 2–3 candidates (6–9 images)
  - children as infant, child, youth and adult × boy and girl (8 images)
  - The prompts will be written like the travel batch, as edits of the existing hero base so the wardrobe layers still fit.

## Suggested order

Stage 1 first. It makes every other system matter, because partnerships, events and family all feed money and reputation. Then Stage 2, Stage 3, and Stage 4 last: it needs the art and the time-skip.
