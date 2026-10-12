// tests/ is outside tsconfig's include, so tsx compiles this JSX the classic way: React must be in scope
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.env.SHOTS ?? '/dev/shm/tests-shots'; mkdirSync(OUT, { recursive: true });
void React;
import { AnimalPlate } from '../src/components/World/AnimalPlate';
import { BREEDS } from '../src/data/animals';
const html = `<html><body style="background:#222;display:flex;flex-wrap:wrap;gap:10px;padding:10px">${Object.values(BREEDS).map((b) => `<div style="color:#eee;font:14px sans-serif">${renderToStaticMarkup(<AnimalPlate breed={b} size={460} />)}<br>${b.name}</div>`).join('')}</body></html>`;
writeFileSync(`${OUT}/plates.html`, html); console.log('wrote', `${OUT}/plates.html`);
