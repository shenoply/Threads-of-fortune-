import { isWaterPx } from '../src/game/systems/world';
for (const [n,x0,y0] of [['sinai',500,452],['beirut',532,222]] as const) {
  const land=[]; for (let dx=-30;dx<=30;dx+=5) for (let dy=-30;dy<=30;dy+=5) if(!isWaterPx({x:x0+dx,y:y0+dy})) land.push([dx,dy,Math.abs(dx)+Math.abs(dy)]);
  land.sort((a,b)=>a[2]-b[2]); console.log(n, land.slice(0,4));
}
