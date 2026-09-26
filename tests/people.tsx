import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { PersonCameo, PersonBack } from '../src/components/People/Person';
import { PEOPLE } from '../src/data/people';
const bg = 'file:///home/claude/tof/public/art/stall-samira.jpg';
const html = `<html><body style="background:#2a1d12;display:flex;flex-wrap:wrap;gap:12px;padding:10px;font:12px sans-serif;color:#eee">
${Object.entries(PEOPLE).map(([id, s]) => `<div style="text-align:center">${renderToStaticMarkup(<PersonCameo spec={s} size={110} />)}<br>${id}</div>`).join('')}
${Object.entries(PEOPLE).slice(1, 3).map(([id, s]) => `<div style="position:relative;width:390px;height:190px;overflow:hidden;background:url(${bg}) -40px 0/auto 190px">${renderToStaticMarkup(<PersonBack spec={s} className="x" />).replace('<svg', '<svg style="position:absolute;right:-5%;bottom:-3%;height:94%"')}</div>`).join('')}
</body></html>`;
writeFileSync('/tmp/claude-0/plates/people.html', html);
