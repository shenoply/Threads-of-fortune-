# Hero Wardrobe: ChatGPT Prompts

Generated from the game's catalogue (src/data/wardrobe.ts). 45 pieces.

## How to use
1. **Base bodies first (Part 1).** Already done: the three are in the game.
2. **Hats** are drawn on their own: attach the pose's base image once at the start of the chat, then one prompt per message.
3. **Everything else (shirts, robes, coats, trousers, shoes, extras, arms, bags) is drawn ON the hero.** Attach the pose's base image **with every one of these prompts**, so ChatGPT edits that picture and dresses him in the piece. The sleeves then follow his real arms. Claude cuts the piece out afterwards (tools/dress-extract.py).
4. Send each image back to Claude in the chat. Backgrounds, sizes and small shifts are fixed on this side, so don't worry about them.
5. **One piece per image.** No sheets, grids or full outfits.

Legs, shoes, canes, holstered pistols and bags only appear in the Wardrobe pose (the counter hides them at the stall, and the profile frame cuts them off). The file skips prompts that aren't needed.

---

# Part 1: Base bodies

### Wardrobe base → `public/art/hero/hero-base-wardrobe.png`
**Attach:** stall-seller.jpg + hero-face-reference.jpg

```
Use the attached images as the exact reference for this man: completely bald head, thick dark beard with grey at the chin, olive-brown sun-weathered skin, deep-set dark eyes, strong nose, lined forehead, age about 45, solid medium build with strong forearms. Keep his face and body identical to the reference.

Full-body image of this same man standing, head to toe, facing the viewer straight on. Arms hanging relaxed and slightly away from the body, hands open, feet shoulder-width apart, bare feet. Calm, serious expression.

He wears ONLY a plain, thin, close-fitting off-white cotton undershirt with short sleeves and plain off-white cotton drawers to the knee. Bald head uncovered. No vest, no jewellery, no bracelet, no props.

Background: fully transparent (PNG with alpha). No floor, no shadow.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: portrait 1024x1536. Figure centred, top of head 60px from the top edge, feet 40px from the bottom edge.
```

### Stall base → `public/art/hero/hero-base-stall.png`
**Attach:** hero-face-reference.jpg + hero-base-wardrobe.png

```
Use the attached images as the exact reference for this man. Same bald head, dark greying beard, face, skin and build as the wardrobe image. Keep him identical.

Waist-up image of this same man leaning forward over his rug counter, body turned slightly to the viewer's right, head in three-quarter view, focused merchant's look, both forearms resting forward at the bottom edge of the frame with hands open, as if presenting a rug. Do not draw the counter or the rug.

He wears ONLY the same plain off-white short-sleeved cotton undershirt. No vest, no jewellery, no props.

Background: fully transparent (PNG with alpha).
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: portrait 1024x1536. Head in the upper third, body cut off by the bottom edge at the waist.
```

### Profile base → `public/art/hero/hero-base-profile.png`
**Attach:** hero-face-reference.jpg + hero-base-wardrobe.png

```
Use the attached images as the exact reference for this man. Same bald head, dark greying beard, face, skin and build. Keep him identical.

Head-and-shoulders portrait of this same man facing the viewer, shoulders square, steady confident merchant's look, like a portrait in an auction catalogue.

He wears ONLY the same plain off-white cotton undershirt. No jewellery, no props.

Background: fully transparent (PNG with alpha).
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: square 1024x1024. Top of head 90px from the top edge, shoulders cut off by the bottom edge.
```

### Wardrobe background → `public/art/hero/wardrobe-room.jpg`
**Attach:** stall-seller.jpg (for the painting style only)

```
A painted background for a character wardrobe screen in a game: a 1920s Cairo merchant's dressing room, seen straight on from standing height.

Centre of the picture: an EMPTY open space of bare floor where a man will be placed later. Nothing in the middle third: no furniture, no people, no mannequin.
Around it: a tall carved wooden wardrobe with its doors open and garments hanging inside (galabiyas, a frock coat, a kaftan) on the left; a tall standing mirror in a gilded frame and a brass hat stand holding a red tarboosh and a white turban on the right; a mashrabiya lattice window behind, letting in warm late-afternoon light in soft shafts; a worn Persian rug on a tiled floor in the lower third; a low shelf with folded scarves, a pair of leather slippers and a small brass oil lamp.

Mood: warm, quiet, lived-in, golden light, deep shadows at the edges so a figure in the centre stands out. Slightly soft focus on the background details.
No people. No text. No logo.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: portrait 1024x1536.
```

