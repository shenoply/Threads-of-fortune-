# Threads of Fortune: cabaret art decisions and implementation corrections

Prepared 28 September 2026. This is an art specification and implementation handoff, based on the user's pasted Claude report and targeted read-only checks at commit `d865123`. The game repository has not been edited or deployed by this work.

## Final first-batch scope

Generate **22 images**: five venues with an empty interior, show interior, exterior and round-dialogue portrait, plus Nadia's standing buyer figure and one closed-door image. Full instructions are in `THREADS_OF_FORTUNE_CABARET_ART_PROMPTS.txt`; exact master/export paths and dependencies are in `ASSET_MANIFEST.json`.

| Venue ID | Venue | Fictional contact | Access decision | Art numbers |
| --- | --- | --- | --- | --- |
| `alhambra-cairo` | Alhambra Casino | Farid Nassar, bookings manager, 58 | Available at the 1925 start in Cairo; founding year remains unknown | 01–04 |
| `qamar` | The Qamar, original fictional venue | Nadia Wahba, proprietor and former singer, 42 | Available at the 1925 start in Cairo; investment follows the first-rug quest and economy gates | 05–09 |
| `sala-badia` | Sala Badia | Salma Farid, front-of-house coordinator, 31 | Locked until the game reaches 1926; show the closed-door card beforehand | 10–13, plus 22 |
| `sala-santi` | Sala Santi | Youssef Hanna, hall administrator, 62 | Available at the 1925 start in Cairo; music/concert hall | 14–17 |
| `maxim-istanbul` | Maxim | Kemal Arslan, bandleader and booking contact, 40 | Available when Istanbul's existing travel/progression requirements are met; label “Since 1921” | 18–21 |

These five people are original game characters. They do not replace or claim to portray real venue founders. The Qamar's name is a selected working game name, not a researched historical business identity or a cleared trade mark. Its supporting bar manager and doorman can remain dialogue references until the game actually needs their pictures.

Printania remains a historical street-map note while its 1925 operation is unresolved. Casino Opera stays in the later-chapter research backlog. Neither needs first-batch art. This is content scoping, not a claim that the engine cannot advance to 1940.

## Export and layout contract

| Asset | Final format and size | Handling |
| --- | --- | --- |
| Exterior and closed door | WebP, 1600 × 800, opaque | Keep the current 2:1 card. If a master is 3:2, centre-crop it to 2:1 before resizing. Preserve the uncropped master. |
| Interior and show | WebP, 1536 × 1024, opaque | 3:2 full-scene plates for a 1.5-second fade. No image subtraction. |
| Five dialogue portraits | JPEG, 512 × 512, opaque | CSS supplies the circle. A larger square master is preferred. |
| Nadia at the stall | WebP, approximately 655 × 983, true RGBA | Fit the full standing silhouette without stretching; preserve complete shoes, hair and hands. |

All assets use original PNG masters. The manifest's unique numbered download names prevent five different `interior.png` files becoming confused; its `masterPath` and `deployedPath` provide the final destinations. The art-src copies are source material, not files to preload in the deployed game.

**Mobile crop correction:** `.auction-bg` fills a viewport with `object-fit: cover`, so a fixed “middle 45%” rule is not sufficient. For a 3:2 source on a 390 × 844 portrait viewport, the visible horizontal fraction is `(390 / 844) / (3 / 2) = 0.308`, about **31%**. The prompts place the principal stage, leading performer and important rug detail within x = 35–65%. Wider desktops can instead lose image height. Use responsive positioning for portrait/action UI: the right-side painted desk is atmosphere, not the only way to talk to a contact. Check the final Cabaret container's actual aspect ratio during implementation; an even narrower display may need a bounded frame or adjusted object-position.

The source `.court-img` is 2:1; `.paper-pov` is a contained portrait 2:3 frame. The newspaper is therefore useful for painting finish, not landscape-room layout. [Source CSS](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/styles.css)

**Closed-door continuity:** image 22 edits the approved Sala Badia exterior, image 12. Apply the identical crop to both. Its facade and doorway should stay recognisable when the card unlocks. The game draws the padlock, opening-year label, title and button; none is painted into the source art.

**Reference caveat:** the existing Antonios file is RGBA but visually shows a torso at a carpet counter. It is a paint/lighting/alpha reference only. Nadia's requested standing figure is intentionally a full-body asset, so use the new image with the stall renderer's actual sizing/anchoring. Do not copy Antonios's crop, carpet counter, clothing or accessories into her asset.

## Calendar and performer decisions

The saved `day` remains the source of truth for date availability. The actual `dayOf` / `dateOfDay` functions confirm **day 298 = 1 January 1926**. Using that date for Sala Badia implements the requested year-based lock; it must not be written as the venue's verified historical opening day. A simple year threshold can remain derived state, rather than a separately saved unlocked flag. Enforce eligibility inside the action/store layer as well as on the card and street POI. [Date helpers](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/economy/life.ts)

The radio's `GAME_LAST` is 31 March 1926, but the store continues to advance days and `life.ts` includes later 1926 events. Casino Opera is deferred because this art chapter does not cover it and its identity/date still needs research. [Radio range](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/radio/bulletin.ts), [day rollover](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/state/store.ts)

Use historical names in sourced history captions and period news. Generic daily shows use fictional company members unless a dated programme supports a named performance. In particular, the July 1925 Sala Santi advertisement establishes an announced appearance by Umm Kulthum; it does not establish that she performed there every night from July onward. The existing real-performer portraits and buyer dialogue can be reused where the game's date/eligibility rules support them. The five new show paintings are anonymous repertory illustrations.

