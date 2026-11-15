import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { HouseStyle } from './data';

// A home in two layers from one geometry: a daylight elevation (or the listing
// photo, once there is one) and a blueprint with the home's facts. A liquid
// blob that trails the cursor shows the blueprint through the picture.

type Kind = 'body' | 'body2' | 'roof' | 'window' | 'door' | 'garage' | 'trim' | 'chimney' | 'porch';
type Shape =
  | { t: 'rect'; k: Kind; x: number; y: number; w: number; h: number }
  | { t: 'poly'; k: Kind; pts: [number, number][] };

const G = 250;
const r = (k: Kind, x: number, y: number, w: number, h: number): Shape => ({ t: 'rect', k, x, y, w, h });
const p = (k: Kind, ...pts: [number, number][]): Shape => ({ t: 'poly', k, pts });

const GEOMETRY: Record<HouseStyle, Shape[]> = {
  ranch: [
    r('body', 64, 156, 272, G - 156), p('roof', [44, 160], [200, 94], [356, 160]),
    r('garage', 232, 184, 86, G - 184), r('window', 84, 180, 44, 34), r('window', 140, 180, 30, 34),
    r('door', 184, 190, 32, G - 190), r('trim', 64, 154, 272, 4),
  ],
  twostory: [
    r('body', 104, 100, 182, G - 100), p('roof', [88, 104], [195, 42], [302, 104]),
    r('body2', 286, 168, 84, G - 168), p('roof', [278, 172], [328, 134], [378, 172]),
    r('garage', 296, 192, 64, G - 192),
    r('window', 124, 118, 36, 34), r('window', 178, 118, 36, 34), r('window', 232, 118, 36, 34),
    r('window', 124, 186, 40, 36), r('window', 234, 186, 36, 36), r('door', 178, 192, 34, G - 192), r('trim', 104, 166, 182, 4),
  ],
  cottage: [
    r('chimney', 238, 70, 20, 60), r('body', 118, 142, 164, G - 142), p('roof', [98, 146], [200, 58], [302, 146]),
    r('window', 186, 98, 28, 28), r('window', 134, 172, 38, 34), r('window', 228, 172, 38, 34),
    r('porch', 168, 182, 64, 8), r('door', 184, 190, 32, G - 190),
  ],
  modern: [
    r('body', 70, 116, 156, G - 116), r('body2', 206, 158, 140, G - 158),
    r('trim', 60, 108, 176, 10), r('trim', 196, 150, 160, 10),
    r('window', 88, 134, 120, 44), r('window', 222, 176, 54, 50), r('door', 292, 186, 30, G - 186), r('window', 88, 196, 40, 54),
  ],
  duplex: [
    r('body', 44, 136, 312, G - 136), p('roof', [26, 140], [200, 72], [374, 140]), r('trim', 198, 136, 4, G - 136),
    r('window', 64, 162, 40, 34), r('window', 120, 162, 40, 34), r('window', 240, 162, 40, 34), r('window', 296, 162, 40, 34),
    r('door', 150, 196, 30, G - 196), r('door', 220, 196, 30, G - 196), r('window', 186, 96, 28, 24),
  ],
};

const PALETTES = [
  { body: '#e3d5bb', body2: '#d5c4a4', roof: '#4a4d54', door: '#6e2a20', trim: '#f4efe4' },
  { body: '#c6cdd2', body2: '#b3bcc3', roof: '#3a4150', door: '#22344d', trim: '#f2f2ee' },
  { body: '#bb8a6f', body2: '#a97a60', roof: '#3d3331', door: '#33402f', trim: '#efe3d4' },
  { body: '#efebe3', body2: '#ddd7cc', roof: '#2e3036', door: '#a8170f', trim: '#ffffff' },
  { body: '#b2bcaa', body2: '#a1ac99', roof: '#353d3a', door: '#5b3a1e', trim: '#eef1ea' },
];

const pts = (s: Shape) => (s.t === 'poly' ? s.pts.map((q) => q.join(',')).join(' ') : '');

