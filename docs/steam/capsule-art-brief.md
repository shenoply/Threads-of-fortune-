# Capsule art brief: Steam store and library images

A brief to paste into ChatGPT (image generation), one image per chat message. It lists every image
Steam requires, at the sizes Steam asks for today, with the rules that decide whether the store review
passes it.

Checked against Steamworks on 31 October 2026:
[Store Graphical Assets](https://partner.steamgames.com/doc/store/assets),
[Library Assets](https://partner.steamgames.com/doc/store/assets/libraryassets),
[Graphical Asset Rules](https://partner.steamgames.com/doc/store/assets/rules).
Steam raised most capsule sizes in August 2024 and no longer accepts the old ones.

## The rules that apply to every image

- **Only the title.** Store capsules may show the artwork, the game's name and an official subtitle. Nothing else: no review scores, no awards, no "Wishlist now", no dates, no "Demo available", no other words. The library hero has **no text at all**. The library logo is the logotype alone.
- **Legible.** The title must be readable at the smallest size Steam shows that image.
- **PG-13.** No blood; robbers may be armed but nobody is being hurt.
- **Exact pixel sizes.** Steam rejects images of the wrong size. ChatGPT cannot paint 3840 px or odd sizes directly: paint at the nearest size it offers in the same proportions (see each image), then resize and crop to the exact size in an editor (`python3 -c "from PIL import Image; ..."` or any editor). Always crop, never stretch.
- **Our own art only.** Use the game's paintings in `public/art/` as references for the look; do not use any real photograph or another game's art.

## Style lock (paste first, once per chat)

> Style for every image in this chat: an oil painting in the manner of Orientalist travel painting of the 1880s–1920s and Egyptian railway posters of the 1920s, warm and painterly, visible brush strokes, soft late-afternoon light, a palette of sand, ochre, terracotta, madder red, deep indigo and brass gold on dark umber shadows. Egypt and the Levant in 1925. Fictional people only, no recognisable real person. No modern objects. No text anywhere in the picture unless I ask for the title.
>
> When I ask for the title, letter it exactly as **Threads of Fortune**, in one line or two (Threads of / Fortune): tall Art Deco capitals of the 1920s with a slight Arabic-calligraphic flourish on the T and F, brass gold with a thin dark outline and a faint shadow, as on a 1925 Cairo cinema poster. Spell it exactly; no other words, no subtitle, no tagline.

The title lettering should come out the same in every image. Paint the **library logo** first (image 8), keep it, and from then on either ask ChatGPT to copy that lettering exactly ("use the same title lettering as the logo above") or paint the art without the title and lay the logo PNG over it in an editor. The second way gives identical lettering every time and is the safer one for review.

## The scene

One key picture, cropped and recomposed for each shape:

> Hassan, the carpet merchant (attach `public/art/hero/hero-portrait.webp` and `public/art/hero/hassan-identity.jpg` as the face and build reference: a shaven-headed man of about thirty with a short dark beard, in a red-and-gold embroidered waistcoat over a white collarless shirt), stands at his small stall in a Giza bazaar lane, unrolling a richly patterned red-and-indigo carpet towards the viewer. Behind him, piles of folded rugs and a hanging lamp; beyond the lane, the pyramids of Giza in a golden haze. To one side, a loaded camel and a small caravan setting out along a road that leads away towards distant minarets. Warm light on the carpet; the carpet is the brightest thing in the picture.

The merchant is seen three-quarters, friendly and alert, and must look like the Hassan of the game's stall and fight paintings: buyers will see him in every screenshot. One face only in each image (Steam shows these small; a crowd turns to noise).

## The images

| # | Asset | Exact size | Paint at | Title? | Notes |
|---|---|---|---|---|---|
| 1 | Header capsule | 920 × 430 | 1536 × 1024, crop to 2.14:1 | Yes | Top of the store page, search, recommendations |
| 2 | Small capsule | 462 × 174 | 1536 × 1024, crop to 2.66:1 | Yes, large | Lists and search; mostly the title |
| 3 | Main capsule | 1232 × 706 | 1536 × 1024, crop to 1.74:1 | Yes | Front-page carousel |
| 4 | Vertical capsule | 748 × 896 | 1024 × 1536, crop to 0.83:1 | Yes | Seasonal sale pages |
| 5 | Page background | 1438 × 810 | 1536 × 1024 | No | Optional; quiet and dark |
| 6 | Library capsule | 600 × 900 | 1024 × 1536, crop to 2:3 | Yes | The game's box in the Steam library |
| 7 | Library hero | 3840 × 1240 | 1536 × 1024, outpaint wider, then upscale | **No text** | Top of the library page |
| 8 | Library logo | 1280 wide (or 720 tall), transparent PNG | 1536 × 1024 on flat chroma green, then cut out | Title only | Laid over the hero |
| 9 | Library header | 920 × 430 | same as #1 | Yes | May reuse #1 |
| 10 | Community / app icon | 184 × 184 JPG | 1024 × 1024 | No | Small mark; also the 256 × 256 shortcut icon (PNG/ICO) |

### 1. Header capsule, 920 × 430

> Paint the scene, landscape, 1536 × 1024. The merchant and the unrolled carpet in the left half, the pyramids and the caravan road in the right half. Leave the upper right third as calm sky and haze for the title. Then add the title, **Threads of Fortune**, in the style lock's lettering, across the upper right, large.

Crop to 920 × 430 (2.14:1), cutting sky and foreground, not the title. Keep the title at least 30 px from every edge; at small capsule size anything near the edge is lost.

### 2. Small capsule, 462 × 174

> Same scene, landscape, 1536 × 1024, but pulled back and simplified: the carpet in the left third as a bold red-and-indigo shape, the pyramids small on the right, a plain warm haze across the middle. Put the title **Threads of Fortune** large across the middle, filling about 70% of the width, in the style lock's lettering.

Crop to 462 × 174. At this size the title is the picture: check that "Threads of Fortune" is readable when the image is shown at 231 × 87.

### 3. Main capsule, 1232 × 706

> The scene, landscape, 1536 × 1024, composed like a 1920s travel poster: the merchant and his carpet in the left half, the pyramids and the caravan road in the right half, the title **Threads of Fortune** across the top, two lines if needed.

Crop to 1232 × 706 (1.74:1). Safe area: keep the title and the merchant's face inside the central 1100 × 600.

### 4. Vertical capsule, 748 × 896

> The scene, portrait, 1024 × 1536: the merchant standing in the lower half holding up the carpet so it hangs full length in front of the stall, the pyramids small in the haze above him, the title **Threads of Fortune** in two lines (Threads of / Fortune) across the top third.

Crop to 748 × 896 (0.83:1), losing a little from top and bottom. Keep the title inside the top 40%, and 40 px clear of the sides.

### 5. Page background, 1438 × 810 (optional)

> A dark, quiet version of the bazaar lane at dusk, landscape, 1536 × 1024: folded rugs in shadow, a single hanging brass lamp, warm umber and deep indigo, low contrast, no people, no text. It will sit behind the store page's text, so keep it dim and even, with no bright spots.

Resize and crop to 1438 × 810. Steam fades it further; it must not compete with the screenshots.

### 6. Library capsule, 600 × 900

> As the vertical capsule (portrait, 1024 × 1536), but closer: the merchant from the waist up, holding the carpet's edge towards the viewer, its pattern filling the lower half; the pyramids and a corner of sky above. Title **Threads of Fortune** in two lines across the top.

Crop to 600 × 900 (2:3). The library shows it as small as 150 × 225: check the title there.

### 7. Library hero, 3840 × 1240 (no text)

> A wide panorama, landscape, 1536 × 1024: the road from Giza northwards at golden hour, a small caravan of camels laden with rolled carpets in the centre, the pyramids on the left horizon and the minarets of Cairo on the right, palms along the Nile. No people's faces close up, no text, no lettering anywhere.

Then ask ChatGPT to extend the picture left and right ("extend this image to a 3:1 panorama, continuing the landscape on both sides"), or extend it in an editor, and upscale to 3840 × 1240. **Safe area: the centred 860 × 380 px** stays visible however the Steam window is sized: put the caravan inside it. The library logo (#8) is laid on top of the hero, usually bottom left or centred: leave a calm patch there.

### 8. Library logo, 1280 px wide, transparent PNG

> The title **Threads of Fortune** alone, in the style lock's lettering, on a flat pure green (#00B140) background with nothing else, landscape, 1536 × 1024. Brass gold capitals with a thin dark brown outline and a soft shadow. A small ornament may sit under the word Fortune: a single knotted carpet border motif in the same brass. No other words.

Remove the green (any editor's colour-to-alpha, or `tools/cutout.py` if it suits), trim to the lettering, and resize to 1280 px wide (or 720 px tall, whichever comes first). Check it on the hero: the dark outline keeps it readable on the sky.

### 9. Library header, 920 × 430

Reuse the header capsule (#1). Steam uses the store header here if none is uploaded.

### 10. Community / app icon, 184 × 184 (and shortcut icon, 256 × 256)

> A square emblem, 1024 × 1024: a rolled red-and-indigo carpet tied with cord, standing on end against a plain deep umber ground, lit warm from one side, painted in the same style. No text, no letters.

Resize to 184 × 184 (JPG, the community "app icon") and 256 × 256 (PNG, the shortcut icon; Steam makes the .ico). At 32 px it should still read as a rolled carpet.

## Demo images

If the demo gets its own store page, Steam asks that its capsules show it is a demo (source:
[Steamworks, Demos](https://partner.steamgames.com/doc/store/application/demos)). Use the same images with
the official subtitle under the title: **Threads of Fortune: Demo**, lettered small in the same style.
No other wording.

## Checklist before upload

- [ ] Every image at its exact pixel size (header 920 × 430, small 462 × 174, main 1232 × 706, vertical 748 × 896, background 1438 × 810, library capsule 600 × 900, hero 3840 × 1240, logo 1280 wide transparent PNG, library header 920 × 430, icon 184 × 184, shortcut 256 × 256).
- [ ] The title spelled exactly "Threads of Fortune" and readable at the smallest display size.
- [ ] No other text anywhere; none at all on the hero.
- [ ] The same lettering on every capsule.
- [ ] No blood, no real person's likeness, no modern objects.
- [ ] Faces and the title inside the safe areas.