Sala Badia's 1926 show uses singing and acting. An expanded programme involving additional dancers belongs to 1927 onward and is outside this first art batch. [Sala Santi and Sala Badia research](https://www.gildedserpent.com/cms/2013/01/10/from-cafe-chantant-to-casino-opera/)

## Code corrections to incorporate before integration

### 1. Keep all money values in piastres

`src/game/economy/money.ts` states that stored amounts are piastres; the formatter divides by 100 for pounds. The pasted handoff mislabelled several raw values by a factor of 100.

| Raw stored amount | Correct display |
| ---: | ---: |
| 300 PT | £E3 |
| 1,200 PT | £E12 |
| 60,000 PT | £E600 |
| Proposed Qamar cost 2,500 PT | £E25 |
| Proposed weekly dividend 8 PT | £E0.08 |

For the first balancing pass, preserve the proposed **raw** Qamar values: 2,500 PT investment, reputation 25, first-rug quest completed, and 8 PT per week. These are game-balance choices, not researched historical venue prices. At 8 PT/week, the dividend alone takes about 312.5 weeks to repay the cost. Its main reward is the customer and furnishing-contract progression. Display all costs and rewards through the existing formatter. If £E8 per week is intended instead, that means 800 PT and a very different balance; do not silently make that conversion. [Money definitions](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/economy/money.ts), [existing upgrades](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/data/suppliers.ts)

### 2. Give visit dates and dividend state their own typed fields

`world.quests` is a `Record<string, 'active' | 'ready' | 'done'>`. It cannot correctly hold numeric last-visit dates. The Settlement task list also dereferences `QUESTS[qid].title` for entries, so arbitrary unregistered venue keys can break the screen.

Use a small typed venue state with, for example, per-venue `lastVisitDay`, queued buyer appointments and the last paid dividend period. Add backward-compatible defaults or an explicit save migration consistent with the store. Ordinary registered venue contracts can still use the existing quest status map. Do not promise that SAVE_VERSION must stay at 13 before reviewing how the new fields merge with old saves. Guard task rendering against unknown legacy quest IDs as appropriate. [Store types and migration](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/state/store.ts), [Settlement task rendering](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/components/World/Settlement.tsx)

### 3. Charge once, at the performance action

Selected flow: arrive and speak to the contact for free, then pay the shown ticket once when choosing “Take a table.” Do not charge the same visit at both Enter and Take a table. Validate city, opening date, available cash and the active performance/payment state in the store action, and make rapid repeated taps harmless. Leaving and returning should not create accidental duplicate charges for a still-active paid show.

### 4. Preserve tomorrow's customer appointment through rollover

The current daily rollover rebuilds the buyer queue. Merely pushing someone onto today's queue does not fulfil a promise that they will visit tomorrow. Save an appointment with a target day; merge eligible appointments into the newly generated queue at rollover; deduplicate and retain the venue context. Apply the existing real-buyer date and availability restrictions. The handoff's 40% encounter chance is a provisional balancing value. [Queue rebuilding and rollover](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/state/store.ts)

### 5. Make weekly income consistent across sleep, travel and reload

Route the Qamar payment through the shared day-advance/rollover logic used by sleeping and multi-day travel. Persist the last credited period or an equivalent stable accounting marker, so loading the same day cannot pay again and travel neither skips nor duplicates earned payments. Start entitlement from investment time rather than retroactively paying weeks before purchase. Keep the journal/ledger entry consistent with the actual credited amount. [Store rollover, travel and endDay](https://github.com/shenoply/Threads-of-fortune-/blob/d865123/src/game/state/store.ts)

## Focused implementation checks

These are checks for Claude after implementing the feature, not tests run on nonexistent venue code:

- Day 297 blocks Sala Badia from card, street POI and direct action; day 298 permits access. Save/load preserves the derived result.
- Existing city gates still apply to Maxim. A year alone cannot grant access to an unvisited/unlocked city.
- Old saves receive valid venue-state defaults and do not crash the task list.
- Talking is free; one show purchase deducts one ticket; double tapping does not double charge.
- A customer promised for tomorrow survives save/load and daily queue replacement.
- Qamar income is credited once per eligible period through sleep and multi-day travel.
- A 390 × 844 portrait view retains the stage/lead and reachable contact controls; a wide desktop keeps important vertical details.
- All deployed filenames match the manifest; Nadia's WebP retains true alpha; all five circle portraits are opaque JPEGs; the empty/show and closed/open pairs use matching crops.

## Historical sources retained

- [Raphael Cormack on Alhambra, Printania and Cairo's nightlife](https://apollo-magazine.com/roaring-twenties-cairo/)
- [Heather D. Ward on Sala Santi and Sala Badia](https://www.gildedserpent.com/cms/2013/01/10/from-cafe-chantant-to-casino-opera/)
- [Gökhan Akçura on Maxim](https://gokhanakcura.blogspot.com/2014/03/istanbulda-bir-siyah-rus-yllar-once.html)
- [Printania's 1925 newspaper research lead; context remains to be settled](https://pfe.cealex.org/diffusion/PFEWeb/pfe_013/PFE_013_082_w.pdf)
- [Later Badia/Casino Opera archival-advertisement research lead; full chronology remains unresolved](https://www.shira.net/about/ads-flyers/1940s-badia-and-beba.htm)