function bbox(shapes: Shape[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity;
  for (const s of shapes) {
    if (s.t === 'rect') { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x + s.w); y0 = Math.min(y0, s.y); }
    else for (const [x, y] of s.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
  }
  return { x0, x1, y0 };
}

export interface HouseFacts { beds: number | null; baths: number | null; sqft: number | null; yearBuilt: number | null; rent?: string; leaseEnd?: string }

/** Daylight elevation, drawn like an architect's presentation sketch. */
export function HouseArt({ style, palette, photo }: { style: HouseStyle; palette: number; photo?: string }) {
  const id = useId().replace(/:/g, '');
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return (
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Listing photo of the home">
        <image href={photo} width="400" height="300" preserveAspectRatio="xMidYMid slice" onError={() => setBroken(true)} />
      </svg>
    );
  }
  const c = PALETTES[palette % PALETTES.length];
  const shapes = GEOMETRY[style];
  const fill = (k: Kind) =>
    k === 'window' ? `url(#gl${id})` : k === 'roof' ? `url(#rf${id})` : k === 'door' ? c.door
      : k === 'trim' || k === 'porch' || k === 'garage' ? c.trim : k === 'chimney' || k === 'body2' ? c.body2 : c.body;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Elevation drawing of the home">
      <defs>
        <linearGradient id={`sk${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe3e2" /><stop offset="1" stopColor="#f3efe6" /></linearGradient>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7d909c" /><stop offset="0.45" stopColor="#a9b8c0" /><stop offset="0.5" stopColor="#d9e1e4" /><stop offset="0.56" stopColor="#8fa1ab" /><stop offset="1" stopColor="#5f717d" /></linearGradient>
        <pattern id={`rf${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <rect width="7" height="7" fill={c.roof} /><line x1="0" y1="0" x2="0" y2="7" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />
        </pattern>
        <pattern id={`sd${id}`} width="400" height="6" patternUnits="userSpaceOnUse"><line x1="0" x2="400" y1="5.5" y2="5.5" stroke="#000" strokeOpacity="0.07" /></pattern>
      </defs>
      <rect width="400" height="300" fill={`url(#sk${id})`} />
      <circle cx="330" cy="62" r="34" fill="#f7e9cc" opacity="0.7" />
      <path d="M0 238 Q120 226 220 236 T400 230 V300 H0Z" fill="#c9ccb6" />
      <rect y={G} width="400" height={300 - G} fill="#bfc3aa" />
      {/* tree */}
      <path d="M352 252 L352 196" stroke="#4a3a2c" strokeWidth="5" />
      <g stroke="#2a2b2e" strokeWidth="1.1" strokeOpacity="0.55">
        <circle cx="352" cy="176" r="30" fill="#8e9a7c" /><circle cx="334" cy="192" r="18" fill="#9aa587" /><circle cx="370" cy="196" r="16" fill="#879375" />
      </g>
      {shapes.map((s, i) => s.t === 'rect'
        ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={fill(s.k)} />
        : <polygon key={i} points={pts(s)} fill={fill(s.k)} />)}
      {/* siding, eave shadow, garage panels */}
      {shapes.filter((s) => s.k === 'body' || s.k === 'body2').map((s, i) => s.t === 'rect' && (
        <g key={`s${i}`}><rect x={s.x} y={s.y} width={s.w} height={s.h} fill={`url(#sd${id})`} /><rect x={s.x} y={s.y} width={s.w} height="9" fill="#000" opacity="0.1" /></g>
      ))}
      {shapes.filter((s) => s.k === 'garage').map((s, i) => s.t === 'rect' && (
        <g key={`g${i}`} stroke="#2a2b2e" strokeOpacity="0.25">{[1, 2, 3, 4].map((n) => <line key={n} x1={s.x + 3} x2={s.x + s.w - 3} y1={s.y + (s.h / 5) * n} y2={s.y + (s.h / 5) * n} />)}</g>
      ))}
      {shapes.filter((s) => s.k === 'window').map((s, i) => s.t === 'rect' && (
        <g key={`w${i}`} stroke={c.trim} strokeWidth="2.2">
          <line x1={s.x + s.w / 2} x2={s.x + s.w / 2} y1={s.y} y2={s.y + s.h} /><line x1={s.x} x2={s.x + s.w} y1={s.y + s.h / 2} y2={s.y + s.h / 2} />
          <rect x={s.x - 3} y={s.y + s.h} width={s.w + 6} height="3.5" fill={c.trim} stroke="none" />
        </g>
      ))}
      {shapes.filter((s) => s.k === 'door').map((s, i) => s.t === 'rect' && (
        <g key={`d${i}`}>
          <polygon points={`${s.x},${G} ${s.x + s.w},${G} ${s.x + s.w + 22},300 ${s.x - 22},300`} fill="#e6e0d2" />
          <circle cx={s.x + s.w - 7} cy={s.y + s.h / 2 + 4} r="2" fill="#c9a24e" />
        </g>
      ))}
      {/* ink outline over everything */}
      <g fill="none" stroke="#24262a" strokeWidth="1.25" strokeLinejoin="round">
        {shapes.map((s, i) => s.t === 'rect' ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} /> : <polygon key={i} points={pts(s)} />)}
      </g>
      {/* shrubs */}
      <g stroke="#2a2b2e" strokeWidth="1" strokeOpacity="0.5" fill="#7f8c6c">
        <ellipse cx="80" cy="249" rx="22" ry="11" /><ellipse cx="118" cy="251" rx="16" ry="9" /><ellipse cx="300" cy="250" rx="14" ry="8" />
      </g>
    </svg>
  );
}

