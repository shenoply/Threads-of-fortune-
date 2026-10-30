// Small engraved badges: a brass figure cut into a dark lacquered field, set in a brass rim.
// Epithets are worn on a shield, the tempers of other people on a round medallion, the merchant's
// ranks on an eight-pointed seal. Every figure is drawn here on a 48 x 48 grid, centred on 24,24.
import { useId, type ReactNode } from 'react';
import type { EmblemId } from '../../data/epithets';

const B = 'var(--em-fig, #f0c96a)';
const K = 'var(--em-cut, #1a0f07)';

/** stroke-drawn figure: the line itself is the engraving */
const L = (d: string, w = 2.4) => <path d={d} fill="none" stroke={B} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
/** filled figure */
const F = (d: string) => <path d={d} fill={B} />;

const FIG: Record<EmblemId, ReactNode> = {
  scales: <>{L('M24 12 V35 M14 17 H34 M19 35 H29')}{L('M14 17 L10.5 26 M14 17 L17.5 26 M34 17 L30.5 26 M34 17 L37.5 26', 1.4)}{F('M9.5 26 H18.5 A4.5 3.4 0 0 1 9.5 26 Z M29.5 26 H38.5 A4.5 3.4 0 0 1 29.5 26 Z')}<circle cx="24" cy="12" r="2" fill={B} /></>,
  fox: <>{F('M12 13 L19.5 20 Q24 18.5 28.5 20 L36 13 L35 25 Q31 31 24 36 Q17 31 13 25 Z')}<path d="M18 25.5 L21.5 26.5 M30 25.5 L26.5 26.5" stroke={K} strokeWidth="1.8" strokeLinecap="round" /><path d="M22.2 32 L24 33.8 L25.8 32 Z" fill={K} /></>,
  hand: <>{L('M18 23 V13.5 M22 22 V11 M26 22 V11.5 M30 23 V14.5 M15.5 27 L12 21.5', 3)}{F('M15 22 H32.5 V27 Q32 35.5 24 36.5 Q16 35.5 15 27 Z')}</>,
  stone: <>{F('M24 36 C11 27.5 11 15 18.5 15 C21.8 15 23.4 17.4 24 19 C24.6 17.4 26.2 15 29.5 15 C37 15 37 27.5 24 36 Z')}<path d="M24 19 L21 24.5 L26.5 27.5 L22.8 33" fill="none" stroke={K} strokeWidth="1.8" strokeLinejoin="round" /></>,
  coins: <>{[31, 26, 21].map((y) => <g key={y}><path d={`M13 ${y} V${y + 3} A9 3.2 0 0 0 31 ${y + 3} V${y}`} fill={B} /><ellipse cx="22" cy={y} rx="9" ry="3.2" fill={B} stroke={K} strokeWidth="1" /></g>)}<circle cx="32.5" cy="16" r="5.5" fill={B} stroke={K} strokeWidth="1" /><circle cx="32.5" cy="16" r="2.4" fill="none" stroke={K} strokeWidth="1" /></>,
  rose: <>{L('M24 25 V37 M24 31 Q19 30 17.5 27 M24 33 Q29 32.5 30.5 29.5', 2)}{F('M24 11 C29 11 32 14.5 31 19 C30 23.5 27 25.5 24 25.5 C21 25.5 18 23.5 17 19 C16 14.5 19 11 24 11 Z')}<path d="M24 14.5 C21.5 15.5 20.8 18.5 22.5 20 C24 21.3 26.6 20.5 26.8 18.2 M20 17.5 Q19.5 22 24 23 Q28.5 22 28 17" fill="none" stroke={K} strokeWidth="1.3" strokeLinecap="round" /></>,
  dalla: <>{F('M19 20 Q15 28 16.5 34 H29.5 Q31 28 27 20 Z')}{F('M20 20 Q20.5 16 23 15.2 Q25.5 16 26 20 Z')}{F('M22 12.5 L23 9.5 L24 12.5 Z')}<rect x="21.6" y="12.4" width="2.8" height="3" fill={B} />{L('M18.8 23 Q12 21 10.5 15.5', 2.4)}{L('M27.5 21.5 Q33 22 32 28.5', 1.8)}<path d="M17.5 30.5 H28.5" stroke={K} strokeWidth="1.2" /></>,
  staves: <>{L('M14 35 L34 13 M14 13 L34 35', 3)}<circle cx="34.5" cy="12.5" r="3.2" fill={B} /><circle cx="13.5" cy="12.5" r="3.2" fill={B} /></>,
  fist: <>{F('M15 21 Q15 17.5 18 17.5 H31 Q34 17.5 34 21 V29 Q34 35 28 36 H21 Q15 35 15 29 Z')}<path d="M18.5 17.5 V23 M22.5 17.5 V23 M26.5 17.5 V23 M30.5 17.5 V23 M15 24.5 H26 Q28 24.5 28 27 Q28 29 25.5 29 H20" fill="none" stroke={K} strokeWidth="1.4" strokeLinecap="round" />{L('M20 36 V39.5 M28 36 V39.5', 2)}</>,
  rifles: <>{L('M12.5 36.5 L35 11 M35.5 36.5 L13 11', 2.2)}{F('M10 33.5 L15.5 39.5 L18.5 36 L14.5 31.5 Z M38 33.5 L32.5 39.5 L29.5 36 L33.5 31.5 Z')}<circle cx="24" cy="23.7" r="2.2" fill={B} /></>,
  shackles: <>{L('M20.5 19 A6 6 0 1 0 20.5 31 A6 6 0 1 0 20.5 19 Z', 2.6)}{L('M27.5 19 A6 6 0 1 0 27.5 31 A6 6 0 1 0 27.5 19 Z', 2.6)}{L('M11 13 L14.5 19.5 M37 13 L33.5 19.5', 2)}</>,
  star: <>{F('M24 9 L27.4 16 L35 14 L32 21 L39 24 L32 27 L35 34 L27.4 32 L24 39 L20.6 32 L13 34 L16 27 L9 24 L16 21 L13 14 L20.6 16 Z')}<circle cx="24" cy="24" r="3.6" fill={K} /></>,
  eye: <>{F('M9 24 Q24 10 39 24 Q24 38 9 24 Z')}<circle cx="24" cy="24" r="6" fill={K} /><circle cx="24" cy="24" r="2.8" fill={B} />{L('M24 9.5 V12.5 M15 12 L16.8 14.5 M33 12 L31.2 14.5', 1.6)}</>,
  palm: <>{L('M24 38 Q23 29 24.5 20', 2.8)}{L('M24.5 20 Q17 14.5 10.5 19 M24.5 20 Q20 12 13.5 11.5 M24.5 20 Q26 11.5 33 10.5 M24.5 20 Q31 15 37.5 19 M24.5 20 Q30 22 33 28 M24.5 20 Q18 22 15 28', 2)}<circle cx="22.5" cy="23" r="1.4" fill={B} /><circle cx="26.5" cy="23" r="1.4" fill={B} /></>,
  flame: <>{F('M24 9 C27 15 33 18 33 26 C33 32.5 29 37 24 37 C19 37 15 32.5 15 26.5 C15 21.5 18 19.5 19.5 16 C21 19.5 21.5 21 22.5 22 C23.5 18 23 13 24 9 Z')}<path d="M24 36 C21 36 19.5 33.5 20 31 C20.6 28.5 23 27.5 23.5 25 C26 27.5 28.5 29.5 28 32 C27.6 34.5 26 36 24 36 Z" fill={K} /></>,
  anchor: <>{L('M24 15 V37 M17 20.5 H31 M12.5 28 Q14 36.5 24 37 Q34 36.5 35.5 28', 2.6)}{L('M24 10 A2.8 2.8 0 1 0 24 15.6 A2.8 2.8 0 1 0 24 10 Z', 2)}{F('M10 27 L15 26 L12.5 31 Z M38 27 L33 26 L35.5 31 Z')}</>,
  hourglass: <>{L('M15 11 H33 M15 37 H33', 2.6)}{L('M17 11 Q17 20 24 24 Q31 20 31 11 M17 37 Q17 28 24 24 Q31 28 31 37', 2)}{F('M19.5 15.5 H28.5 Q27.5 20 24 22 Q20.5 20 19.5 15.5 Z M18.6 35.5 Q20 30 24 28.5 Q28 30 29.4 35.5 Z')}</>,
  dagger: <>{F('M23 21 Q22 30 26.5 36.5 Q29 38.5 30.5 37 Q26 31.5 26.5 21 Z')}<rect x="18" y="18.5" width="12" height="3" rx="1.4" fill={B} />{F('M22.4 10 H25.6 L25.2 18.5 H22.8 Z')}<circle cx="24" cy="9.5" r="2" fill={B} /></>,
  gate: <>{F('M13 37 V22 Q13 11 24 10 Q35 11 35 22 V37 Z')}<path d="M18 37 V23.5 Q18 16 24 15.3 Q30 16 30 23.5 V37 Z" fill={K} />{L('M24 15.5 V37', 1.4)}<circle cx="22" cy="27" r="1" fill={B} /><circle cx="26" cy="27" r="1" fill={B} /></>,
  lock: <>{L('M17.5 22 V17.5 Q17.5 11 24 11 Q30.5 11 30.5 17.5 V22', 2.8)}<rect x="13.5" y="21" width="21" height="16" rx="2.6" fill={B} /><circle cx="24" cy="27.5" r="2.4" fill={K} /><path d="M23 28.5 H25 L25.6 33 H22.4 Z" fill={K} /></>,
  cat: <>{F('M12.5 11 L19 18 Q24 16.5 29 18 L35.5 11 L36 24 Q36 35 24 36.5 Q12 35 12 24 Z')}<path d="M17.5 24 Q19.5 22.2 21.5 24 M26.5 24 Q28.5 22.2 30.5 24" fill="none" stroke={K} strokeWidth="1.8" strokeLinecap="round" /><path d="M22.5 28.5 H25.5 L24 30.2 Z M24 30.2 V31.5 M8 27 L18 28.5 M8 31.5 L18 30.5 M40 27 L30 28.5 M40 31.5 L30 30.5" fill={K} stroke={K} strokeWidth="1" strokeLinecap="round" /></>,
  beads: <>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => { const a = (i / 11) * Math.PI * 2 - Math.PI / 2 + 0.28; return <circle key={i} cx={24 + Math.cos(a) * 10} cy={20 + Math.sin(a) * 10} r="2.3" fill={B} />; })}{L('M24 30 V34', 1.6)}<circle cx="24" cy="31" r="2.6" fill={B} />{F('M22 34 H26 L27.5 40 H20.5 Z')}</>,
  awning: <>{F('M10 19 L14 12 H34 L38 19 Z')}<path d="M10 19 Q12.3 22.5 14.7 19 Q17 22.5 19.3 19 Q21.7 22.5 24 19 Q26.3 22.5 28.7 19 Q31 22.5 33.3 19 Q35.7 22.5 38 19" fill={B} />{L('M13 20 V37 M35 20 V37 M10 37 H38', 2.2)}<rect x="17" y="28" width="14" height="5" rx="1" fill={B} /></>,
  carpet: <>{F('M12 13 H32 V35 H12 Z')}<path d="M15 16 H29 V32 H15 Z M22 19 L26 24 L22 29 L18 24 Z" fill="none" stroke={K} strokeWidth="1.4" /><ellipse cx="34" cy="24" rx="3.6" ry="11" fill={B} stroke={K} strokeWidth="1.2" /><path d="M12 13 V10 M15 13 V10 M18 13 V10 M12 35 V38 M15 35 V38 M18 35 V38" stroke={B} strokeWidth="1.3" /></>,
  arch: <>{F('M10 38 V20 Q10 9 24 8 Q38 9 38 20 V38 H33 V22 Q33 14 24 13.4 Q15 14 15 22 V38 Z')}{F('M18 38 V25 Q18 19 24 18.6 Q30 19 30 25 V38 H27 V26 Q27 22.5 24 22.2 Q21 22.5 21 26 V38 Z')}{L('M8 38 H40', 2.2)}</>,
  compass: <>{L('M24 10 A14 14 0 1 0 24 38 A14 14 0 1 0 24 10 Z', 1.6)}{F('M24 8 L26.6 21.4 L40 24 L26.6 26.6 L24 40 L21.4 26.6 L8 24 L21.4 21.4 Z')}<path d="M24 8 L26.6 21.4 L24 24 Z M40 24 L26.6 26.6 L24 24 Z M24 40 L21.4 26.6 L24 24 Z M8 24 L21.4 21.4 L24 24 Z" fill={K} opacity="0.55" /></>,
  crown: <>{F('M11 33 L9 16 L17 23 L24 12 L31 23 L39 16 L37 33 Z')}<rect x="11" y="34.5" width="26" height="3.6" rx="1.2" fill={B} /><circle cx="24" cy="11" r="2.2" fill={B} /><circle cx="9" cy="15" r="1.8" fill={B} /><circle cx="39" cy="15" r="1.8" fill={B} /><circle cx="17.5" cy="28.5" r="1.7" fill={K} /><circle cx="24" cy="28.5" r="2" fill={K} /><circle cx="30.5" cy="28.5" r="1.7" fill={K} /></>,
};

