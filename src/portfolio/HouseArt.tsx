import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { HouseStyle } from './data';

// A home drawn twice from the same geometry: as a dusk illustration and as a
// blueprint with its facts. The real page puts the listing photo in the first
// layer; the blueprint stays drawn, so the two always line up.

type Shape =
  | { t: 'rect'; k: Kind; x: number; y: number; w: number; h: number }
  | { t: 'poly'; k: Kind; pts: [number, number][] };
type Kind = 'body' | 'body2' | 'roof' | 'window' | 'door' | 'garage' | 'trim' | 'chimney' | 'porch';

const G = 250; // ground line

const r = (k: Kind, x: number, y: number, w: number, h: number): Shape => ({ t: 'rect', k, x, y, w, h });
const p = (k: Kind, ...pts: [number, number][]): Shape => ({ t: 'poly', k, pts });

const GEOMETRY: Record<HouseStyle, Shape[]> = {
  ranch: [
    r('body', 64, 156, 272, G - 156),
    p('roof', [48, 158], [200, 96], [352, 158]),
    r('garage', 232, 184, 86, G - 184),
    r('window', 84, 180, 44, 34), r('window', 140, 180, 30, 34),
    r('door', 184, 190, 32, G - 190),
    r('trim', 64, 154, 272, 4),
  ],
  twostory: [
    r('body', 104, 100, 182, G - 100),
    p('roof', [90, 102], [195, 44], [300, 102]),
    r('body2', 286, 168, 84, G - 168),
    p('roof', [280, 170], [328, 136], [376, 170]),
    r('garage', 296, 192, 64, G - 192),
    r('window', 124, 118, 36, 34), r('window', 178, 118, 36, 34), r('window', 232, 118, 36, 34),
    r('window', 124, 186, 40, 36), r('window', 234, 186, 36, 36),
    r('door', 178, 192, 34, G - 192),
    r('trim', 104, 166, 182, 4),
  ],
  cottage: [
    r('chimney', 238, 70, 20, 60),
    r('body', 118, 142, 164, G - 142),
    p('roof', [100, 144], [200, 60], [300, 144]),
    r('window', 186, 98, 28, 28),
    r('window', 134, 172, 38, 34), r('window', 228, 172, 38, 34),
    r('porch', 168, 182, 64, 8),
    r('door', 184, 190, 32, G - 190),
  ],
  modern: [
    r('body', 70, 116, 156, G - 116),
    r('body2', 206, 158, 140, G - 158),
    r('trim', 60, 108, 176, 10), r('trim', 196, 150, 160, 10),
    r('window', 88, 134, 120, 44),
    r('window', 222, 176, 54, 50),
    r('door', 292, 186, 30, G - 186),
    r('window', 88, 196, 40, 54),
  ],
  duplex: [
    r('body', 44, 136, 312, G - 136),
    p('roof', [28, 138], [200, 74], [372, 138]),
    r('trim', 198, 136, 4, G - 136),
    r('window', 64, 162, 40, 34), r('window', 120, 162, 40, 34),
    r('window', 240, 162, 40, 34), r('window', 296, 162, 40, 34),
    r('door', 150, 196, 30, G - 196), r('door', 220, 196, 30, G - 196),
    r('window', 186, 96, 28, 24),
  ],
};

export const PALETTES = [
  { body: '#d8c7a8', body2: '#c8b48f', roof: '#3b3f4a', door: '#7b2f22', trim: '#efe6d2' },
  { body: '#aebdcb', body2: '#97a9ba', roof: '#2a3140', door: '#1f3b5c', trim: '#e6edf3' },
  { body: '#b97a5a', body2: '#a46a4c', roof: '#33282a', door: '#2f3b2f', trim: '#ead8c8' },
  { body: '#e6e2da', body2: '#cfcac0', roof: '#24272d', door: '#b61710', trim: '#ffffff' },
  { body: '#8fa39a', body2: '#7c9188', roof: '#2c3533', door: '#5b3a1e', trim: '#e3ebe6' },
];