---

# Part 2: Pieces

## Wardrobe chat (45 pieces) → folder `public/art/hero/wardrobe/`
**Attach once at the start:** hero-base-wardrobe.png

### Hats

#### White knitted cap · 5 PT → `taqiyah.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a close-fitting white knitted cotton skullcap (taqiyah), slightly worn.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Tarboosh · 40 PT → `tarboosh.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a tall red felt tarboosh (fez) with a flat top and a black silk tassel hanging to the back.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Albanian white cap · 45 PT → `qeleshe.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a round, brimless, white wool felt Albanian cap (qeleshe), dome-shaped, smooth and slightly stiff.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### White turban · 30 PT → `turban-white.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a white muslin turban wound neatly around a small cap.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk turban · £E1.50 (150 PT) → `turban-silk.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a turban of striped cream and gold Damascus silk, wound full and neat, gold threads catching the light.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Pasha's kalpak · £E4.50 (450 PT) → `kalpak.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a tall, brimless black astrakhan lambswool kalpak hat, tightly curled fur, slightly tapered.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Keffiyeh and agal · 45 PT → `keffiyeh.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a white cotton keffiyeh draped over the head and shoulders, held by a black corded agal.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Straw boater · 90 PT → `boater.png`
```
The attached image is a template: a man in plain underclothes, full body standing, head to toe, facing the viewer, on a 1024x1536 canvas.

Draw ONLY this item: a stiff flat-topped straw boater hat with a black grosgrain band.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Shirts & robes

#### Collarless linen shirt · 25 PT → `linen-shirt.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Dress him in: a loose cream linen shirt with a band collar, open at the throat, small red cloth buttons, full sleeves rolled to the forearm, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Striped work galabiya · 20 PT → `galabiya-work.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Dress him in: an ankle-length brown and cream striped cotton galabiya with a round neck and a short button placket, loose sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### White galabiya · 40 PT → `galabiya-white.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Dress him in: an ankle-length clean white cotton galabiya, round neck, long wide sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Fine wool galabiya · £E1.20 (120 PT) → `galabiya-wool.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Dress him in: an ankle-length charcoal-blue fine wool galabiya with a deep V neck and black silk piping, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Collared dress shirt · £E1 (100 PT) → `dress-shirt.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Dress him in: a starched white cotton dress shirt with a stiff turned-down collar and a narrow dark silk tie, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Coats & vests

#### Embroidered vest · 45 PT → `vest-embroidered.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an open-fronted dark brown wool waistcoat with wide bands of gold and rust embroidered braid down both fronts.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Stambouli jacket · £E1.80 (180 PT) → `stambouli.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted black wool Stambouli frock jacket, high-buttoning, fitted, reaching mid-thigh.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Cream linen jacket · £E1.60 (160 PT) → `linen-suit.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted cream linen suit jacket with notched lapels, three buttons, slightly creased.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk kaftan · £E4 (400 PT) → `kaftan.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an ankle-length open kaftan of striped wine-red and gold Damascus silk, lined, with a narrow collar.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Camel-hair bisht · £E3 (300 PT) → `bisht.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a flowing sheer camel-brown wool bisht cloak worn open over the shoulders, edged with gold zari braid.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Court frock coat · £E10.50 (1050 PT) → `frock-coat.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a black knee-length double-breasted court frock coat with silk-faced lapels, buttoned, sharply tailored.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Wool travel cloak · 90 PT → `burnous.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a heavy undyed oatmeal wool hooded burnous cloak, hood down, worn open.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Trousers

#### Cotton sirwal · 15 PT → `sirwal.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Replace his plain drawers with: loose off-white cotton sirwal trousers, full through the leg and gathered at the ankle. The trousers cover his legs down to the ankle as they are, feet stay bare.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Dark wool trousers · 70 PT → `wool-trousers.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Replace his plain drawers with: straight dark charcoal wool trousers with a sharp front crease. The trousers cover his legs down to the ankle as they are, feet stay bare.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Cream linen trousers · 60 PT → `linen-trousers.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Replace his plain drawers with: straight cream linen trousers, lightly creased. The trousers cover his legs down to the ankle as they are, feet stay bare.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Striped court trousers · £E2.50 (250 PT) → `morning-trousers.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Replace his plain drawers with: formal grey and black pinstriped morning trousers, straight, sharply pressed. The trousers cover his legs down to the ankle as they are, feet stay bare.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Shoes

