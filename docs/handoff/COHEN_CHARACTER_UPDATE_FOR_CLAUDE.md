# Cohen — updated character and artwork

This update supersedes conflicting appearance and personality details in COHEN_TRADER_CLAUDE_HANDOFF.md. Keep the existing stable NPC ID `cohen`; do not create a duplicate customer. Inspect the current game schema before implementing. This is a handoff, not an applied game patch.

## Selected artwork

Use `cohen-trader-v2-full-body.png`, the latest approved full-body portrait. Retain the original image as an archive. This PNG has an opaque warm background, not transparency: use it in a framed character card, or obtain a clean transparent cutout before placing him directly over the stall scene. Do not assume the previous handoff's RGBA/transparent description applies.

Appearance: short, stocky middle-aged man, softer and less prominent jaw, visibly curled sidelocks on both sides, small dark head covering, short moustache and light stubble. Cream linen three-piece suit, patterned tie, pocket square, brown leather shoes and leather notebook. Keep his original fictional face consistent in later art. The visual direction is only loosely inspired by a dry comic manner; do not use Adam Sandler's name, likeness or voice in game content or promotion. No legal clearance is implied by this redesign. The selected portrait keeps naturally proportioned facial features.

His short stature must be reflected in scene scaling relative to other adults; do not shrink only his head or distort the image. Full body does not mean every screen must show his feet: preserve aspect ratio and show full elbows in the normal stall conversation framing. Use the game's base-URL-aware asset helper for GitHub Pages hosting.

## Character changes

- Very wealthy: successful wholesale business, capacity for larger repeat orders. Wealth changes purchasing capacity, not willingness to overpay.
- Always seeks profit: calculates purchase cost, transport, defects and resale margin. Declines deals that do not meet his business target.
- Personally dislikes the seller: cool, curt, sceptical, rarely complimentary. This is a personal commercial rivalry, not a trait derived from religion or ethnicity.
- Preserve his established Egyptian Jewish background, family and languages where compatible. His identity and appearance do not modify bargaining stats.

Give the rivalry a concrete fictional reason: he believes the seller previously undercut him on a hotel contract. Treat this as Cohen's belief until the story establishes the facts. Good delivery can build professional trust even when he remains personally unfriendly.

## Negotiation behaviour

Use existing budget, demand and relationship mechanics. Larger orders require consistent dimensions, resilient wool, matching colours and deadlines. Offer modest bulk terms only when the player receives a worthwhile total margin. He checks Arran's findings when available. Do not invent random forgery verdicts or duplicate examination fees. His opening offers can be firm and low, but must remain compatible with the game's fair pricing and progression. A personal grudge may reduce patience; meeting contracts restores trust gradually. Do not make every visit an unwinnable refusal.

## English dialogue

Arrival: “I don't have to like you. The numbers have to work.”
Inspection: “Two rugs. Same dimensions, same colour. Can you manage that?”
Price: “At that price, you earn twice and I earn nothing. Try again.”
Bulk offer: “A single sale is pleasant. A repeat order is a business.”
Accepted: “We have an agreement. Don't mistake it for friendship.”
Returning after good delivery: “The order arrived on time. That is why I am back.”
Declining: “The margin is too thin. I'll leave it.”

## Integration checks

Preserve saves, customer ID, existing contracts and compatible earlier dialogue. Do not change global reputation just because Cohen dislikes the player. Persist relationship updates through the existing store. Confirm the new asset loads on desktop and phone, neither elbows nor face are unintentionally cropped, portrait background treatment is deliberate, and bulk transactions do not duplicate cash or inventory. Run relevant existing build/checks before publishing. No live game change has been made by this handoff.
