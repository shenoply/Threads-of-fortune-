# Arran station plates: image prompts

Each plate is the lab room (`public/art/arran/13-lab-room.webp`) repainted with Arran at work at one
station. Attach `13-lab-room.png` and an Arran lab-coat reference (`11-lab-inspect.png`) to every
request so the room and his face stay the same. Output 1536×1024 PNG, named as below.

Drop the PNGs in the Drive "Arran" folder. They are converted to `public/art/arran/stations/lab-<place>.webp`;
the game picks each one up by itself and falls back to the empty room with his portrait card for any
that are missing.

## Shared block (paste first, every time)

```
Edit the attached laboratory painting. Keep the room exactly as it is: same camera, framing, perspective,
lighting, window with pyramids on the left, shelves of bottles, long wooden workbench against the back
wall, brass microscope, glass-cased balance, the large slate board on the right left completely blank
(no writing), tiled floor. Same painterly, warm, golden-hour illustration style.

Add one man, Arran Embleton, a British textile chemist in Giza, 1925, matching the attached character
reference exactly: late 20s, short wavy auburn hair, clean-shaven, round tortoiseshell glasses, white
cotton lab coat worn open over a tweed waistcoat with a watch chain, white collared shirt, dark patterned
tie, brown trousers, brown leather shoes. He is full height and stands on the tiled floor in front of
the bench, life-size for the room (the bench top reaches his hip), lit by the same window light, with a
soft shadow on the floor. Natural, absorbed in his work, not posing for the viewer.

No text, no captions, no labels, no watermark. 1536×1024.
```

## Plates (paste one after the shared block)

**lab-microscope.png**
```
He stands at the brass microscope in the middle of the bench, seen side-on from our left, bending to
the eyepiece, left hand on the focus knob, right hand holding a glass slide with a few wool fibres.
Face in three-quarter profile, eyes on the eyepiece, concentrating.
```

**lab-dye.png**
```
He stands at the right end of the bench by the folded textiles, holding a small card of four wool dye
swatches (red, rose, indigo, sand) up toward the window light, studying it, head tilted, slight frown.
Three-quarter back view from our right, face in profile.
```

**lab-balance.png**
```
He stands at the glass-cased brass balance, the case door open, placing a tiny folded paper of wool
fibres on the left pan with tweezers. Eyes down on the pan, careful, still. Three-quarter view
facing right.
```

**lab-desk.png**
```
He sits on the wooden stool at the left end of the bench by the oil lamp, writing in the open notebook
with a fountain pen, glancing up toward the viewer mid-sentence with a friendly, slightly distracted
look. One forearm resting on the book.
```

**lab-board.png**
```
He stands at the slate board on the right, half turned away, holding a stick of chalk raised as if about
to write, looking back over his shoulder toward the viewer as if explaining something. The board stays
blank.
```

**lab-cabinet.png**
```
He stands at the tall bookcase on the far right edge, reaching up to take down a labelled brown glass
bottle from a high shelf, other hand holding an open leather ledger. Seen from behind at three-quarter,
face in profile.
```

## Optional: portrait-card faces (600×750, plain dark background)

```
Head-and-shoulders portrait of the same man (attached reference), lab coat, plain dark umber background,
soft window light from the left, same painterly style. Expression: <EXPRESSION>. Head angle: <ANGLE>.
No text. 600×750.
```
Name them `face-thoughtful`, `face-amused`, `face-worried`, `face-explaining`, `face-surprised`, `face-stern`.
Angles to vary: three-quarter left, three-quarter right, slightly down, looking up over his glasses.