#### Yellow leather slippers · 15 PT → `babouche.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on his bare feet: backless pointed yellow leather markub slippers, exactly where his feet are now.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Red Fez slippers · 50 PT → `markub-red.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on his bare feet: soft pointed red leather slippers with a low back, exactly where his feet are now.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Black oxford shoes · 60 PT → `oxfords.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on his bare feet: polished black leather lace-up oxford shoes, exactly where his feet are now.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Two-tone shoes · £E1.40 (140 PT) → `spectator.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on his bare feet: white and tan two-tone leather brogue shoes, exactly where his feet are now.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Riding boots · £E1.50 (150 PT) → `boots.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Put on his bare feet: knee-high brown leather riding boots, worn and oiled, exactly where his feet are now.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Extras

#### Red silk sash · 35 PT → `sash.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a wide red silk sash (hizam) wound twice around the waist and knotted at the side.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Leather belt · 20 PT → `belt.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a plain brown leather belt with a square brass buckle, worn at the waist.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Amber prayer beads · 25 PT → `misbaha.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a string of 33 amber prayer beads (misbaha) with a tassel, held loosely in the right hand.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk neck scarf · 50 PT → `scarf.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a burnt-orange silk scarf knotted loosely at the neck, ends tucked in.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Gold pocket watch · £E4 (400 PT) → `watch.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a gold watch chain draped across the front of the chest from a buttonhole to a pocket, the gold pocket watch just visible.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Signet ring · £E1.50 (150 PT) → `ring.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a gold signet ring set with a red carnelian stone, on the little finger of the right hand.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Gold spectacles · 80 PT → `spectacles.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: small round gold-rimmed spectacles resting on the nose.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silver-topped cane · £E1.20 (120 PT) → `cane.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: an ebony walking cane with a silver knob handle, held in the right hand, tip on the ground.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Arms

#### Curved dagger · 80 PT → `khanjar.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a curved khanjar dagger in an ornate silver sheath, tucked upright at the front of the waist.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Cavalry sabre · £E3 (300 PT) → `kilij.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a curved Ottoman kilij sabre in a black leather scabbard hanging from a shoulder strap at the left hip.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Webley revolver · £E3.80 (380 PT) → `webley.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a brown leather flap holster on a belt at the right hip, the grip of a Webley revolver showing.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Mauser pistol · £E4.50 (450 PT) → `mauser-c96.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a Mauser C96 broomhandle pistol in its wooden holster-stock hanging from a leather strap at the right hip.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Lee-Enfield rifle · £E6 (600 PT) → `enfield.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a Lee-Enfield bolt-action rifle slung over the right shoulder on a canvas strap, barrel up behind the shoulder.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Ottoman Mauser rifle · £E5.20 (520 PT) → `ottoman-mauser.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: an Ottoman 1893 Mauser bolt-action rifle slung over the right shoulder on a leather strap, barrel up behind the shoulder.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Bags