/** Blueprint on Westrom navy, with the home's facts. */
export function HouseBlueprint({ style, facts }: { style: HouseStyle; facts: HouseFacts }) {
  const id = useId().replace(/:/g, '');
  const shapes = GEOMETRY[style];
  const { x0, x1, y0 } = bbox(shapes);
  const door = shapes.find((s) => s.k === 'door');
  const win = shapes.find((s) => s.k === 'window');
  const label = (x: number, y: number, text: string, anchor: 'start' | 'end' | 'middle' = 'start', cls = '') =>
    <text x={x} y={y} textAnchor={anchor} className={`pf-bp-label ${cls}`}>{text}</text>;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Blueprint with the home's facts">
      <defs>
        <pattern id={`gr${id}`} width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#f2efe7" strokeOpacity="0.09" /></pattern>
      </defs>
      <rect width="400" height="300" fill="#10203a" /><rect width="400" height="300" fill={`url(#gr${id})`} />
      <g fill="none" stroke="#f2efe7" strokeWidth="1.1" strokeLinejoin="round">
        <line x1="0" x2="400" y1={G} y2={G} strokeDasharray="3 4" strokeOpacity="0.5" />
        {shapes.map((s, i) => s.t === 'rect' ? <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} /> : <polygon key={i} points={pts(s)} />)}
      </g>
      <g stroke="#e2574c" strokeWidth="1" fill="none">
        <line x1={x0} x2={x1} y1={G + 16} y2={G + 16} /><line x1={x0} x2={x0} y1={G + 10} y2={G + 22} /><line x1={x1} x2={x1} y1={G + 10} y2={G + 22} />
      </g>
      {facts.sqft != null && label((x0 + x1) / 2, G + 34, `${facts.sqft.toLocaleString()} SQ FT`, 'middle', 'is-red')}
      <g stroke="#f2efe7" strokeOpacity="0.55" strokeWidth="0.8">
        <line x1={(x0 + x1) / 2} y1={y0} x2={(x0 + x1) / 2 - 44} y2={Math.max(16, y0 - 18)} />
        {win?.t === 'rect' && <line x1={win.x} y1={win.y} x2={22} y2={win.y - 20} />}
        {door?.t === 'rect' && facts.leaseEnd && <line x1={door.x + door.w} y1={door.y + 10} x2={384} y2={door.y - 6} />}
      </g>
      {facts.yearBuilt != null && label((x0 + x1) / 2 - 48, Math.max(12, y0 - 22), `BUILT ${facts.yearBuilt}`, 'end')}
      {win?.t === 'rect' && facts.beds != null && label(22, win.y - 24, `${facts.beds} BD${facts.baths != null ? ` · ${facts.baths} BA` : ''}`)}
      {door?.t === 'rect' && facts.leaseEnd && label(384, door.y - 10, `LEASE TO ${facts.leaseEnd}`, 'end')}
      {facts.rent && label(384, 24, `RENT ${facts.rent}`, 'end')}
    </svg>
  );
}

const TRAIL = 9;

interface BlobState {
  x: number; y: number; tx: number; ty: number; scale: number; target: number; flood: boolean; raf: number;
  pts: { x: number; y: number }[]; w: number; h: number;
}

