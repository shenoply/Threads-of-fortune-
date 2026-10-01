# Malek — 1925 Giza shop, art and purchasable menu

Design handoff for Claude; no game code has been changed.

## Historical scope
A modest Egyptian charcoal meat-grill shop is the intended reconstruction. Galabeya, waistcoat, linen apron, charcoal brazier, metal skewers, wooden furniture, pottery and oil lamps. The images are plausible reconstructions, not a documented 1925 shop. Do not advertise exact historical certainty.

The core menu uses longstanding regional foods. Bastirma is a longstanding eastern Mediterranean dry-cured beef tradition and appears in Egyptian cuisine; exact availability in a particular 1925 Giza shop has not been established. Give Malek a Cairo supplier. The road parcel and three-serving pack are fictional packaging choices. Avoid claims that every modern Egyptian dish or preparation already existed in this form in 1925.

Prices, stat effects, opening hours and storage timers below are game-design values, not archival prices, medical effects or real food-safety guidance.

## Menu
Stats use illustrative 0–100 meters: satiety/energy/morale/hydration increase by the listed amount. If the game stores hunger or fatigue as deficits, subtract the corresponding amount instead. Use only existing meters or explicitly implement the new ones.

| Item | Price, piastres | Satiety | Energy | Morale | Hydration | Use |
|---|---:|---:|---:|---:|---:|---|
| Ful and flatbread / فول وعيش | 2 | +40 | +2 | +1 | +0 | eat_in; 1 serving(s) |
| Lentil soup and bread / شوربة عدس وعيش | 3 | +35 | +4 | +2 | +10 | eat_in; 1 serving(s) |
| Charcoal kofta plate / كفتة مشوية | 7 | +65 | +8 | +4 | +0 | eat_in; 1 serving(s) |
| Lamb kebab plate / كباب ضاني | 10 | +75 | +10 | +6 | +0 | eat_in; 1 serving(s) |
| Grilled liver and bread / كبدة مشوية وعيش | 5 | +50 | +6 | +3 | +0 | eat_in; 1 serving(s) |
| Beef and onion stew / لحمة بالبصل | 8 | +70 | +9 | +5 | +0 | eat_in; 1 serving(s) |
| Bastirma travel portion / بسطرمة للسفر | 6 | +30 | +2 | +1 | -8 | inventory; 1 serving(s) |
| Road parcel: bastirma and dry bread / زاد الطريق: بسطرمة وعيش ناشف | 9 | +50 | +3 | +2 | -8 | inventory; 1 serving(s) |
| Three-serving caravan parcel / زاد القافلة | 24 | +50 | +3 | +2 | -8 | inventory; 3 serving(s) |
| Small sweet tea / شاي | 1 | +0 | +2 | +1 | +8 | eat_in; 1 serving(s) |

## Purchase and balance rules
- Eat-in dishes: debit cash and apply effects once at consumption. Take 20 game minutes. Meals must not rewind the clock or interrupt an active journey.
- Travel parcels: debit cash and add inventory only. Each later Eat action consumes one serving, reduces weight and applies that serving’s effects once. Display servings, weight and game freshness.
- Cured portions have a seven-game-day freshness timer for balance; heat/weather can shorten it. Do not present this as a real-world storage guarantee. Fresh plated dishes are eat-in only.
- Clamp meters to their bounds. No hit-point healing, disease cure, attack bonus or instant repair of injuries.
- Meal morale is non-stacking: only the highest meal morale reward within four game hours. Tea energy reward once per four hours. No repeated purchase for infinite stats.
- Hunger relief always applies up to the cap. Show overflow so players understand what a full character gains.
- Ensure dry parcels cannot become an unlimited cheap resell loop. Refund/cancel leaves stock, money and inventory consistent.
- Water remains available separately. A dry-meat parcel does not cover the need for water.
- Fresh meat stock is finite; stew is one rotating daily special. Morning beans before 11:00, grill 11:00–20:00. One owner can plausibly run this short menu.

## Visit art
01-malek-grilling.png: daylight, at the left brazier.
02-malek-preparing-kofta.png: preparation bench, morning.
03-malek-serving.png: carries a plate between tables; lower camera viewpoint.
04-malek-closing.png: dusk, counts coins at a table; grill cold.
05-malek-owner-reference.png: close character likeness and clothing reference.

Choose an appropriate scene for time/status, avoid repeating last visit when another eligible scene exists. Keep room furniture fixed. Closing scene can offer travel parcels before the shop closes; no fresh grill orders with a cold grill.

These images support scene switching/parallax, not smooth 360-degree rotation. Images 1, 2 and 4 share the same basic angle, image 3 uses a lower viewpoint. A rotatable room still requires a model or reconstructed scene. Do not market these as a 3D asset.

## Malek dialogue
Kofta: “You want it cheaper? I can put the meat back on the sheep.”
Travel parcel: “It lasts longer than my patience. Take water.”
Sold out: “Ha. The sheep has finished its shift.”
Closing: “Coins again. Funny how they never breed overnight.”

## Source trail and limits
Edward William Lane, An Account of the Manners and Customs of the Modern Egyptians (nineteenth-century observations; background, not a 1925 restaurant menu): https://archive.org/details/accountofthemann031193mbp
Pastirma overview and bibliography (Egyptian usage and historical regional cured-meat tradition; not exact Giza dating): https://en.wikipedia.org/wiki/Pastirma
Anny Gaul, Rawi, Ask Abla Nazira: https://rawi-publishing.com/articles/ask-abla-nazira?lang=en — the famous cookbook first appeared in 1941 and must not be cited as direct 1925 evidence.