export type EmblemShape = 'shield' | 'round' | 'seal';

/** The outline of each kind of badge, on a 48 x 52 grid. */
const RIM: Record<EmblemShape, string> = {
  shield: 'M24 1.5 L45 7.5 V25 C45 39.5 35 47.5 24 51 C13 47.5 3 39.5 3 25 V7.5 Z',
  round: 'M24 2 A24 24 0 1 1 23.99 2 Z',
  seal: 'M24 1.5 L31.2 7.8 L40.8 8 L41 17.6 L47 25 L41 32.4 L40.8 42 L31.2 42.2 L24 48.5 L16.8 42.2 L7.2 42 L7 32.4 L1 25 L7 17.6 L7.2 8 L16.8 7.8 Z',
};
const INNER: Record<EmblemShape, string> = {
  shield: 'M24 6 L41 11 V25 C41 37 33 43.5 24 46.5 C15 43.5 7 37 7 25 V11 Z',
  round: 'M24 6.5 A19.5 19.5 0 1 1 23.99 6.5 Z',
  seal: 'M24 6.5 L29.6 11.4 L37 11.6 L37.2 19 L42 25 L37.2 31 L37 38.4 L29.6 38.6 L24 43.5 L18.4 38.6 L11 38.4 L10.8 31 L6 25 L10.8 19 L11 11.6 L18.4 11.4 Z',
};