function animate(s: BlobState, circles: (SVGCircleElement | null)[]) {
  if (s.raf) return;
  const step = (t: number) => {
    s.x += (s.tx - s.x) * 0.28; s.y += (s.ty - s.y) * 0.28;
    s.scale += ((s.flood ? 9 : s.target) - s.scale) * 0.12;
    let px = s.x, py = s.y;
    s.pts.forEach((q, i) => {
      const ease = 0.42 - i * 0.025;
      q.x += (px - q.x) * ease; q.y += (py - q.y) * ease;
      px = q.x; py = q.y;
      const c = circles[i];
      if (c) {
        // A slow wobble per circle keeps the edge liquid even when the cursor rests.
        const R = Math.min(s.w, s.h) * 0.26 * (1 - i / (TRAIL + 3)) * s.scale;
        const wob = Math.min(s.w, s.h) * 0.05 * Math.min(1, s.scale);
        c.setAttribute('cx', (q.x + Math.sin(t / 620 + i * 1.9) * wob).toFixed(1));
        c.setAttribute('cy', (q.y + Math.cos(t / 540 + i * 2.3) * wob).toFixed(1));
        c.setAttribute('r', Math.max(0, R * (0.9 + 0.12 * Math.sin(t / 480 + i))).toFixed(1));
      }
    });
    // Keep moving while the blob is showing (it wobbles); stop once it has shrunk away.
    const settled = !s.flood && s.target === 0 && s.scale < 0.003;
    s.raf = settled ? 0 : requestAnimationFrame(step);
  };
  s.raf = requestAnimationFrame(step);
}



/**
 * Liquid reveal. A short chain of circles follows the cursor, each one easing
 * toward the one ahead; a goo filter melts them into one moving blob, used as
 * the mask for the top layer. On touch screens a tap floods the whole frame.
 */
export function BlobReveal({ base, reveal, className = '', intro = false, label }: {
  base: React.ReactNode; reveal: React.ReactNode; className?: string; intro?: boolean; label?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const circles = useRef<(SVGCircleElement | null)[]>([]);
  const state = useRef<BlobState>({ x: 0, y: 0, tx: 0, ty: 0, scale: 0, target: 0, flood: false, raf: 0, pts: Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 })), w: 1, h: 1 });

  useEffect(() => {
    const el = wrap.current;
    const s = state.current;
    if (!el) return;
    const size = () => {
      const b = el.getBoundingClientRect();
      s.w = b.width; s.h = b.height;
      svg.current?.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    };
    size();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    ro?.observe(el);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let introTimer = 0;
    if (intro && !reduce) {
      // A slow sweep across the picture on load, so people see there is something under it.
      const t0 = performance.now() + 700;
      s.x = s.tx = s.w * 0.2; s.y = s.ty = s.h * 0.62;
      s.pts.forEach((q) => { q.x = s.x; q.y = s.y; });
      const sweep = (t: number) => {
        const k = (t - t0) / 2200;
        if (k < 0) { introTimer = requestAnimationFrame(sweep); return; }
        if (k > 1 || el.classList.contains('is-live')) { if (!el.classList.contains('is-live')) s.target = 0; animate(s, circles.current); return; }
        s.target = 1;
        s.tx = s.w * (0.2 + 0.6 * k);
        s.ty = s.h * (0.62 - 0.22 * Math.sin(k * Math.PI));
        animate(s, circles.current);
        introTimer = requestAnimationFrame(sweep);
      };
      introTimer = requestAnimationFrame(sweep);
    }
    return () => { ro?.disconnect(); cancelAnimationFrame(s.raf); cancelAnimationFrame(introTimer); };
  }, [intro]);

  const kick = () => animate(state.current, circles.current);

  const at = (e: ReactPointerEvent) => {
    const b = wrap.current!.getBoundingClientRect();
    state.current.tx = e.clientX - b.left; state.current.ty = e.clientY - b.top;
  };

  return (
    <div
      ref={wrap}
      className={`pf-blob ${className}`}
      onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; wrap.current?.classList.add('is-live'); at(e); state.current.target = 1; kick(); }}
      onPointerMove={(e) => { if (e.pointerType !== 'mouse') return; at(e); kick(); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'mouse') return; wrap.current?.classList.remove('is-live'); state.current.target = 0; kick(); }}
      onClick={(e) => {
        if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') return;
        const s = state.current; at(e as unknown as ReactPointerEvent); s.pts.forEach((q) => { q.x = s.tx; q.y = s.ty; }); s.x = s.tx; s.y = s.ty;
        s.flood = !s.flood; kick();
      }}
    >
      <div className="pf-blob-base">{base}</div>
      <svg ref={svg} className="pf-blob-svg" aria-hidden>
        <defs>
          <filter id={`goo${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
          </filter>
          <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="10000" height="10000">
            <g filter={`url(#goo${uid})`} fill="#fff">
              {Array.from({ length: TRAIL }, (_, i) => <circle key={i} ref={(n) => { circles.current[i] = n; }} r="0" />)}
            </g>
          </mask>
        </defs>
        <g mask={`url(#m${uid})`} className="pf-blob-top">{reveal}</g>
      </svg>
      {label && <span className="pf-blob-hint">{label}</span>}
    </div>
  );
}