#### Leather satchel · 60 PT → `satchel.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a brown leather satchel on a strap worn across the body, resting at the left hip.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Leather briefcase · £E1.40 (140 PT) → `briefcase.png` · *attach hero-base-wardrobe.png with this one*
```
Edit the attached image. Add to him: a dark brown leather briefcase with brass clasps, held in the left hand.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

---

## Stall chat (30 pieces) → folder `public/art/hero/stall/`
**Attach once at the start:** hero-base-stall.png

### Hats

#### White knitted cap · 5 PT → `taqiyah.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a close-fitting white knitted cotton skullcap (taqiyah), slightly worn.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Tarboosh · 40 PT → `tarboosh.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a tall red felt tarboosh (fez) with a flat top and a black silk tassel hanging to the back.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Albanian white cap · 45 PT → `qeleshe.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a round, brimless, white wool felt Albanian cap (qeleshe), dome-shaped, smooth and slightly stiff.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### White turban · 30 PT → `turban-white.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a white muslin turban wound neatly around a small cap.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk turban · £E1.50 (150 PT) → `turban-silk.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a turban of striped cream and gold Damascus silk, wound full and neat, gold threads catching the light.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Pasha's kalpak · £E4.50 (450 PT) → `kalpak.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a tall, brimless black astrakhan lambswool kalpak hat, tightly curled fur, slightly tapered.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Keffiyeh and agal · 45 PT → `keffiyeh.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a white cotton keffiyeh draped over the head and shoulders, held by a black corded agal.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Straw boater · 90 PT → `boater.png`
```
The attached image is a template: a man in plain underclothes, waist up, leaning forward over the rug counter, three-quarter view, forearms resting at the bottom edge, on a 1024x1536 canvas.

Draw ONLY this item: a stiff flat-topped straw boater hat with a black grosgrain band.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Shirts & robes

#### Collarless linen shirt · 25 PT → `linen-shirt.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Dress him in: a loose cream linen shirt with a band collar, open at the throat, small red cloth buttons, full sleeves rolled to the forearm, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Striped work galabiya · 20 PT → `galabiya-work.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Dress him in: an ankle-length brown and cream striped cotton galabiya with a round neck and a short button placket, loose sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### White galabiya · 40 PT → `galabiya-white.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Dress him in: an ankle-length clean white cotton galabiya, round neck, long wide sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Fine wool galabiya · £E1.20 (120 PT) → `galabiya-wool.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Dress him in: an ankle-length charcoal-blue fine wool galabiya with a deep V neck and black silk piping, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Collared dress shirt · £E1 (100 PT) → `dress-shirt.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Dress him in: a starched white cotton dress shirt with a stiff turned-down collar and a narrow dark silk tie, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Coats & vests

#### Embroidered vest · 45 PT → `vest-embroidered.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an open-fronted dark brown wool waistcoat with wide bands of gold and rust embroidered braid down both fronts.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Stambouli jacket · £E1.80 (180 PT) → `stambouli.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted black wool Stambouli frock jacket, high-buttoning, fitted, reaching mid-thigh.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Cream linen jacket · £E1.60 (160 PT) → `linen-suit.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted cream linen suit jacket with notched lapels, three buttons, slightly creased.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk kaftan · £E4 (400 PT) → `kaftan.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an ankle-length open kaftan of striped wine-red and gold Damascus silk, lined, with a narrow collar.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Camel-hair bisht · £E3 (300 PT) → `bisht.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a flowing sheer camel-brown wool bisht cloak worn open over the shoulders, edged with gold zari braid.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Court frock coat · £E10.50 (1050 PT) → `frock-coat.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a black knee-length double-breasted court frock coat with silk-faced lapels, buttoned, sharply tailored.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Wool travel cloak · 90 PT → `burnous.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a heavy undyed oatmeal wool hooded burnous cloak, hood down, worn open.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Extras

#### Red silk sash · 35 PT → `sash.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a wide red silk sash (hizam) wound twice around the waist and knotted at the side.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Leather belt · 20 PT → `belt.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a plain brown leather belt with a square brass buckle, worn at the waist.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Amber prayer beads · 25 PT → `misbaha.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a string of 33 amber prayer beads (misbaha) with a tassel, held loosely in the right hand.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Silk neck scarf · 50 PT → `scarf.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a burnt-orange silk scarf knotted loosely at the neck, ends tucked in.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Gold pocket watch · £E4 (400 PT) → `watch.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a gold watch chain draped across the front of the chest from a buttonhole to a pocket, the gold pocket watch just visible.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Signet ring · £E1.50 (150 PT) → `ring.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a gold signet ring set with a red carnelian stone, on the little finger of the right hand.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Gold spectacles · 80 PT → `spectacles.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: small round gold-rimmed spectacles resting on the nose.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

### Arms

#### Curved dagger · 80 PT → `khanjar.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a curved khanjar dagger in an ornate silver sheath, tucked upright at the front of the waist.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Lee-Enfield rifle · £E6 (600 PT) → `enfield.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: a Lee-Enfield bolt-action rifle slung over the right shoulder on a canvas strap, barrel up behind the shoulder.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

#### Ottoman Mauser rifle · £E5.20 (520 PT) → `ottoman-mauser.png` · *attach hero-base-stall.png with this one*
```
Edit the attached image. Add to him: an Ottoman 1893 Mauser bolt-action rifle slung over the right shoulder on a leather strap, barrel up behind the shoulder.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1536.
```

---

## Profile chat (22 pieces) → folder `public/art/hero/profile/`
**Attach once at the start:** hero-base-profile.png

