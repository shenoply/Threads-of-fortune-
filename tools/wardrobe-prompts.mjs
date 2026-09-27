// Writes HERO_WARDROBE_PROMPTS.md from src/data/wardrobe.ts: the base-body prompts, then one
// prompt per piece per pose, ready to paste into ChatGPT.
// Run: node tools/wardrobe-prompts.mjs
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'wp-'));
const out = join(dir, 'wardrobe.mjs');
await build({ stdin: { contents: "export * from './src/data/wardrobe'; export * from './src/data/wardrobePrompts';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', outfile: out, logLevel: 'silent' });
const W = await import(pathToFileURL(out).href);
const { PIECES, PIECE_ORDER, SLOTS, POSES, POSE_INFO, basePrompt, piecePrompt, BASE_ATTACH, ROOM_PROMPT, drawnOnBody } = W;

const piastres = (n) => (n >= 100 ? `£E${(n / 100).toFixed(n % 100 ? 2 : 0)} (${n} PT)` : `${n} PT`);

let md = `# Hero Wardrobe: ChatGPT Prompts

Generated from the game's catalogue (src/data/wardrobe.ts). ${PIECE_ORDER.length} pieces.

## How to use
1. **Base bodies first (Part 1).** Already done: the three are in the game.
2. **Hats** are drawn on their own: attach the pose's base image once at the start of the chat, then one prompt per message.
3. **Everything else (shirts, robes, coats, trousers, shoes, extras, arms, bags) is drawn ON the hero.** Attach the pose's base image **with every one of these prompts**, so ChatGPT edits that picture and dresses him in the piece. The sleeves then follow his real arms. Claude cuts the piece out afterwards (tools/dress-extract.py).
4. Send each image back to Claude in the chat. Backgrounds, sizes and small shifts are fixed on this side, so don't worry about them.
5. **One piece per image.** No sheets, grids or full outfits.

Legs, shoes, canes, holstered pistols and bags only appear in the Wardrobe pose (the counter hides them at the stall, and the profile frame cuts them off). The file skips prompts that aren't needed.

---

# Part 1: Base bodies

`;
for (const pose of POSES) {
  md += `### ${POSE_INFO[pose].label} base → \`public/art/hero/hero-base-${pose}.png\`\n**Attach:** ${BASE_ATTACH[pose]}\n\n\`\`\`\n${basePrompt(pose)}\n\`\`\`\n\n`;
}

md += `### Wardrobe background → \`public/art/hero/wardrobe-room.jpg\`\n**Attach:** stall-seller.jpg (for the painting style only)\n\n\`\`\`\n${ROOM_PROMPT}\n\`\`\`\n\n`;
md += `---\n\n# Part 2: Pieces\n\n`;
for (const pose of POSES) {
  const items = PIECE_ORDER.map((id) => PIECES[id]).filter((p) => p.poses.includes(pose));
  md += `## ${POSE_INFO[pose].label} chat (${items.length} pieces) → folder \`public/art/hero/${pose}/\`\n**Attach once at the start:** hero-base-${pose}.png\n\n`;
  for (const s of SLOTS) {
    const group = items.filter((p) => p.slot === s.id);
    if (!group.length) continue;
    md += `### ${s.label}\n\n`;
    for (const p of group) {
      md += `#### ${p.name} · ${piastres(p.price)} → \`${p.id}.png\`${drawnOnBody(p) ? ' · *attach hero-base-' + pose + '.png with this one*' : ''}\n\`\`\`\n${piecePrompt(p, pose)}\n\`\`\`\n\n`;
    }
  }
  md += `---\n\n`;
}

md += `# Price list\n\n| Piece | Slot | Price | Charisma | Sold in |\n|---|---|---|---|---|\n`;
for (const id of PIECE_ORDER) {
  const p = PIECES[id];
  md += `| ${p.name} | ${SLOTS.find((s) => s.id === p.slot).label} | ${piastres(p.price)} | +${p.charisma} | ${p.where.length ? p.where.join(', ') : 'any market'} |\n`;
}

writeFileSync('HERO_WARDROBE_PROMPTS.md', md);
const count = POSES.reduce((n, pose) => n + PIECE_ORDER.filter((id) => PIECES[id].poses.includes(pose)).length, 0);
console.log(`HERO_WARDROBE_PROMPTS.md: 3 base + ${count} piece prompts`);
