# Battle Art: ChatGPT Prompts

Art for the top-down battles. **35 images:** 10 battlefields, 11 of your men, 10 enemies, 2 animals, 2 fallen men.

## Why each rule matters (so the battles look smooth)
- **Straight down from above, never at an angle.** If one token is drawn at an angle and the next from above, the battle looks like a collage. The battlefield and every token must share the same bird's-eye view.
- **Same scale.** A man on the battlefield map is about 30 px across. Tokens are drawn big (1024 px) and I shrink them, so their detail stays sharp. They must all be drawn at the scale each prompt says, so a guard isn't bigger than a veteran.
- **Everyone faces the top edge.** I rotate each token in the game to face where it's walking. It only works if they all start facing the same way.
- **No shadows, rings or team colours painted in.** I add the shadow, the selection ring and the team colour (blue for you, red for the enemy) in the game, so they match exactly and can change.
- **Battlefields without people, animals or the caravan.** Those are all tokens that move.

## How to do it
1. **One ChatGPT chat for all the tokens (Parts 2 to 5).** Make the **guard** first. When you like it, attach it to every token prompt after that and add at the top: *"Match the attached token exactly: same view, same scale, same painting style."* That keeps all 25 tokens looking like one set.
2. **A second chat for the 4 battlefields (Part 1).** Attach `art/stall-seller.jpg` for the painting style.
3. Send everything back here. Backgrounds, sizes and cutting out are done on my side.

Things I make in the game, not with ChatGPT: rifle flashes, dust, smoke, the selection rings and arrows, the morale flags, and the sounds.

---

# Part 1: Battlefields
*Portrait, because the game is played holding the phone upright. Your caravan starts in the lower middle, and the enemy comes from the top or the sides.*

### Desert road → `public/art/battle/battle-road.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: a dusty caravan road running from the bottom edge to the top edge through flat gravel desert, with a shallow dry ditch along one side, a few low thorn bushes, scattered stones, and one ruined mud-brick wall section near the left edge that could give cover.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half open and flat: that is where the caravan stops. Leave clear open ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, dune crests, palms) clearly different from open ground.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Sand dunes → `public/art/battle/battle-dunes.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: rolling sand dunes crossed by a faint caravan track; two large dunes with sharp crests (one on the left, one upper right) that soldiers could hide behind, low hollows between them, wind ripples in the sand.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half open and flat: that is where the caravan stops. Leave clear open ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, dune crests, palms) clearly different from open ground.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Oasis → `public/art/battle/battle-oasis.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: a small desert oasis: a round well with a stone rim near the centre, a cluster of date palms and their shadows on one side, a low mud-brick wall around a patch of green, the caravan track passing beside it, open sand around.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half open and flat: that is where the caravan stops. Leave clear open ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, dune crests, palms) clearly different from open ground.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Rocky pass → `public/art/battle/battle-pass.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: a narrow rocky pass: steep boulder-strewn rock on the left and right edges, a stony track winding up the middle, a few large boulders in the open that give cover, a dry stream bed crossing the track.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half open and flat: that is where the caravan stops. Leave clear open ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, dune crests, palms) clearly different from open ground.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

## Part 1b: More battlefields (the rest of the map)

### Nile farmland and canal → `public/art/battle/battle-nile.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: flat green Egyptian farmland beside the Nile: a straight irrigation canal crossing from left to right with a narrow mud-brick footbridge, fields of sugar cane (tall, gives cover) and low cotton, a raised earth dyke track, a grove of date palms in one corner, the edge of a mud-brick village with two houses at the top edge.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### River ford → `public/art/battle/battle-ford.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: a slow, muddy river (like the Jordan or the Euphrates) crossing the map from left to right, about a fifth of the map wide, with a shallow sandy ford in the middle where the track crosses, thick reeds and tamarisk bushes along both banks (good cover), a few flat rocks in the water, open ground on both sides.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Olive hills → `public/art/battle/battle-hills.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: rocky Judean hills: a road climbing through a narrow valley from the bottom edge to the top edge, dry-stone terrace walls stepping up the slopes on both sides with old olive trees on them (walls and trees give cover), a stone shepherd's hut, white limestone outcrops.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Basalt plateau → `public/art/battle/battle-basalt.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: the black basalt plateau of the Hawran: dark volcanic boulders scattered across dry yellow grass, the tumbled black-stone walls of a ruined village (good cover), a low rise on one side, a track of pale dust running through the middle.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Desert ruins → `public/art/battle/battle-ruins.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: an ancient ruined city in the Syrian desert like Palmyra: a line of broken Roman columns along an old colonnaded street, fallen column drums and blocks lying in the sand (good cover), the foundations of a small temple, open desert around, a caravan track passing the ruins.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