/** A badge. `dim` draws it unearned: the figure faint, the brass gone dull. */
export function Emblem({ id, shape = 'shield', size = 40, dim = false, title, className = '' }: {
  id: EmblemId; shape?: EmblemShape; size?: number; dim?: boolean; title?: string; className?: string;
}) {
  const u = useId().replace(/:/g, '');
  const rim = `em-r${u}`, field = `em-f${u}`;
  return (
    <svg className={`emblem em-${shape} ${dim ? 'dim' : ''} ${className}`} width={size} height={(size * 52) / 48} viewBox="0 0 48 52" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={dim ? '#8a7c66' : '#fbe3a0'} />
          <stop offset="0.45" stopColor={dim ? '#5e5244' : '#c8922e'} />
          <stop offset="1" stopColor={dim ? '#3c342b' : '#7a4f16'} />
        </linearGradient>
        <radialGradient id={field} cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor={dim ? '#3a332c' : shape === 'round' ? '#3b2615' : '#23314a'} />
          <stop offset="1" stopColor={dim ? '#1d1915' : shape === 'round' ? '#160d06' : '#0e1524'} />
        </radialGradient>
      </defs>
      <path d={RIM[shape]} fill={`url(#${rim})`} stroke="#3a240b" strokeWidth="1" />
      <path d={INNER[shape]} fill={`url(#${field})`} stroke="#2a1806" strokeWidth="0.8" />
      <path d={INNER[shape]} fill="none" stroke={dim ? '#6b5f50' : '#e2b65a'} strokeWidth="0.7" strokeDasharray="1.2 1.6" opacity="0.7" transform="translate(24 25) scale(0.9) translate(-24 -25)" />
      {/* the figure, cut in: a dark shadow first, then the brass */}
      <g transform="translate(24 25) scale(0.62) translate(-24 -24)" style={{ ['--em-fig' as string]: '#0a0603', ['--em-cut' as string]: '#0a0603' }} opacity="0.7">
        <g transform="translate(0.9 1.1)">{FIG[id]}</g>
      </g>
      <g transform="translate(24 25) scale(0.62) translate(-24 -24)" style={dim ? { ['--em-fig' as string]: '#857864' } : undefined}>{FIG[id]}</g>
    </svg>
  );
}
