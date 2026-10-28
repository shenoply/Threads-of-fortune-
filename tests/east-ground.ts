// The baked ground east of the painting matches persiaMap.ts (rebuild with tools/build-east-ground.ts).
//   npx tsx tests/east-ground.ts
import { eastGround } from '../src/data/persiaMap';
import { EAST_ROWS } from '../src/data/eastGround';
import { MASK_W, CELL } from '../src/data/landmask';
let bad = 0;
EAST_ROWS.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] !== eastGround({ x: (MASK_W + i) * CELL + CELL / 2, y: y * CELL + CELL / 2 })) bad++; });
console.log(bad ? `FAIL ${bad} cells differ: run npx tsx tools/build-east-ground.ts` : 'ALL OK'); process.exit(bad ? 1 : 0);
