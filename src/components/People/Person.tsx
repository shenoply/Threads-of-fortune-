// Illustrated people: a painted-style bust in three-quarter view, facing left (toward the seller).
// Each spec picks skin, age, headwear, hair, facial hair and clothes, so buyers and townsfolk look different.
// If a painted portrait is dropped into art/portraits/<id>.png it is used instead.
import { useState } from 'react';

export type Headwear = 'fez' | 'tarha' | 'turban' | 'keffiyeh' | 'hat' | 'cowl' | 'bare' | 'kufi';
export type Clothes = 'suit' | 'galabiya' | 'dress' | 'melaya' | 'abaya' | 'uniform' | 'vest' | 'robe';

export interface PersonSpec {
  skin: string;
  hair: string;
  age: number; // 18..75
  female?: boolean;
  head: Headwear;
  headColor?: string;
  headColor2?: string;
  clothes: Clothes;
  cloth: string;
  cloth2?: string;
  moustache?: 'thick' | 'thin' | 'none';
  beard?: 'full' | 'short' | 'stubble' | 'none';
  glasses?: boolean;
  earrings?: boolean;
  kohl?: boolean;
  face?: 'round' | 'long' | 'square';
  smile?: number; // -1..1
  brow?: number; // raise
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
};

let uid = 0;

