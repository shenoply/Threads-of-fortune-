// ChatGPT prompts for the hero's base bodies and for each piece of clothing, per pose.
// Used by the wardrobe's Fit mode (copy a prompt) and by tools/wardrobe-prompts.mjs (the full file).
import { POSE_INFO, type Piece, type Pose } from './wardrobe';

// Hassan, the merchant you play (approved identity: art/hero/hassan-identity.jpg)
export const HERO_LOOKS = 'a man in his mid-thirties, completely bald head, neatly shaped short dark beard and moustache, warm olive-brown skin, dark expressive eyes under heavy brows, straight strong nose, broad shoulders, broad muscular build with thick forearms';
const STYLE = 'warm game illustration matching the attached image, golden light from the upper left; no visible brush strokes, no canvas texture, skin not airbrushed or overly smooth';

export const BASE_ATTACH: Record<Pose, string> = {
  wardrobe: 'hassan-identity.jpg + hassan-face-reference.jpg',
  stall: 'hassan-face-reference.jpg + hero-base-wardrobe.png',
  profile: 'hassan-face-reference.jpg + hero-base-wardrobe.png',
};

export function basePrompt(pose: Pose): string {
  if (pose === 'wardrobe') return `Use the attached images as the exact reference for this man: ${HERO_LOOKS}. Keep his face and body identical to the reference.

Full-body image of this same man standing, head to toe, facing the viewer straight on. Arms hanging relaxed and slightly away from the body, hands open, feet shoulder-width apart, bare feet. Calm, serious expression.

He wears ONLY a plain, thin, close-fitting off-white cotton undershirt with short sleeves and plain off-white cotton drawers to the knee. Bald head uncovered. No vest, no jewellery, no bracelet, no props.

Background: fully transparent (PNG with alpha). No floor, no shadow.
Style: ${STYLE}.
Canvas: portrait 1024x1536. Figure centred, top of head 60px from the top edge, feet 40px from the bottom edge.`;
  if (pose === 'stall') return `Use the attached images as the exact reference for this man. Same bald head, short dark beard, face, skin and build as the wardrobe image. Keep him identical.

Waist-up image of this same man leaning forward over his rug counter, body turned slightly to the viewer's right, head in three-quarter view, focused merchant's look, both forearms resting forward at the bottom edge of the frame with hands open, as if presenting a rug. Do not draw the counter or the rug.

He wears ONLY the same plain off-white short-sleeved cotton undershirt. No vest, no jewellery, no props.

Background: fully transparent (PNG with alpha).
Style: ${STYLE}.
Canvas: portrait 1024x1536. Head in the upper third, body cut off by the bottom edge at the waist.`;
  return `Use the attached images as the exact reference for this man. Same bald head, short dark beard, face, skin and build. Keep him identical.

Head-and-shoulders portrait of this same man facing the viewer, shoulders square, steady confident merchant's look, like a portrait in an auction catalogue.

He wears ONLY the same plain off-white cotton undershirt. No jewellery, no props.

Background: fully transparent (PNG with alpha).
Style: ${STYLE}.
Canvas: square 1024x1024. Top of head 90px from the top edge, shoulders cut off by the bottom edge.`;
}

function fitHint(p: Piece, pose: Pose) {
  if (p.slot === 'head') return 'sitting on his bald head at the right size and angle for this head';
  if (p.slot === 'top' || p.slot === 'outer') return 'worn on his body, following his shoulders, arms and torso exactly, sleeves covering his arms to the right length';
  if (p.slot === 'legs') return 'worn on his legs, following his hips and legs exactly';
  if (p.slot === 'feet') return 'worn on his feet, matching their exact position';
  return pose === 'profile' ? 'placed exactly where it would sit on him in this frame' : 'placed exactly where it would sit on him in this pose';
}

/** Hats are drawn on their own; everything else is drawn ON the base body so it follows his real pose. */
export const drawnOnBody = (p: Piece) => p.slot !== 'head';

function dressVerb(p: Piece) {
  if (p.slot === 'legs') return `Replace his plain drawers with: ${p.looks}. The trousers cover his legs down to the ankle as they are, feet stay bare`;
  if (p.slot === 'feet') return `Put on his bare feet: ${p.looks}, exactly where his feet are now`;
  if (p.slot === 'top') return `Dress him in: ${p.looks}, worn over his plain undershirt`;
  if (p.slot === 'outer') return `Put on him, over what he wears now: ${p.looks}`;
  return `Add to him: ${p.looks}`;
}

/** Prompt that dresses the attached base picture; tools/dress-extract.py then cuts the new piece out. */
export function dressPrompt(p: Piece, pose: Pose): string {
  const info = POSE_INFO[pose];
  return `Edit the attached image. ${dressVerb(p)}.

Keep EVERYTHING else exactly as it is: his face, bald head, beard, skin, body shape, pose, the position of his arms, hands, legs and feet, the canvas size and where he stands on it. Do not move, turn, resize or re-pose him.
The piece follows his real body: sleeves run down his arms exactly as they hang now, hems fall where his legs are.
Add nothing else: no hat, no other clothing, no jewellery, no props, no background.

Background: fully transparent (PNG with alpha). If that is not possible, plain flat black.
Style: ${STYLE}.
Canvas: ${info.w}x${info.h}.`;
}

export function piecePrompt(p: Piece, pose: Pose): string {
  if (drawnOnBody(p)) return dressPrompt(p, pose);
  const info = POSE_INFO[pose];
  return `The attached image is a template: a man in plain underclothes, ${info.frame}, on a ${info.w}x${info.h} canvas.

Draw ONLY this item: ${p.looks}.
It must be ${fitHint(p, pose)}, lining up with the template pixel for pixel: same canvas size, same position, same scale, same pose.

Do NOT draw the man: no face, no skin, no hands, no undershirt, no body. Where his body would show through, leave it transparent. The item is the only thing in the image.
Where the item would be hidden behind his arm or hand, leave that part out.

Background: fully transparent (PNG with alpha). No shadow on the ground.
Style: ${STYLE}.
Canvas: ${info.w}x${info.h}.`;
}

/** The dressing room behind the hero in the wardrobe screen. Save as public/art/hero/wardrobe-room.jpg */
export const ROOM_PROMPT = `A painted background for a character wardrobe screen in a game: a 1920s Cairo merchant's dressing room, seen straight on from standing height.

Centre of the picture: an EMPTY open space of bare floor where a man will be placed later. Nothing in the middle third: no furniture, no people, no mannequin.
Around it: a tall carved wooden wardrobe with its doors open and garments hanging inside (galabiyas, a frock coat, a kaftan) on the left; a tall standing mirror in a gilded frame and a brass hat stand holding a red tarboosh and a white turban on the right; a mashrabiya lattice window behind, letting in warm late-afternoon light in soft shafts; a worn Persian rug on a tiled floor in the lower third; a low shelf with folded scarves, a pair of leather slippers and a small brass oil lamp.

Mood: warm, quiet, lived-in, golden light, deep shadows at the edges so a figure in the centre stands out. Slightly soft focus on the background details.
No people. No text. No logo.
Style: Orientalist oil painting, warm golden light from the upper left, the same painting style as the attached image.
Canvas: portrait 1024x1536.`;
