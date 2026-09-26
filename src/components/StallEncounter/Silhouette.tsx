// Over-the-shoulder foreground figure for buyers whose scene art is not yet painted.
// Seen from behind, lit by the lantern on the left edge. No face is drawn.
export function Silhouette({ kind, accent }: { kind: 'samira' | 'fez' | 'scarf'; accent: string }) {
  const body = 'M8 400 C 14 318, 70 268, 150 258 C 230 268, 290 318, 296 400 Z';
  return (
    <svg className="silhouette" viewBox="0 0 300 400" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="silFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1c11" />
          <stop offset="1" stopColor="#0c0704" />
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffc877" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#ffc877" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="silGlow" cx="0.2" cy="0.4" r="0.8">
          <stop offset="0" stopColor={accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === 'fez' ? (
        <g>
          <path d={body} fill="url(#silFill)" />
          <path d="M122 262 L150 330 L178 262" fill="none" stroke="#3b2a1b" strokeWidth="3" />
          <rect x="132" y="215" width="36" height="50" rx="10" fill="#1a110a" />
          <ellipse cx="150" cy="168" rx="50" ry="60" fill="url(#silFill)" />
          <path d="M104 128 L114 66 Q150 58 186 66 L196 128 Q150 138 104 128 Z" fill="#5e1712" />
          <path d="M104 128 L114 66 Q150 58 186 66 L196 128 Q150 138 104 128 Z" fill="url(#silGlow)" />
          <path d="M150 62 Q170 70 176 104" stroke="#12090a" strokeWidth="3" fill="none" />
          <path d={body} fill="none" stroke="url(#rim)" strokeWidth="4" />
          <path d="M100 168 A50 60 0 0 1 150 108" fill="none" stroke="#ffc877" strokeOpacity="0.55" strokeWidth="3" />
        </g>
      ) : (
        <g>
          <path d="M16 400 C 20 320, 76 262, 150 254 C 224 262, 280 320, 290 400 Z" fill="url(#silFill)" />
          <path d="M92 190 C 88 110, 212 110, 208 190 C 214 250, 240 290, 262 330 L 262 400 L 40 400 L 40 330 C 60 290, 86 250, 92 190 Z" fill="#3a2414" />
          <path d="M92 190 C 88 110, 212 110, 208 190 C 214 250, 240 290, 262 330 L 262 400 L 40 400 L 40 330 C 60 290, 86 250, 92 190 Z" fill="url(#silGlow)" />
          <path d="M70 300 C 120 280, 190 280, 240 305" stroke={accent} strokeOpacity="0.5" strokeWidth="3" fill="none" strokeDasharray="2 6" />
          <path d="M92 190 C 88 110, 212 110, 208 190" fill="none" stroke="#ffc877" strokeOpacity="0.55" strokeWidth="3" />
          <path d="M40 330 C 60 290, 86 250, 92 190" fill="none" stroke="url(#rim)" strokeWidth="4" />
        </g>
      )}
    </svg>
  );
}