### Mountain pass → `public/art/battle/battle-mountain.jpg`
```
A top-down battlefield map for a strategy game, seen straight down from directly overhead (bird's-eye view, like a map, not isometric, no horizon, no sky).

The ground: a high mountain pass in the Taurus: a narrow road winding between steep grey cliffs on both sides, dark pine trees on the slopes, patches of old snow in the shadows, a fast stream beside the road with a small stone bridge, boulders fallen onto the track.

Scale: a man standing would be about 30 pixels across on this canvas and a camel about 70 pixels long, so the whole map covers roughly 250 by 370 metres of ground.
Keep the middle of the lower half passable and fairly open: that is where the caravan stops. Leave clear ground at the top where the enemy arrives.
Features must be easy to read from above: cover (walls, rocks, trees, reeds, dune crests) clearly different from open ground; water clearly water.

Empty scene: NO people, NO animals, NO camels, NO carts, NO tents, NO boats, NO text, NO grid, NO borders, NO compass.
Lighting: late afternoon sun from the upper left, soft long shadows falling to the lower right.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted colours, painted texture visible, the same painting style as the attached image, painted like an old campaign map brought to life.
Canvas: portrait 1024x1536.
```

---

# Part 2: Your men on foot
*Make the guard first; it becomes the reference for all the others.*

### guard → `public/art/battle/units/guard.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: an Egyptian caravan guard in a khaki tunic, red tarboosh and bandolier, holding an old Martini rifle across his chest. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### fellah → `public/art/battle/units/fellah.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a young Egyptian village lad in a patched brown galabiya and a white skullcap, holding a long wooden staff. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### veteran → `public/art/battle/units/veteran.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a hardened Egyptian veteran of the Great War in a faded khaki army tunic and puttees, peaked cap, Lee-Enfield rifle held ready. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### watchman → `public/art/battle/units/watchman.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a Giza village watchman in a dark blue galabiya and white turban, holding a staff and a small brass lamp. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### sentinel → `public/art/battle/units/sentinel.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a Cairo city sentinel in a dark uniform coat and red tarboosh, carrying a rifle on his shoulder. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### harbour → `public/art/battle/units/harbour.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: an Alexandria harbour watchman in a navy pea coat and flat cap, carrying a rifle and a coil of rope at his belt. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### hero → `public/art/battle/units/hero.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: the merchant hero: a bald man with a thick dark greying beard, cream linen shirt, brown embroidered vest, loose off-white trousers, a pistol in his hand. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

---

# Part 3: Your riders

### bedouin → `public/art/battle/units/bedouin.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a Bedouin rider in a white keffiyeh and brown cloak on a grey Arabian horse, rifle held upright. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### desertcaptain → `public/art/battle/units/desertcaptain.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a Bedouin caravan captain in a black cloak with gold edging and white keffiyeh on a dark bay Arabian horse, sword at his side. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### arnaut → `public/art/battle/units/arnaut.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a fierce Albanian Arnaut captain in a white fustanella kilt, red vest and white felt cap on a black horse, a long rifle across the saddle. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### reformed → `public/art/battle/units/reformed.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a former desert raider in a dusty indigo robe and dark head-cloth on a sandy-coloured horse, rifle slung. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

---

# Part 4: Enemies
*One ordinary fighter and one leader for each of the five bands the game already has. When a leader falls, his band loses heart.*

## Rural Highway Robbers (Egyptian countryside)

### robber → `public/art/battle/units/robber.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: an Egyptian highway robber in a dark galabiya with the hem tucked up, face half-wrapped in a cloth, holding a heavy club. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### robber-leader → `public/art/battle/units/robber-leader.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: the robber chief: a big man in a black galabiya and brown turban, a curved knife and an old revolver in his sash. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 32% of the canvas width across his shoulders (a little bigger than his men). Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

## Desert Raiders (Sinai and Transjordan)

### raider → `public/art/battle/units/raider.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a desert raider on a camel, dark robes and a black head-cloth, long rifle. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### raider-leader → `public/art/battle/units/raider-leader.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: the raider sheikh on a white camel, black robes with a red sash, rifle raised. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

## Road Thieves (Palestine)

### thief → `public/art/battle/units/thief.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a road thief in a striped short coat, baggy trousers and a white head-cloth, holding a knife. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### thief-leader → `public/art/battle/units/thief-leader.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: the thieves' leader in a dark coat and a red-and-white keffiyeh, holding a revolver. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 32% of the canvas width across his shoulders (a little bigger than his men). Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

## Syrian Rebel Band (1925)

### rebel → `public/art/battle/units/rebel.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: a Syrian rebel fighter in a keffiyeh, a jacket with crossed bandoliers, holding an Ottoman Mauser rifle. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 28% of the canvas width across his shoulders. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### rebel-leader → `public/art/battle/units/rebel-leader.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show one standing man seen from directly above, head at the centre, shoulders left and right, facing the top edge.
Who: the rebel commander in a dark jacket, keffiyeh and agal, binoculars on his chest, rifle slung. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
Scale: the man fills about 32% of the canvas width across his shoulders (a little bigger than his men). Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