### Hats

#### White knitted cap · 5 PT → `taqiyah.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a close-fitting white knitted cotton skullcap (taqiyah), slightly worn.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Tarboosh · 40 PT → `tarboosh.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a tall red felt tarboosh (fez) with a flat top and a black silk tassel hanging to the back.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Albanian white cap · 45 PT → `qeleshe.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a round, brimless, white wool felt Albanian cap (qeleshe), dome-shaped, smooth and slightly stiff.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### White turban · 30 PT → `turban-white.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a white muslin turban wound neatly around a small cap.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Silk turban · £E1.50 (150 PT) → `turban-silk.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a turban of striped cream and gold Damascus silk, wound full and neat, gold threads catching the light.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Pasha's kalpak · £E4.50 (450 PT) → `kalpak.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a tall, brimless black astrakhan lambswool kalpak hat, tightly curled fur, slightly tapered.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Keffiyeh and agal · 45 PT → `keffiyeh.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a white cotton keffiyeh draped over the head and shoulders, held by a black corded agal.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Straw boater · 90 PT → `boater.png`
```
The attached image is a template: a man in plain underclothes, head and shoulders, facing the viewer, on a 1024x1024 canvas.

Draw ONLY this item: a stiff flat-topped straw boater hat with a black grosgrain band.
It must be sitting on his bald head at the right size and angle for this head, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

### Shirts & robes

#### Collarless linen shirt · 25 PT → `linen-shirt.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Dress him in: a loose cream linen shirt with a band collar, open at the throat, small red cloth buttons, full sleeves rolled to the forearm, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Striped work galabiya · 20 PT → `galabiya-work.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Dress him in: an ankle-length brown and cream striped cotton galabiya with a round neck and a short button placket, loose sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### White galabiya · 40 PT → `galabiya-white.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Dress him in: an ankle-length clean white cotton galabiya, round neck, long wide sleeves, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Fine wool galabiya · £E1.20 (120 PT) → `galabiya-wool.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Dress him in: an ankle-length charcoal-blue fine wool galabiya with a deep V neck and black silk piping, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Collared dress shirt · £E1 (100 PT) → `dress-shirt.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Dress him in: a starched white cotton dress shirt with a stiff turned-down collar and a narrow dark silk tie, worn over his plain undershirt.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

### Coats & vests

#### Embroidered vest · 45 PT → `vest-embroidered.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an open-fronted dark brown wool waistcoat with wide bands of gold and rust embroidered braid down both fronts.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Stambouli jacket · £E1.80 (180 PT) → `stambouli.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted black wool Stambouli frock jacket, high-buttoning, fitted, reaching mid-thigh.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Cream linen jacket · £E1.60 (160 PT) → `linen-suit.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a single-breasted cream linen suit jacket with notched lapels, three buttons, slightly creased.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Silk kaftan · £E4 (400 PT) → `kaftan.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: an ankle-length open kaftan of striped wine-red and gold Damascus silk, lined, with a narrow collar.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Camel-hair bisht · £E3 (300 PT) → `bisht.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a flowing sheer camel-brown wool bisht cloak worn open over the shoulders, edged with gold zari braid.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Court frock coat · £E10.50 (1050 PT) → `frock-coat.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a black knee-length double-breasted court frock coat with silk-faced lapels, buttoned, sharply tailored.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Wool travel cloak · 90 PT → `burnous.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Put on him, over what he wears now: a heavy undyed oatmeal wool hooded burnous cloak, hood down, worn open.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

### Extras

#### Silk neck scarf · 50 PT → `scarf.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Add to him: a burnt-orange silk scarf knotted loosely at the neck, ends tucked in.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

#### Gold spectacles · 80 PT → `spectacles.png` · *attach hero-base-profile.png with this one*
```
Edit the attached image. Add to him: small round gold-rimmed spectacles resting on the nose.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: 1024x1024.
```

---

# Price list