export function PersonArt({ spec, className, style, id }: { spec: PersonSpec; className?: string; style?: React.CSSProperties; id?: string }) {
  const [k] = useState(() => `p${++uid}`);
  const s = spec;
  const skinD = shade(s.skin, -0.28), skinL = shade(s.skin, 0.14);
  const wide = s.face === 'round' ? 5 : s.face === 'square' ? 3 : 0;
  const long = s.face === 'long' ? 6 : 0;
  const old = Math.max(0, (s.age - 35) / 40);
  const grey = old > 0.3 ? shade(s.hair, Math.min(0.55, old * 0.6)) : s.hair;
  const hc = s.headColor ?? '#8e2a1c';
  const hc2 = s.headColor2 ?? shade(hc, -0.3);
  const smile = s.smile ?? 0.15;

  // Head outline, three-quarter left
  const head = `M${72 - wide} 72 C${70 - wide} 38 ${134 + wide} 34 ${140 + wide} 74 C${145 + wide} 100 ${141 + wide} ${128 + long} ${126 + wide * 0.5} ${150 + long} C${114} ${166 + long} ${94} ${170 + long} ${82} ${161 + long} C${71 - wide * 0.5} ${152 + long} ${65 - wide} ${138 + long} ${64 - wide} ${124 + long * 0.5} C${62 - wide} 112 ${60 - wide} 104 ${62 - wide} 96 C${64 - wide} 86 ${67 - wide} 78 ${72 - wide} 72 Z`;
  const chinY = 162 + long;

  // Torso and clothes
  const torso = 'M4 262 C8 222 34 200 70 192 L104 186 L140 192 C172 200 194 222 198 262 Z';
  let clothes: JSX.Element;
  switch (s.clothes) {
    case 'suit':
      clothes = (
        <g>
          <path d={torso} fill={s.cloth} />
          <path d="M84 188 L104 238 L122 188 Z" fill="#efe8da" />
          <path d="M100 196 L108 196 L112 250 L104 258 L96 250 Z" fill={s.cloth2 ?? '#7a2020'} />
          <path d="M70 192 L104 262 L60 262 L52 214 Z" fill={shade(s.cloth, -0.18)} />
          <path d="M140 192 L104 262 L150 262 L158 214 Z" fill={shade(s.cloth, -0.3)} />
          <path d="M82 188 L98 226 L90 232 L70 196 Z M124 188 L110 226 L118 232 L138 196 Z" fill={shade(s.cloth, 0.08)} />
          <circle cx="128" cy="240" r="2" fill="#c9974a" />
          <path d="M60 222 l14 -2" stroke="#efe8da" strokeWidth="3" />
        </g>
      );
      break;
    case 'galabiya':
      clothes = (
        <g>
          <path d={torso} fill={s.cloth} />
          <path d="M88 188 Q104 214 120 188 L116 238 L92 238 Z" fill={shade(s.cloth, -0.2)} />
          <path d="M104 196 L104 240" stroke={shade(s.cloth, -0.35)} strokeWidth="1.5" />
          {[204, 214, 224].map((y) => <circle key={y} cx="104" cy={y} r="1.6" fill={shade(s.cloth, -0.45)} />)}
          <path d="M40 210 C60 226 70 250 72 262 M170 210 C150 226 140 250 138 262" stroke={shade(s.cloth, -0.18)} strokeWidth="2" fill="none" />
        </g>
      );
      break;
    case 'vest':
      clothes = (
        <g>
          <path d={torso} fill={s.cloth2 ?? '#e9dfc8'} />
          <path d="M70 192 L96 262 L20 262 C22 232 40 208 70 192 Z M140 192 L112 262 L186 262 C184 232 168 208 140 192 Z" fill={s.cloth} />
          <path d="M92 188 Q104 206 116 188" stroke={shade(s.cloth2 ?? '#e9dfc8', -0.2)} strokeWidth="2" fill="none" />
          <path d="M70 192 L96 262 M140 192 L112 262" stroke="#c9974a" strokeWidth="1.5" />
        </g>
      );
      break;
    case 'uniform':
      clothes = (
        <g>
          <path d={torso} fill={s.cloth} />
          <path d="M84 188 L104 206 L124 188 L124 196 L104 214 L84 196 Z" fill={shade(s.cloth, -0.25)} />
          {[218, 234, 250].map((y) => <circle key={y} cx="104" cy={y} r="2.4" fill="#d8b25a" />)}
          <path d="M40 206 L70 200 L70 208 L42 214 Z M168 206 L138 200 L138 208 L166 214 Z" fill="#d8b25a" opacity="0.8" />
          <path d="M60 230 L150 250" stroke="#5a3a1c" strokeWidth="5" />
        </g>
      );
      break;
    case 'melaya':
    case 'abaya':
    case 'robe':
      clothes = (
        <g>
          <path d={torso} fill={s.cloth} />
          <path d="M90 188 Q104 200 118 188 L114 262 L94 262 Z" fill={s.cloth2 ?? shade(s.cloth, 0.12)} />
          <path d="M30 230 C50 212 70 204 88 200 M178 230 C160 212 140 204 120 200" stroke={shade(s.cloth, 0.2)} strokeWidth="2" fill="none" opacity="0.6" />
          {s.clothes === 'robe' && <path d="M88 200 L80 262 M120 200 L128 262" stroke="#c9974a" strokeWidth="2.5" />}
        </g>
      );
      break;
    default: // dress
      clothes = (
        <g>
          <path d={torso} fill={s.cloth} />
          <path d="M84 190 Q104 214 124 190" fill="none" stroke={s.cloth2 ?? '#d8b25a'} strokeWidth="4" />
          <path d="M40 216 Q104 236 168 216" fill="none" stroke={s.cloth2 ?? '#d8b25a'} strokeWidth="2" strokeDasharray="3 4" opacity="0.8" />
        </g>
      );
  }

  // Hair under headwear
  const hairBack =
    s.female && (s.head === 'bare') ? (
      <path d="M66 80 C60 30 150 26 148 86 C152 130 150 170 162 196 L112 198 C120 170 130 130 126 100 Z" fill={s.hair} />
    ) : null;
  const hairTop =
    s.head === 'bare' || s.head === 'kufi' ? (
      old > 0.7 && !s.female ? (
        <path d={`M112 60 C128 58 142 68 142 88 L138 100 C136 84 128 72 112 68 Z`} fill={grey} />
      ) : (
        <path d={`M${68 - wide} 86 C${62 - wide} 44 ${140 + wide} 36 ${143 + wide} 88 C${140 + wide} 76 ${126} 64 ${106} 64 C${92} 64 ${80} 70 ${74 - wide * 0.5} 90 Z`} fill={s.female ? s.hair : grey} />
      )
    ) : null;
  const sideburn =
    !s.female && ['fez', 'hat', 'kufi'].includes(s.head) ? (
      <path d={`M${124 + wide} 70 C${138 + wide} 70 ${144 + wide} 80 ${143 + wide} 100 C${142 + wide} 112 ${138 + wide} 122 ${134 + wide} 126 L${128 + wide} 100 C${127 + wide} 94 ${124 + wide} 90 ${122 + wide} 88 Z`} fill={grey} />
    ) : null;

  // Headwear drawn over the head
  let hat: JSX.Element | null = null;
  let hood: JSX.Element | null = null; // behind head
  let hoodD = '';
  switch (s.head) {
    case 'fez':
      hat = (
        <g>
          <path d={`M${76 - wide} 70 L${82 - wide * 0.5} 24 Q106 16 132 24 L${138 + wide * 0.5} 70 Q106 80 ${76 - wide} 70 Z`} fill={hc} />
          <path d={`M${76 - wide} 70 L${82 - wide * 0.5} 24 Q94 20 100 20 L96 76 Q84 74 ${76 - wide} 70 Z`} fill={shade(hc, 0.12)} />
          <ellipse cx="107" cy="22" rx="25" ry="5" fill={shade(hc, -0.15)} />
          <path d="M107 20 Q126 24 132 50 Q134 60 130 64" stroke="#15100c" strokeWidth="3" fill="none" />
          <path d="M128 60 l4 10 l-8 -2 Z" fill="#15100c" />
        </g>
      );
      break;
    case 'kufi':
      hat = <path d={`M${72 - wide} 70 Q72 34 106 32 Q140 34 ${142 + wide} 70 Q106 60 ${72 - wide} 70 Z`} fill={hc} stroke={shade(hc, -0.2)} strokeDasharray="2 3" />;
      break;
    case 'turban':
      hat = (
        <g>
          <path d={`M${66 - wide} 76 Q60 30 106 26 Q152 30 ${148 + wide} 76 Q128 64 106 64 Q84 64 ${66 - wide} 76 Z`} fill={hc} />
          {[40, 52, 64].map((y) => <path key={y} d={`M${70 - wide} ${y + 10} Q106 ${y - 6} ${144 + wide} ${y + 10}`} stroke={shade(hc, -0.18)} strokeWidth="2" fill="none" />)}
          {s.headColor2 && <path d={`M${80} 36 Q106 28 132 36 Q134 50 106 48 Q80 50 80 36 Z`} fill={s.headColor2} />}
        </g>
      );
      break;
    case 'hat':
      hat = (
        <g>
          <ellipse cx="106" cy="66" rx="52" ry="10" fill={hc} />
          <path d="M76 66 L80 30 Q106 22 132 30 L136 66 Z" fill={hc} />
          <path d="M78 58 L134 58 L135 64 L77 64 Z" fill={hc2} />
        </g>
      );
      break;
    case 'keffiyeh':
      hoodD = `M${56 - wide} 90 Q50 26 108 22 Q166 26 ${160 + wide} 96 Q164 150 180 200 L40 200 Q58 150 ${56 - wide} 90 Z`;
      hood = <path d={hoodD} fill={hc} />;
      hat = (
        <g>
          <path d={`M${60 - wide} 78 Q58 30 108 26 Q158 30 ${156 + wide} 80 Q134 62 108 62 Q82 62 ${60 - wide} 78 Z`} fill={hc} />
          <path d={`M${62 - wide} 66 Q108 46 ${154 + wide} 66`} stroke="#141414" strokeWidth="6" fill="none" />
          <path d={`M${64 - wide} 74 Q108 54 ${152 + wide} 74`} stroke="#141414" strokeWidth="5" fill="none" />
          {s.headColor2 && [70, 90, 110, 130].map((x) => <path key={x} d={`M${x} 34 l6 6 l-6 6 l-6 -6 Z`} fill="none" stroke={s.headColor2} strokeWidth="1.2" />)}
        </g>
      );
      break;
    case 'tarha':
    case 'cowl':
      hoodD = `M${54 - wide} 96 Q46 22 108 18 Q170 22 ${164 + wide} 100 Q168 150 196 214 L196 262 L10 262 L10 216 Q44 160 ${54 - wide} 96 Z`;
      hood = <path d={hoodD} fill={hc} />;
      hat = (
        <g>
          <path d={`M${58 - wide} 100 Q54 32 108 28 Q162 32 ${156 + wide} 96 Q150 60 108 56 Q72 58 ${66 - wide} 94 Q${62 - wide} 130 ${76} 168 Q${60 - wide} 140 ${58 - wide} 100 Z`} fill={shade(hc, 0.08)} />
          <path d={`M${66 - wide} 94 Q72 58 108 56 Q150 60 ${156 + wide} 96`} stroke={s.headColor2 ?? shade(hc, -0.25)} strokeWidth="3" fill="none" />
          {s.head === 'tarha' && s.headColor2 && (
            <path d={`M${66 - wide} 94 Q72 58 108 56 Q150 60 ${156 + wide} 96`} stroke={s.headColor2} strokeWidth="1.2" strokeDasharray="1 4" fill="none" transform="translate(0 5)" />
          )}
          <path d="M60 170 Q100 200 150 176" stroke={shade(hc, -0.2)} strokeWidth="2" fill="none" opacity="0.7" />
        </g>
      );
      break;
  }

  // Face features
  const eyeY = 104;
  const lids = s.kohl ? 2.2 : 1.3;
  const eye = (x: number, rx: number) => (
    <g>
      <path d={`M${x - rx} ${eyeY} Q${x} ${eyeY - rx * 0.8} ${x + rx} ${eyeY} Q${x} ${eyeY + rx * 0.55} ${x - rx} ${eyeY} Z`} fill="#f3eadb" />
      <circle cx={x - rx * 0.18} cy={eyeY} r={rx * 0.48} fill="#3a2414" />
      <circle cx={x - rx * 0.18} cy={eyeY} r={rx * 0.24} fill="#0e0805" />
      <circle cx={x - rx * 0.32} cy={eyeY - rx * 0.16} r={rx * 0.12} fill="#fff" opacity="0.8" />
      <path d={`M${x - rx - 1} ${eyeY + 0.5} Q${x} ${eyeY - rx * 0.95} ${x + rx + 1} ${eyeY - 0.5}`} stroke="#1a0f08" strokeWidth={lids} fill="none" strokeLinecap="round" />
      {old > 0.35 && <path d={`M${x - rx * 0.6} ${eyeY + rx * 0.9} Q${x} ${eyeY + rx * 1.2} ${x + rx * 0.7} ${eyeY + rx * 0.8}`} stroke={skinD} strokeWidth="1" fill="none" />}
    </g>
  );
  const browLift = (s.brow ?? 0) * 3;
  const browW = s.female ? 1.8 : 3.4;
  const mouthY = 146 + long * 0.6;

  const filterId = `${k}-paint`;
  return (
    <svg viewBox="0 0 200 262" className={className} style={style} role="img" aria-label={id ? `Portrait of ${id}` : 'Portrait'} preserveAspectRatio="xMidYMax meet">
      <defs>
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d0" />
          <feGaussianBlur in="d0" stdDeviation="0.45" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="8" result="big" />
          <feColorMatrix in="big" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.14  0.28 0 0 0 -0.06" result="tex" />
          <feComposite in="tex" in2="d" operator="in" result="texIn" />
          <feMerge><feMergeNode in="d" /><feMergeNode in="texIn" /></feMerge>
        </filter>
        <radialGradient id={`${k}-skin`} cx="0.32" cy="0.42" r="0.75">
          <stop offset="0" stopColor={skinL} />
          <stop offset="0.55" stopColor={s.skin} />
          <stop offset="1" stopColor={skinD} />
        </radialGradient>
        <linearGradient id={`${k}-light`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd28a" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <clipPath id={`${k}-all`}>
          <path d={torso} />
          <path d={head} />
          {hoodD && <path d={hoodD} />}
        </clipPath>
      </defs>
      <g filter={`url(#${filterId})`}>
        {hood}
        {hairBack}
        {clothes}
        <path d={`M88 ${chinY - 14} L86 196 Q104 206 124 194 L122 ${chinY - 22} Z`} fill={skinD} />
        <path d={head} fill={`url(#${k}-skin)`} />
        <ellipse cx={132 + wide} cy="112" rx="7" ry="11" fill={s.skin} />
        <path d={`M${131 + wide} 106 q3 6 0 12`} stroke={skinD} strokeWidth="1.4" fill="none" />
        {hairTop}
        {sideburn}
        {/* modelling: shadow side of the face, eye sockets, under the nose */}
        <path d={`M${118 + wide * 0.3} 80 C${134 + wide} 92 ${136 + wide} 130 ${122 + wide * 0.5} ${150 + long} C${112} ${160 + long} 100 ${164 + long} 92 ${164 + long} C${110} ${150 + long} ${122} 120 ${118 + wide * 0.3} 80 Z`} fill={skinD} opacity="0.45" />
        <ellipse cx="105" cy="102" rx="12" ry="7" fill={skinD} opacity="0.3" />
        <ellipse cx="77" cy="102" rx="8" ry="6" fill={skinD} opacity="0.25" />
        <path d="M86 134 Q92 138 98 134" stroke={skinD} strokeWidth="4" opacity="0.35" fill="none" />
        <ellipse cx="96" cy={chinY - 10} rx="10" ry="4" fill={skinL} opacity="0.35" />
        <ellipse cx="94" cy="80" rx="16" ry="8" fill={skinL} opacity="0.3" />
        {/* cheek colour and jaw shadow */}
        <ellipse cx="112" cy="130" rx="14" ry="9" fill="#c0504a" opacity={s.female ? 0.16 : 0.07} />
        <path d={`M${126 + wide * 0.5} ${150 + long} C114 ${166 + long} 94 ${170 + long} 82 ${161 + long}`} stroke={skinD} strokeWidth="3" fill="none" opacity="0.35" />
        {/* brows */}
        <path d={`M69 ${95 - browLift} Q76 ${91 - browLift} 83 ${94 - browLift}`} stroke={s.female ? shade(s.hair, -0.1) : grey} strokeWidth={browW * 0.8} fill="none" strokeLinecap="round" />
        <path d={`M95 ${93 - browLift} Q105 ${88 - browLift} 116 ${93 - browLift}`} stroke={s.female ? shade(s.hair, -0.1) : grey} strokeWidth={browW} fill="none" strokeLinecap="round" />
        {eye(77, 5.2)}
        {eye(105, 7.2)}
        {/* nose */}
        <path d={`M88 102 C88 112 82 122 78 128 C80 132 86 134 92 131`} stroke={skinD} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M84 131 q3 2 6 0" stroke="#3a2010" strokeWidth="1.6" fill="none" />
        <path d="M92 108 C94 116 94 124 93 128" stroke={skinL} strokeWidth="2" fill="none" opacity="0.5" />
        {/* mouth */}
        <path d={`M78 ${mouthY} Q88 ${mouthY + 3 + smile * 4} 100 ${mouthY - smile * 2}`} stroke="#6a2a20" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {s.female && <path d={`M80 ${mouthY + 1} Q88 ${mouthY + 7} 98 ${mouthY + 1}`} fill="#a0463c" opacity="0.7" />}
        {old > 0.25 && <path d={`M${76} ${mouthY - 12} Q72 ${mouthY - 2} 76 ${mouthY + 6}`} stroke={skinD} strokeWidth="1.2" fill="none" opacity="0.8" />}
        {old > 0.5 && <path d={`M96 ${88 - browLift} l2 -5 M102 ${87 - browLift} l1 -5`} stroke={skinD} strokeWidth="1" />}
        {/* facial hair */}
        {s.beard && s.beard !== 'none' && (
          s.beard === 'stubble' ? (
            <path d={`M${126 + wide * 0.5} ${130 + long} C${120} ${166 + long} 90 ${172 + long} 76 ${156 + long} C70 150 70 144 72 140 Q86 150 100 146 Q116 142 128 124 Z`} fill={grey} opacity="0.28" />
          ) : (
            <path d={`M${130 + wide * 0.5} ${116 + long} C${132} ${160 + long} ${110} ${(s.beard === 'full' ? 188 : 176) + long} 84 ${(s.beard === 'full' ? 180 : 170) + long} C68 170 64 152 68 140 Q84 156 100 150 Q116 146 ${124} ${128} Z`} fill={grey} />
          )
        )}
        {s.moustache && s.moustache !== 'none' && (
          <path d={s.moustache === 'thick' ? `M72 ${mouthY - 4} Q76 ${mouthY - 14} 88 ${mouthY - 12} Q100 ${mouthY - 14} 106 ${mouthY - 4} Q100 ${mouthY - 7} 90 ${mouthY - 6} Q80 ${mouthY - 7} 72 ${mouthY - 4} Z` : `M76 ${mouthY - 5} Q88 ${mouthY - 11} 102 ${mouthY - 5} Q90 ${mouthY - 7} 76 ${mouthY - 5} Z`} fill={grey} />
        )}
        {s.glasses && (
          <g stroke="#2a1a0e" strokeWidth="1.6" fill="#fff" fillOpacity="0.08">
            <circle cx="77" cy={eyeY} r="8" />
            <circle cx="106" cy={eyeY} r="10" />
            <path d="M85 102 Q90 98 96 102 M116 102 L132 106" fill="none" />
          </g>
        )}
        {s.earrings && <g><circle cx={133 + wide} cy="128" r="2.6" fill="#d8b25a" /><path d={`M${133 + wide} 131 l0 7`} stroke="#d8b25a" strokeWidth="1.6" /><circle cx={133 + wide} cy="140" r="3" fill="#d8b25a" /></g>}
        {hat}
      </g>
      <rect x="0" y="0" width="200" height="262" fill={`url(#${k}-light)`} clipPath={`url(#${k}-all)`} opacity="0.9" />
    </svg>
  );
}

/** Painted portrait if one exists in art/portraits/<id>.png, otherwise the illustration. */
export function PersonImage({ id, spec, className, style, photoStyle }: { id: string; spec: PersonSpec; className?: string; style?: React.CSSProperties; photoStyle?: React.CSSProperties }) {
  const [photo, setPhoto] = useState<boolean | null>(null);
  return (
    <>
      {photo === false && <PersonArt spec={spec} className={className} style={style} id={id} />}
      <img
        src={`art/portraits/${id}.png`}
        alt=""
        className={className}
        style={{ ...(photoStyle ?? { ...style, objectFit: 'contain', objectPosition: '50% 100%' }), display: photo ? undefined : 'none' }}
        onLoad={() => setPhoto(true)}
        onError={() => setPhoto(false)}
      />
    </>
  );
}

/**
 * Over-the-shoulder view for the stall scene: the buyer seen from behind and to the right, head turned toward
 * the seller, lit from the left. The face stays in shadow; headwear, hair, glasses, beard edge and clothes tell
 * buyers apart. This sits better in the painted scene than a drawn face.
 */
export function PersonBack({ spec, className }: { spec: PersonSpec; className?: string }) {
  const [k] = useState(() => `b${++uid}`);
  // Seen against the light: everything a little into shadow, lit only along the left edge.
  const s: PersonSpec = { ...spec, skin: shade(spec.skin, -0.42), cloth: shade(spec.cloth, -0.32), cloth2: spec.cloth2 && shade(spec.cloth2, -0.32), headColor: shade(spec.headColor ?? '#8e2a1c', -0.22), headColor2: spec.headColor2 && shade(spec.headColor2, -0.25) };
  const old = Math.max(0, (s.age - 35) / 40);
  const grey = old > 0.3 ? shade(s.hair, Math.min(0.4, old * 0.45)) : s.hair;
  const skinD = shade(s.skin, -0.35);
  const hc = s.headColor ?? '#8e2a1c';
  const body = 'M8 400 C14 318 70 268 150 258 C230 268 290 318 296 400 Z';
  const drape = 'M90 190 C84 106 214 106 210 190 C216 250 242 290 264 330 L264 400 L36 400 L36 330 C58 290 84 250 90 190 Z';
  const draped = s.head === 'tarha' || s.head === 'cowl' || s.head === 'keffiyeh';
  const cheek = (
    <g>
      <path d="M108 136 C96 150 88 176 92 200 C96 214 106 224 120 228 C110 216 104 200 103 180 C102 162 104 148 108 136 Z" fill={s.skin} />
      <path d="M108 136 C96 150 88 176 92 200 C96 214 106 224 120 228" stroke="#ffc877" strokeOpacity="0.55" strokeWidth="2.2" fill="none" />
      {s.beard && s.beard !== 'none' && s.beard !== 'stubble' && <path d={`M${s.beard === 'full' ? 91 : 94} 186 C94 214 108 ${s.beard === 'full' ? 242 : 232} 132 ${s.beard === 'full' ? 240 : 230} C118 222 108 208 106 186 Z`} fill={grey} />}
      {s.moustache === 'thick' && <path d="M90 196 q-4 4 -2 8 l8 -4 Z" fill={grey} />}
    </g>
  );
  let clothes: JSX.Element;
  switch (s.clothes) {
    case 'suit':
    case 'uniform':
      clothes = (
        <g>
          <path d={body} fill={s.cloth} />
          <path d="M150 262 L150 400" stroke={shade(s.cloth, -0.3)} strokeWidth="2" />
          <path d="M122 256 Q150 250 178 256 L180 268 Q150 262 120 268 Z" fill="#efe8da" />
          <path d="M104 266 Q150 254 196 266 L204 288 Q150 274 96 288 Z" fill={shade(s.cloth, -0.15)} />
          {s.clothes === 'uniform' && <path d="M40 300 L96 286 L96 296 L44 312 Z M260 300 L204 286 L204 296 L256 312 Z" fill="#d8b25a" opacity="0.7" />}
        </g>
      );
      break;
    case 'vest':
      clothes = (
        <g>
          <path d={body} fill={s.cloth2 ?? '#e6dcc8'} />
          <path d="M60 300 C90 280 120 270 150 268 C180 270 210 280 240 300 L250 400 L50 400 Z" fill={s.cloth} />
          <path d="M60 300 C90 280 120 270 150 268 C180 270 210 280 240 300" stroke="#c9974a" strokeWidth="2" fill="none" />
        </g>
      );
      break;
    default:
      clothes = (
        <g>
          <path d={body} fill={s.cloth} />
          <path d="M124 258 Q150 270 176 258" stroke={shade(s.cloth, -0.3)} strokeWidth="3" fill="none" />
          <path d="M70 320 C90 300 110 290 130 286 M230 320 C210 300 190 290 170 286" stroke={shade(s.cloth, 0.15)} strokeWidth="2" fill="none" opacity="0.6" />
          {s.clothes === 'dress' && s.cloth2 && <path d="M40 350 Q150 320 260 350" stroke={s.cloth2} strokeWidth="3" strokeDasharray="4 5" fill="none" />}
        </g>
      );
  }
  let head: JSX.Element;
  if (draped) {
    const c2 = s.headColor2;
    head = (
      <g>
        <path d={drape} fill={hc} />
        {s.head === 'keffiyeh' && c2 && (
          <g stroke={c2} strokeOpacity="0.55" strokeWidth="1.2" fill="none">
            {[120, 150, 180, 210, 240, 270, 300].map((y) => <path key={y} d={`M60 ${y + 40} Q150 ${y} 240 ${y + 40}`} />)}
          </g>
        )}
        {s.head === 'keffiyeh' && (
          <g fill="none" stroke="#141414">
            <ellipse cx="150" cy="128" rx="58" ry="14" strokeWidth="7" />
            <ellipse cx="150" cy="138" rx="58" ry="14" strokeWidth="6" />
          </g>
        )}
        {s.head === 'tarha' && c2 && <path d="M90 190 C84 106 214 106 210 190" stroke={c2} strokeWidth="3" fill="none" />}
        {s.head !== 'keffiyeh' && <path d="M120 150 C150 170 190 170 206 200 M110 230 C150 250 200 260 240 320" stroke={shade(hc, -0.25)} strokeWidth="3" fill="none" opacity="0.7" />}
      </g>
    );
  } else {
    head = (
      <g>
        <rect x="126" y="212" width="48" height="56" rx="12" fill={skinD} />
        <ellipse cx="150" cy="168" rx="52" ry="62" fill={old > 0.8 && s.head === 'bare' ? s.skin : shade(s.hair, old > 0.3 ? 0.06 : -0.1)} />
        <path d="M112 200 C116 214 126 226 142 232 L166 231 C182 222 194 208 198 190 C176 210 132 212 112 200 Z" fill={shade(s.skin, -0.3)} />
        <path d="M104 150 C100 130 110 118 118 112" stroke={grey} strokeWidth="6" fill="none" opacity="0.8" />
        <ellipse cx="108" cy="178" rx="7" ry="13" fill={shade(s.skin, -0.08)} />
        <path d="M101 166 C99 176 100 186 104 192" stroke="#ffc877" strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
        <path d="M105 170 q4 8 0 16" stroke={skinD} strokeWidth="1.5" fill="none" />
        <ellipse cx="104" cy="176" rx="8" ry="14" fill={s.skin} />
        <path d="M100 168 q4 8 0 16" stroke={skinD} strokeWidth="1.5" fill="none" />
        {s.glasses && <path d="M92 164 L106 170" stroke="#1e140c" strokeWidth="2.2" />}
        {s.head === 'fez' && (
          <g>
            <path d="M102 132 L112 70 Q150 62 188 70 L198 132 Q150 142 102 132 Z" fill={hc} />
            <path d="M160 66 Q192 78 194 126" stroke="#120a08" strokeWidth="3.5" fill="none" />
            <path d="M188 118 l8 16 l-12 -4 Z" fill="#120a08" />
            <ellipse cx="150" cy="68" rx="38" ry="6" fill={shade(hc, -0.2)} />
          </g>
        )}
        {s.head === 'turban' && (
          <g>
            <path d="M94 150 Q90 96 150 92 Q210 96 206 150 Q180 136 150 136 Q120 136 94 150 Z" fill={hc} />
            {[106, 120, 134].map((y) => <path key={y} d={`M98 ${y + 12} Q150 ${y - 10} 202 ${y + 12}`} stroke={shade(hc, -0.2)} strokeWidth="2.5" fill="none" />)}
          </g>
        )}
        {s.head === 'hat' && (
          <g>
            <path d="M112 124 L116 80 Q150 70 184 80 L188 124 Z" fill={hc} />
            <path d="M114 112 L186 112 L187 122 L113 122 Z" fill={s.headColor2 ?? shade(hc, -0.3)} />
            <ellipse cx="150" cy="124" rx="80" ry="15" fill={shade(hc, -0.08)} />
          </g>
        )}
        {s.head === 'kufi' && <path d="M98 150 Q96 104 150 102 Q204 104 202 150 Q150 132 98 150 Z" fill={hc} />}
      </g>
    );
  }
  const fig = (
    <g>
      {clothes}
      {head}
      {draped && (
        <g>
          <path d="M104 150 C92 166 88 186 94 204 C98 212 104 218 112 222 L114 160 Z" fill={s.skin} />
          <path d="M104 150 C92 166 88 186 94 204" stroke="#ffc877" strokeOpacity="0.5" strokeWidth="2" fill="none" />
          {s.earrings && <circle cx="108" cy="214" r="3" fill="#e0b85a" />}
          <path d="M104 150 C92 150 84 170 86 196" stroke={hc} strokeWidth="10" fill="none" />
        </g>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 300 400" className={className} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id={`${k}-dark`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ffcf86" stopOpacity="0.16" />
          <stop offset="0.28" stopColor="#0b0603" stopOpacity="0.2" />
          <stop offset="1" stopColor="#0b0603" stopOpacity="0.72" />
        </linearGradient>
        <filter id={`${k}-soft`}><feGaussianBlur stdDeviation="0.6" /></filter>
        <filter id={`${k}-white`}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
        <mask id={`${k}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="400"><g filter={`url(#${k}-white)`}>{fig}</g></mask>
      </defs>
      <g filter={`url(#${k}-soft)`}>{fig}</g>
      <rect width="300" height="400" fill={`url(#${k}-dark)`} mask={`url(#${k}-mask)`} />
      <path d={draped ? 'M36 330 C58 290 84 250 90 190 C86 132 118 110 150 108' : 'M92 200 C86 176 96 146 112 132'} fill="none" stroke="#ffc877" strokeOpacity="0.45" strokeWidth="3" />
      <path d="M8 400 C14 318 70 268 150 258" fill="none" stroke="#ffc877" strokeOpacity="0.4" strokeWidth="4" />
    </svg>
  );
}

/**
 * Silhouette cameo in profile, the way portraits were cut and framed in the period.
 * Headwear, beard, glasses and collar tell people apart; no drawn face to look cartoonish.
 */
export function PersonCameo({ spec, size = 60, className }: { spec: PersonSpec; size?: number; className?: string }) {
  const [k] = useState(() => `c${++uid}`);
  const s = spec;
  const ink = '#1d130b';
  const f = !!s.female;
  const old = s.age > 50;
  // profile facing left
  const face = f
    ? 'M64 100 C64 90 62 84 58 78 C52 78 46 76 44 72 C41 70 38 69 38 66 C37 64 39 63 37 62 C36 61 37 60 35 59 C33 58 30 57 31 55 C32 53 35 51 37 49 C38 45 38 41 41 36 C46 26 56 22 64 24 C74 26 80 36 79 48 C78 58 74 64 72 70 C70 78 72 88 76 100 Z'
    : 'M66 100 C66 92 64 86 62 80 C56 80 49 79 46 75 C43 73 40 72 39 69 C37 67 39 66 37 64 C36 63 37 62 35 61 C32 60 28 58 29 56 C31 53 35 51 37 49 C38 46 37 42 40 36 C45 26 56 21 65 23 C76 25 83 36 81 49 C80 59 76 65 74 71 C72 79 74 89 79 100 Z';
  const bust = 'M8 100 C14 90 30 84 50 84 C66 84 84 86 94 94 L96 100 Z';
  let head: JSX.Element | null = null;
  let hair: JSX.Element | null = null;
  switch (s.head) {
    case 'fez':
      head = (
        <g>
          <path d="M44 32 L47 10 Q60 6 72 10 L76 33 Q60 37 44 32 Z" fill={ink} />
          <path d="M60 8 Q74 10 78 28" stroke="#e8d6b0" strokeOpacity="0.55" strokeWidth="0.9" fill="none" />
          <path d="M77 27 l2 7 l-4 -2 Z" fill="#e8d6b0" fillOpacity="0.55" />
        </g>
      );
      hair = <path d="M72 34 C80 38 82 48 80 56 L74 56 C76 48 74 40 70 36 Z" fill={ink} />;
      break;
    case 'turban':
      head = (
        <g>
          <path d="M38 36 C36 18 50 8 64 8 C80 8 88 20 86 36 C80 34 70 32 60 32 C52 32 44 34 38 36 Z" fill={ink} />
          {[16, 23, 30].map((y) => <path key={y} d={`M40 ${y + 5} Q62 ${y - 4} 85 ${y + 3}`} stroke="#e8d6b0" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />)}
        </g>
      );
      break;
    case 'hat':
      head = (
        <g>
          <path d="M46 30 L48 10 Q62 6 76 10 L78 30 Z" fill={ink} />
          <path d="M28 31 Q60 25 94 31 Q60 36 28 31 Z" fill={ink} />
          <path d="M47 26 L77 26" stroke="#e8d6b0" strokeOpacity="0.5" strokeWidth="1.4" />
        </g>
      );
      hair = <path d="M74 34 C80 38 82 48 80 56 L74 56 C76 48 74 40 70 36 Z" fill={ink} />;
      break;
    case 'tarha':
    case 'cowl':
      head = (
        <g>
          <path d={`M40 40 C38 22 52 12 66 13 C84 15 92 32 90 52 C88 70 92 86 100 100 L64 100 C70 88 74 76 76 62 C74 48 66 36 50 36 C46 36 42 38 40 40 Z`} fill={ink} />
          <path d="M42 36 C50 24 70 22 80 36" stroke="#e8d6b0" strokeOpacity="0.4" strokeWidth="0.9" fill="none" />
        </g>
      );
      break;
    case 'keffiyeh':
      head = (
        <g>
          <path d="M38 38 C36 20 50 10 66 11 C84 13 92 30 90 50 C89 68 94 86 100 100 L64 100 C70 86 74 72 74 60 C72 46 64 38 50 36 C44 36 40 37 38 38 Z" fill={ink} />
          <path d="M40 26 Q64 18 88 26" stroke="#e8d6b0" strokeOpacity="0.55" strokeWidth="2" fill="none" />
          <path d="M40 31 Q64 23 88 31" stroke="#e8d6b0" strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
        </g>
      );
      break;
    case 'kufi':
      head = <path d="M42 30 Q44 14 62 14 Q80 14 82 32 Q62 26 42 30 Z" fill={ink} />;
      break;
    default:
      hair = f
        ? <path d="M40 38 C42 22 58 16 70 20 C82 24 86 38 82 52 C86 58 88 66 84 72 C78 70 76 60 76 52 C74 40 64 32 50 34 C46 35 42 36 40 38 Z" fill={ink} />
        : old ? null : <path d="M40 36 C44 24 58 18 68 21 C80 25 84 36 82 48 L76 50 C76 40 70 32 60 31 C52 30 46 32 40 36 Z" fill={ink} />;
  }
  const beard = s.beard && s.beard !== 'none' && s.beard !== 'stubble'
    ? <path d={s.beard === 'full' ? 'M38 62 C34 70 34 80 40 88 C48 94 58 90 64 82 C66 76 64 70 62 66 C56 70 48 70 44 66 Z' : 'M38 63 C36 70 38 78 44 82 C52 84 58 80 62 74 C60 70 58 68 56 68 C50 70 44 68 40 64 Z'} fill={ink} />
    : null;
  const moustache = s.moustache === 'thick' ? <path d="M33 58 C34 61 38 62 42 61 C40 59 37 58 33 58 Z" fill={ink} /> : null;
  const collar =
    s.clothes === 'suit' || s.clothes === 'uniform'
      ? <g><path d="M54 84 L60 92 L66 84" stroke="#e8d6b0" strokeOpacity="0.6" strokeWidth="1.6" fill="none" />{s.clothes === 'suit' && <path d="M60 92 L58 100 L62 100 Z" fill="#e8d6b0" fillOpacity="0.35" />}</g>
      : s.clothes === 'dress' ? <path d="M40 90 Q60 96 80 90" stroke="#d8b25a" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="1.5 2" fill="none" /> : null;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${k}-g`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#f6ecd4" />
          <stop offset="0.75" stopColor="#e6d3aa" />
          <stop offset="1" stopColor="#c9ae7c" />
        </radialGradient>
        <clipPath id={`${k}-c`}><circle cx="50" cy="50" r="47" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#8a6a3a" />
      <circle cx="50" cy="50" r="47" fill={`url(#${k}-g)`} />
      <g clipPath={`url(#${k}-c)`}>
        {s.head === 'tarha' || s.head === 'cowl' || s.head === 'keffiyeh' ? null : <path d={bust} fill={ink} />}
        <path d={face} fill={ink} />
        {hair}
        {head}
        {beard}
        {moustache}
        {s.glasses && <g stroke="#e8d6b0" strokeOpacity="0.8" strokeWidth="0.9" fill="none"><circle cx="40" cy="46" r="3.2" /><path d="M43 46 L60 47" /></g>}
        {s.earrings && <circle cx="66" cy="60" r="1.6" fill="#d8b25a" />}
        {collar}
        {(s.head === 'tarha' || s.head === 'cowl' || s.head === 'keffiyeh') && <path d={bust} fill={ink} opacity="0.92" />}
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#5a3d20" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="#b8904e" strokeOpacity="0.5" strokeWidth="0.6" />
    </svg>
  );
}

/** A painted portrait from art/portraits/<id>.jpg when one has been added, otherwise the cameo. */
export function PortraitOrCameo({ id, spec, size }: { id: string; spec: PersonSpec; size: number }) {
  const [ok, setOk] = useState<boolean | null>(null);
  return (
    <span className="cameo-wrap" style={{ width: size, height: size }}>
      {ok === false && <PersonCameo spec={spec} size={size} />}
      <img src={`art/portraits/${id}.jpg`} alt="" style={{ display: ok ? 'block' : 'none', width: size, height: size, objectFit: 'cover', objectPosition: '50% 22%', borderRadius: '50%' }} onLoad={() => setOk(true)} onError={() => setOk(false)} />
    </span>
  );
}
