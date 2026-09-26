import { SETTLEMENTS } from '../src/data/world';
import { isWaterPx, findPath, pathLength, PX_PER_DAY, settlementById } from '../src/game/systems/world';
for (const s of SETTLEMENTS) if (isWaterPx(s)) console.log('ON WATER', s.id);
const g = settlementById('giza');
for (const s of SETTLEMENTS) { const p = findPath(g, s); console.log(s.id.padEnd(11), p ? (pathLength(p)/PX_PER_DAY).toFixed(1)+' days, '+p.length+' pts' : 'UNREACHABLE'); }
let t=Date.now(); for(let i=0;i<20;i++) findPath(g, settlementById('istanbul')); console.log('ms per path', (Date.now()-t)/20);