## Border Smuggler-Brigands (Iraq-Syria frontier)

### smuggler → `public/art/battle/units/smuggler.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: a smuggler on a horse, dark cloak, face wrapped against the sand, rifle across his back and saddlebags. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### smuggler-leader → `public/art/battle/units/smuggler-leader.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (a bird's-eye view, not isometric, not from the side). Show a rider on horseback seen from directly above: the horse's head points to the top edge, the rider's head and shoulders in the middle of the horse's back.
Who: the smuggler boss on a grey horse, heavy sheepskin coat, rifle and a pistol belt. What he wears and carries must be readable from above: the head-covering, the shoulders of the coat, the weapon lying along the arm.
The horse, from nose to tail, fills about 80% of the canvas height. Centred on the canvas.

Only this one figure. No ground, no shadow on the ground, no base, no ring, no border, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

---

# Part 5: Animals and the fallen

### camel → `public/art/battle/units/camel.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (bird's-eye view, not isometric). One loaded caravan camel standing, its head pointing to the top edge: the hump in the middle with bundles of rolled rugs and sacks tied on both sides, a woven saddle blanket.
Scale: the camel from nose to tail fills about 85% of the canvas height. Centred.

Only this one camel. No ground, no shadow, no rider, no ring, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### horse → `public/art/battle/units/horse.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead (bird's-eye view, not isometric). One saddled horse with no rider, head pointing to the top edge, reins hanging loose.
Scale: the horse from nose to tail fills about 80% of the canvas height. Centred.

Only this one horse. No ground, no shadow, no rider, no ring, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image. Clear, bold shapes so it reads at a small size on a phone.
Canvas: square 1024x1024.
```

### fallen-light → `public/art/battle/units/fallen-light.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead. A man in a pale galabiya lying face down on the ground, one arm stretched out, his cap fallen beside him, a dropped rifle next to him. Not bloody, not gruesome: a painting of a fallen man, as in a 19th-century battle painting.
Scale: the man fills about 70% of the canvas height. Centred.

Only this one figure and the things he dropped. No ground, no shadow on the ground, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image.
Canvas: square 1024x1024.
```

### fallen-dark → `public/art/battle/units/fallen-dark.png`
```
A single game token for a top-down battle map.

View: straight down from directly overhead. A man in dark robes and a dark head-cloth lying on his side on the ground, one knee bent, a dropped curved knife beside him. Not bloody, not gruesome: a painting of a fallen man, as in a 19th-century battle painting.
Scale: the man fills about 70% of the canvas height. Centred.

Only this one figure and the things he dropped. No ground, no shadow on the ground, no text.
Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, rich but muted desert colours, painted texture visible, the same painting style as the attached image.
Canvas: square 1024x1024.
```

---

# Checklist
| # | File | Part |
|---|---|---|
| 1 | `battle-road.jpg` | Battlefield |
| 2 | `battle-dunes.jpg` | Battlefield |
| 3 | `battle-oasis.jpg` | Battlefield |
| 4 | `battle-pass.jpg` | Battlefield |
| 5 | `fellah.png` | Token |
| 6 | `guard.png` | Token |
| 7 | `veteran.png` | Token |
| 8 | `watchman.png` | Token |
| 9 | `sentinel.png` | Token |
| 10 | `harbour.png` | Token |
| 11 | `hero.png` | Token |
| 12 | `bedouin.png` | Token |
| 13 | `desertcaptain.png` | Token |
| 14 | `arnaut.png` | Token |
| 15 | `reformed.png` | Token |
| 16 | `robber.png` | Token |
| 17 | `robber-leader.png` | Token |
| 18 | `raider.png` | Token |
| 19 | `raider-leader.png` | Token |
| 20 | `thief.png` | Token |
| 21 | `thief-leader.png` | Token |
| 22 | `rebel.png` | Token |
| 23 | `rebel-leader.png` | Token |
| 24 | `smuggler.png` | Token |
| 25 | `smuggler-leader.png` | Token |
| 26 | `camel.png` | Token |
| 27 | `horse.png` | Token |
| 28 | `fallen-light.png` | Token |
| 29 | `fallen-dark.png` | Token |
| 30 | `battle-nile.jpg` | Battlefield |
| 31 | `battle-ford.jpg` | Battlefield |
| 32 | `battle-hills.jpg` | Battlefield |
| 33 | `battle-basalt.jpg` | Battlefield |
| 34 | `battle-ruins.jpg` | Battlefield |
| 35 | `battle-mountain.jpg` | Battlefield |
