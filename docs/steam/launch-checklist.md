# Steam launch checklist

From today (31 October 2026) to release. Valve's rules are quoted from Steamworks, checked on that date;
links at the foot. Where a figure is a rule of thumb rather than Valve's, it says so.

## 1. Steamworks account (week 1)

- [ ] Create the Steamworks partner account at partner.steamgames.com (legal name or company name; it shows as the developer/publisher only if you choose).
- [ ] Pay the **Steam Direct fee: US $100 per app**. Not refundable; it is paid back in the payout once the game has made **$1,000 adjusted gross revenue**. ([App fee](https://partner.steamgames.com/doc/gettingstarted/appfee))
- [ ] **The demo needs no fee**: it is a separate app ID created under the game's own, free. ([Demos](https://partner.steamgames.com/doc/store/application/demos))
- [ ] Identity verification.
- [ ] **Tax interview** (UK resident: W-8BEN for an individual, W-8BEN-E for a company; claims the US–UK treaty rate). Third-party verification **can take up to 30 days**; tax details cannot be changed while it runs. ([Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding))
- [ ] **Bank details**: the account holder's name must match the legal name entered at onboarding.
- [ ] Note the **21-day wait**: a new partner cannot release a game until 21 days after paying its app fee. ([Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding))
- [ ] Note the **app ID**, and put it in `STEAM_URL` in `src/game/demo.ts` (`https://store.steampowered.com/app/<id>/Threads_of_Fortune/`).

## 2. The store page ("Coming soon", as early as possible)

- [ ] Fill in the store page from `docs/steam/store-page.md`: short and long description, tags, languages, system requirements, the content survey, the AI disclosure.
- [ ] Upload the images from `docs/steam/capsule-art-brief.md` and the screenshots (`docs/steam/screenshots-plan.md`), and the trailer (`docs/steam/trailer-plan.md`) if ready; a trailer can follow later.
- [ ] Set the release date as a month or quarter ("Q3 2027"), not a day, until the date is sure.
- [ ] Submit the page for **review: 1–5 days**. ([Onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding))
- [ ] Publish it as **Coming soon**. Valve requires the page to be **public as "Coming soon" for at least two weeks** before release; in practice, aim for 4–6 months, since that is when wishlists are gathered.
- [ ] Put the Steam link in the game's title screen and on the demo's closing card (the `STEAM_URL` constant).

## 3. The demo (separate app)

- [ ] Create the demo app under the game in Steamworks.
- [ ] Build it: `npm run build:demo` writes `dist-demo/` (mode "demo"). Package it with the same desktop wrapper as the full game (see the PC layout / desktop app work).
- [ ] Save carry-over: the demo and the full game use the same save format and key, and the full build ignores the demo mark. With Steam, the two are separate apps, so local storage is not shared: use **Steam Cloud** with the same save file path in both apps, or point players to "Keep a copy of your save" on the closing card and load it in the full game (Settings → "Open a backup file"). Valve suggests the cloud route. ([Demos](https://partner.steamgames.com/doc/store/application/demos))
- [ ] Turn the tester tools off: they are off by default in a production build and on only with the tester's code, so leave as is.
- [ ] Demo store page: either just a "Download demo" button on the game's page, or its own page; its own page needs a trailer, at least five demo screenshots and capsules marked as a demo.
- [ ] Submit the demo build and page for review.
- [ ] After the demo is released, **re-publish the game's store page** so the "Download Demo" button appears.
- [ ] One wishlist e-mail can be sent to wishlisters **within two weeks of the demo's first release**. Time the demo's launch to a moment worth the e-mail (a Next Fest, a festival or a press piece).
- [ ] Disable achievements in the demo.

## 4. Steam Next Fest

A game may take part in **one** Next Fest only. The store page must be public and the demo publicly playable when the fest starts; the demo may not be content already on sale. ([Feb 2027](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027), [June 2027](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/june_2027))

| Edition | Dates | Register by | Fit |
|---|---|---|---|
| February 2027 | 22 Feb – 1 Mar 2027 (10:00 PST) | 10 Jan 2027 | Tight: page live and the desktop demo built by January. Only if both are ready. |
| **June 2027 (recommended)** | **14 – 21 Jun 2027** (10:00 PDT) | **25 Apr 2027** | Gives time for the PC layout, the art, the trailer and two months of wishlists before it. |

The eligibility list says the game must release after the fest ends, while a note on the same pages says upcoming games may take part whatever their date: plan release **after** the fest (e.g. September–October 2027) and ask Valve if that changes.

Before the fest: a livestream slot (optional, booked in the fest's registration), a demo update with fixes from earlier players, the trailer finished, press and creators told a fortnight ahead.

## 5. Release build and review

- [ ] Build: depots for Windows (required), macOS and Linux/SteamOS if the wrapper supports them.
- [ ] Steam Deck check: request the Deck compatibility review once the build is up.
- [ ] Complete the store and build release checklists in Steamworks; submit the build for **review (1–5 days)**.
- [ ] Release on a Tuesday–Thursday, not inside a big Steam sale or the week of a Next Fest.
- [ ] Credits screen: the CC BY sound credits from `public/audio/CREDITS.txt`.

## 6. Wishlists

Valve publishes no thresholds; these are rules of thumb from developers' public talks and post-mortems, for planning only:

| By | Target | Why |
|---|---|---|
| Next Fest start | 5,000 | The fest multiplies what is already there; under ~2,000 it tends to pass unnoticed. |
| Release day | 10,000–15,000 | Around this many wishlists is often said to put a game in front of Steam's "Popular upcoming" lists and launch-day recommendations. |
| Conversion | Expect 10–20% of wishlists to buy in the first year, most in the launch week and the first sales. |

Ways to gather them: the demo (the closing card asks once, at the end, never before), the Next Fest, short clips of the stall and the haggling on social channels, history and rug-collecting communities, and press.

## 7. Press and creators (types, not names)

Build the list yourself from people who have covered similar games recently; no mass mailing.

- **PC press, strategy and simulation desks**: sites with a strategy or management section; sim-game newsletters.
- **Indie game sites and newsletters** that feature upcoming demos (Next Fest round-ups especially).
- **YouTube and Twitch creators** who play trading, economy, management and historical games; smaller channels (5k–100k) answer far more often than large ones.
- **History creators** (YouTube, podcasts) who cover the Middle East, Egypt or the interwar years: the period setting is a story for them.
- **Rug and textile collectors' circles**: dealers' blogs, collectors' forums and Instagram accounts (the knot count and the fakes are their trade).
- **Arabic-language gaming press and creators** in Egypt and the Gulf, ahead of the Arabic translation.
- **Steam curators** who follow trading, economy and historical games (Steamworks lets you send keys to curators directly).

Send a short e-mail: one line on the game, the trailer link, the demo link, one GIF, a key (via Steam's key request tool or Keymailer-type services). Follow up once.

## 8. Price

- Base price: **US $14.99** (reasons in `store-page.md`).
- Launch discount: 10–15% for the first week (Steam allows a launch discount; check Steam's current discounting rules for the cool-down before the first seasonal sale).
- **Regional pricing**: start from Steam's own recommended prices for every currency (Steamworks pricing tool fills them from the US price). Check Egypt, Turkey, Saudi Arabia, the UAE, India and Brazil against local game prices; do not go below Valve's suggestion in markets where keys are resold.
- Keep the demo free and the full game a single purchase (no DLC at launch).

## 9. Refunds

Steam refunds any game on request within **14 days of purchase and under 2 hours of play**, for any reason ([Steam refunds](https://store.steampowered.com/steam_refunds/)). For a slow-starting game that matters: the first two hours must show the trade, the road and a story beat, which is what the demo covers. Players who played the demo already know what they are buying, and refund less.

## Sources (checked 31 October 2026)

- Steamworks, App fee: https://partner.steamgames.com/doc/gettingstarted/appfee
- Steamworks, Onboarding (21-day wait, two-week Coming soon, 1–5 day review, tax verification up to 30 days): https://partner.steamgames.com/doc/gettingstarted/onboarding
- Steamworks, Demos: https://partner.steamgames.com/doc/store/application/demos
- Steamworks, Next Fest February 2027: https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027
- Steamworks, Next Fest June 2027: https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/june_2027
- Steamworks, Store Graphical Assets: https://partner.steamgames.com/doc/store/assets
- Steam, Refunds: https://store.steampowered.com/steam_refunds/ (policy as generally published; not re-fetched for this checklist)