| Piece | Slot | Price | Charisma | Sold in |
|---|---|---|---|---|
| White knitted cap | Hats | 5 PT | +0 | any market |
| Tarboosh | Hats | 40 PT | +2 | cairo, alexandria, istanbul |
| Albanian white cap | Hats | 45 PT | +2 | cairo, alexandria, istanbul |
| White turban | Hats | 30 PT | +1 | any market |
| Silk turban | Hats | £E1.50 (150 PT) | +3 | damascus, aleppo, baghdad, beirut, jerusalem |
| Pasha's kalpak | Hats | £E4.50 (450 PT) | +4 | istanbul, cairo |
| Keffiyeh and agal | Hats | 45 PT | +1 | damascus, baghdad, jerusalem, amman, bedouin |
| Straw boater | Hats | 90 PT | +2 | alexandria, portsaid, beirut |
| Collarless linen shirt | Shirts & robes | 25 PT | +0 | any market |
| Striped work galabiya | Shirts & robes | 20 PT | +0 | any market |
| White galabiya | Shirts & robes | 40 PT | +1 | any market |
| Fine wool galabiya | Shirts & robes | £E1.20 (120 PT) | +2 | cairo, tanta, fayoum |
| Collared dress shirt | Shirts & robes | £E1 (100 PT) | +2 | cairo, alexandria, istanbul |
| Embroidered vest | Coats & vests | 45 PT | +0 | any market |
| Stambouli jacket | Coats & vests | £E1.80 (180 PT) | +4 | cairo, alexandria, istanbul |
| Cream linen jacket | Coats & vests | £E1.60 (160 PT) | +3 | alexandria, portsaid, cairo |
| Silk kaftan | Coats & vests | £E4 (400 PT) | +6 | damascus, aleppo, baghdad, beirut, jerusalem |
| Camel-hair bisht | Coats & vests | £E3 (300 PT) | +5 | baghdad, damascus, amman |
| Court frock coat | Coats & vests | £E10.50 (1050 PT) | +9 | cairo, istanbul, alexandria |
| Wool travel cloak | Coats & vests | 90 PT | +1 | bedouin, sinai, suez, amman |
| Cotton sirwal | Trousers | 15 PT | +0 | any market |
| Dark wool trousers | Trousers | 70 PT | +1 | cairo, alexandria, istanbul |
| Cream linen trousers | Trousers | 60 PT | +1 | alexandria, portsaid, cairo |
| Striped court trousers | Trousers | £E2.50 (250 PT) | +2 | cairo, istanbul |
| Yellow leather slippers | Shoes | 15 PT | +0 | any market |
| Red Fez slippers | Shoes | 50 PT | +1 | damascus, aleppo, baghdad, beirut, jerusalem, cairo |
| Black oxford shoes | Shoes | 60 PT | +1 | cairo, alexandria, istanbul, beirut |
| Two-tone shoes | Shoes | £E1.40 (140 PT) | +2 | alexandria, beirut |
| Riding boots | Shoes | £E1.50 (150 PT) | +1 | damascus, aleppo, amman, baghdad, suez |
| Red silk sash | Extras | 35 PT | +1 | any market |
| Leather belt | Extras | 20 PT | +0 | any market |
| Amber prayer beads | Extras | 25 PT | +1 | any market |
| Silk neck scarf | Extras | 50 PT | +1 | cairo, alexandria, istanbul, damascus, aleppo, baghdad, beirut, jerusalem |
| Gold pocket watch | Extras | £E4 (400 PT) | +2 | alexandria, istanbul, cairo |
| Signet ring | Extras | £E1.50 (150 PT) | +1 | cairo, alexandria, istanbul, damascus |
| Gold spectacles | Extras | 80 PT | +1 | cairo, alexandria, istanbul, beirut |
| Silver-topped cane | Extras | £E1.20 (120 PT) | +2 | cairo, alexandria, istanbul |
| Curved dagger | Arms | 80 PT | +0 | damascus, baghdad, aleppo, bedouin |
| Cavalry sabre | Arms | £E3 (300 PT) | +1 | istanbul, damascus |
| Webley revolver | Arms | £E3.80 (380 PT) | +0 | alexandria, portsaid, jerusalem |
| Mauser pistol | Arms | £E4.50 (450 PT) | +0 | istanbul, beirut, aleppo |
| Lee-Enfield rifle | Arms | £E6 (600 PT) | +0 | portsaid, suez, jerusalem, baghdad |
| Ottoman Mauser rifle | Arms | £E5.20 (520 PT) | +0 | aleppo, damascus, konya, ankara, bedouin |
| Leather satchel | Bags | 60 PT | +0 | any market |
| Leather briefcase | Bags | £E1.40 (140 PT) | +1 | cairo, alexandria, istanbul |
