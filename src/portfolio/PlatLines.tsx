import { memo } from 'react';

// The page's ground: a faint subdivision plat, the survey drawing every home
// sits on. Streets with their right-of-way, lot lines off each street and a
// back line behind the lots. Drawn once from fixed curves.

type P = [number, number];
type Bez = [P, P, P, P];

const STREETS: Bez[] = [
  [[-80, 210], [420, 120], [820, 360], [1700, 250]],
  [[-60, 760], [380, 640], [900, 900], [1680, 700]],
  [[1180, -60], [1080, 300], [1330, 560], [1240, 1080]],
  [[260, 1080], [320, 760], [180, 520], [420, 380]],
];
const CUL_DE_SACS: P[] = [[420, 380], [1240, 1080]];

const at = ([a, b, c, d]: Bez, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
};

function offsetPath(bz: Bez, off: number, steps = 80) {
  const pts: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = at(bz, t);
    const [x2, y2] = at(bz, Math.min(1, t + 0.002));
    const [x1, y1] = at(bz, Math.max(0, t - 0.002));
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    pts.push([x - ((y2 - y1) / len) * off, y + ((x2 - x1) / len) * off]);
  }
  return 'M' + pts.map((q) => q.map((n) => n.toFixed(1)).join(' ')).join('L');
}

function lots(bz: Bez, side: 1 | -1) {
  const segs: string[] = [];
  const n = 34;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const [x, y] = at(bz, t);
    const [x2, y2] = at(bz, Math.min(1, t + 0.002));
    const [x1, y1] = at(bz, Math.max(0, t - 0.002));
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -((y2 - y1) / len) * side, ny = ((x2 - x1) / len) * side;
    segs.push(`M${(x + nx * 16).toFixed(1)} ${(y + ny * 16).toFixed(1)}L${(x + nx * 78).toFixed(1)} ${(y + ny * 78).toFixed(1)}`);
  }
  return segs.join('');
}

export const PlatLines = memo(function PlatLines() {
  return (
    <svg className="pf-plat" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g fill="none" stroke="currentColor">
        {STREETS.map((s, i) => (
          <g key={i}>
            <path d={offsetPath(s, 14)} strokeWidth="1.1" />
            <path d={offsetPath(s, -14)} strokeWidth="1.1" />
            <path d={offsetPath(s, 0)} strokeWidth="0.6" strokeDasharray="10 12" />
            <path d={offsetPath(s, 78)} strokeWidth="0.7" />
            <path d={offsetPath(s, -78)} strokeWidth="0.7" />
            <path d={lots(s, 1) + lots(s, -1)} strokeWidth="0.6" />
          </g>
        ))}
        {CUL_DE_SACS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="34" strokeWidth="1.1" />)}
      </g>
    </svg>
  );
});
