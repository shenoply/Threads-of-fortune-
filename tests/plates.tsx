import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { AnimalPlate } from '../src/components/World/AnimalPlate';
import { BREEDS } from '../src/data/animals';
const html = `<html><body style="background:#222;display:flex;flex-wrap:wrap;gap:10px;padding:10px">${Object.values(BREEDS).map((b) => `<div style="color:#eee;font:14px sans-serif">${renderToStaticMarkup(<AnimalPlate breed={b} size={460} />)}<br>${b.name}</div>`).join('')}</body></html>`;
writeFileSync('/tmp/claude-0/plates/plates.html', html);