function bbox(shapes: Shape[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity;
  for (const s of shapes) {
    if (s.t === 'rect') { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x + s.w); y0 = Math.min(y0, s.y); }
    else for (const [x, y] of s.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
  }
  return { x0, x1, y0 };
}

export interface HouseFacts {
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  rent?: string;
  leaseEnd?: string;
}

interface ArtProps { style: HouseStyle; palette: number; className?: string; glow?: boolean }

export function HouseArt({ style, palette, className, glow = true }: ArtProps) {
  const id = useId().replace(/:/g, '');
  const c = PALETTES[palette % PALETTES.length];
  const shapes = GEOMETRY[style];
  const fill = (k: Kind) =>
    k === 'window' ? `url(#win${id})` : k === 'roof' ? c.roof : k === 'door' ? c.door : k === 'trim' || k === 'porch' ? c.trim
      : k === 'garage' ? c.trim : k === 'chimney' ? c.body2 : k === 'body2' ? c.body2 : c.body;
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label={`${style} house illustration`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1530" />
          <stop offset="0.62" stopColor="#3a2d5c" />
          <stop offset="1" stopColor="#e2775a" />
        </linearGradient>
        <linearGradient id={`win${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={glow ? '#ffd88a' : '#9fb3c8'} />
          <stop offset="1" stopColor={glow ? '#f2a54a' : '#6d8197'} />
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky${id})`} />
      <circle cx="318" cy="70" r="70" fill={`url(#sun${id})`} opacity="0.55" />
      <g fill="#ffffff" opacity="0.7">
        <circle cx="40" cy="30" r="1" /><circle cx="120" cy="18" r="0.8" /><circle cx="210" cy="26" r="1.1" /><circle cx="260" cy="12" r="0.7" /><circle cx="360" cy="34" r="0.9" />
      </g>
      <path d="M0 236 Q100 222 200 234 T400 228 V300 H0Z" fill="#1d2a2a" />
      <rect y={G} width="400" height={300 - G} fill="#14201f" />
      {/* tree */}
      <rect x="350" y="196" width="6" height="56" fill="#2a1d14" />
      <circle cx="353" cy="186" r="26" fill="#22382e" />
      <circle cx="338" cy="198" r="16" fill="#2b4638" />
      {shapes.map((s, i) =>
        s.t === 'rect'
          ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={fill(s.k)} rx={s.k === 'window' ? 2 : 0} />
          : <polygon key={i} points={s.pts.map((q) => q.join(',')).join(' ')} fill={fill(s.k)} />,
      )}
      {shapes.filter((s) => s.k === 'garage').map((s, i) => s.t === 'rect' && (
        <g key={`g${i}`} stroke="#00000022" strokeWidth="1">
          {[1, 2, 3, 4].map((n) => <line key={n} x1={s.x + 4} x2={s.x + s.w - 4} y1={s.y + (s.h / 5) * n} y2={s.y + (s.h / 5) * n} />)}
        </g>
      ))}
      {/* roof edge, window bars, walkway */}
      {shapes.filter((s) => s.k === 'roof').map((s, i) => s.t === 'poly' && (
        <polyline key={`re${i}`} points={s.pts.map((q) => q.join(',')).join(' ')} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="3" />
      ))}
      {shapes.filter((s) => s.k === 'window').map((s, i) => s.t === 'rect' && (
        <g key={`m${i}`} stroke={c.trim} strokeWidth="2" opacity="0.85">
          <line x1={s.x + s.w / 2} x2={s.x + s.w / 2} y1={s.y} y2={s.y + s.h} />
          <line x1={s.x} x2={s.x + s.w} y1={s.y + s.h / 2} y2={s.y + s.h / 2} />
          <rect x={s.x - 2} y={s.y + s.h} width={s.w + 4} height="3" fill={c.trim} stroke="none" />
        </g>
      ))}
      {shapes.filter((s) => s.k === 'door').map((s, i) => s.t === 'rect' && (
        <g key={`d${i}`}>
          <polygon points={`${s.x},${G} ${s.x + s.w},${G} ${s.x + s.w + 26},300 ${s.x - 26},300`} fill="#3a4140" opacity="0.8" />
          <circle cx={s.x + s.w - 7} cy={s.y + s.h / 2 + 4} r="2" fill="#f2c46b" />
          <rect x={s.x + s.w + 4} y={s.y + 12} width="5" height="7" rx="1" fill="#ffd88a" opacity={glow ? 0.9 : 0.3} />
        </g>
      ))}
      {glow && shapes.filter((s) => s.k === 'window').map((s, i) => s.t === 'rect' && (
        <rect key={`w${i}`} x={s.x - 6} y={s.y - 6} width={s.w + 12} height={s.h + 12} fill="#ffc46b" opacity="0.12" rx="6" />
      ))}
    </svg>
  );
}

interface BlueprintProps { style: HouseStyle; facts: HouseFacts; className?: string }

export function HouseBlueprint({ style, facts, className }: BlueprintProps) {
  const id = useId().replace(/:/g, '');
  const shapes = GEOMETRY[style];
  const { x0, x1, y0 } = bbox(shapes);
  const door = shapes.find((s) => s.k === 'door');
  const win = shapes.find((s) => s.k === 'window');
  const label = (x: number, y: number, text: string, anchor: 'start' | 'end' | 'middle' = 'start') => (
    <text x={x} y={y} textAnchor={anchor} className="pf-bp-label">{text}</text>
  );
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Blueprint with the home's facts" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`grid${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#5fd4ff" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="#04182b" />
      <rect width="400" height="300" fill={`url(#grid${id})`} />
      <g fill="none" stroke="#7ee6ff" strokeWidth="1.4" strokeLinejoin="round">
        <line x1="0" x2="400" y1={G} y2={G} strokeDasharray="4 4" strokeOpacity="0.6" />
        {shapes.map((s, i) =>
          s.t === 'rect'
            ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} strokeOpacity={s.k === 'window' || s.k === 'door' ? 0.9 : 1} />
            : <polygon key={i} points={s.pts.map((q) => q.join(',')).join(' ')} />,
        )}
      </g>
      {/* dimension line */}
      <g stroke="#ff5a4e" strokeWidth="1" fill="none">
        <line x1={x0} x2={x1} y1={G + 18} y2={G + 18} />
        <line x1={x0} x2={x0} y1={G + 12} y2={G + 24} /><line x1={x1} x2={x1} y1={G + 12} y2={G + 24} />
      </g>
      <text x={(x0 + x1) / 2} y={G + 36} textAnchor="middle" className="pf-bp-label pf-bp-red">{facts.sqft.toLocaleString()} SQ FT</text>
      {/* callouts */}
      <g stroke="#7ee6ff" strokeOpacity="0.7" strokeWidth="1">
        <line x1={(x0 + x1) / 2} y1={y0} x2={(x0 + x1) / 2 - 40} y2={y0 - 18 < 14 ? 14 : y0 - 18} />
        {win && win.t === 'rect' && <line x1={win.x} y1={win.y} x2={20} y2={win.y - 20} />}
        {door && door.t === 'rect' && <line x1={door.x + door.w} y1={door.y + 10} x2={386} y2={door.y - 6} />}
      </g>
      {label((x0 + x1) / 2 - 44, y0 - 22 < 10 ? 10 : y0 - 22, `BUILT ${facts.yearBuilt}`, 'end')}
      {win && win.t === 'rect' && label(20, win.y - 24, `${facts.beds} BD · ${facts.baths} BA`)}
      {door && door.t === 'rect' && facts.leaseEnd && label(386, door.y - 10, `LEASE → ${facts.leaseEnd}`, 'end')}
      {facts.rent && label(386, 24, `RENT ${facts.rent}`, 'end')}
    </svg>
  );
}

/**
 * The signature interaction: a lens follows the cursor and shows the blueprint
 * through the illustration. On touch screens a tap flips the whole picture.
 */
export function XRay({ art, blueprint, className, hint }: { art: ReactNode; blueprint: ReactNode; className?: string; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--x', `${e.clientX - b.left}px`);
    ref.current.style.setProperty('--y', `${e.clientY - b.top}px`);
  };
  return (
    <div
      ref={ref}
      className={`pf-xray ${flipped ? 'is-flipped' : ''} ${className ?? ''}`}
      onPointerMove={move}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') ref.current?.classList.add('is-on'); }}
      onPointerLeave={() => ref.current?.classList.remove('is-on')}
      onClick={(e) => { if ((e.nativeEvent as PointerEvent).pointerType !== 'mouse') setFlipped((f) => !f); }}
    >
      <div className="pf-xray-art">{art}</div>
      <div className="pf-xray-bp" aria-hidden={!flipped}>{blueprint}</div>
      <div className="pf-xray-ring" aria-hidden />
      {hint && <span className="pf-xray-hint">{hint}</span>}
    </div>
  );
}
