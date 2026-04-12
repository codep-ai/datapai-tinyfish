/* ─────────────────────────────────────────────────────────────────────────
   DATAP.AI Animated Logo — A·B·C·D flowing clockwise around a central "i"
   Same dash-flow animation technique as PlatformArchitecture.tsx
   ───────────────────────────────────────────────────────────────────────── */

const G = "#2e8b57";   // brand green
const GL = "#e8f5ec";  // light green fill
const GD = "#1a6b3d";  // dark green for text

/** Animated curved arrow along an SVG arc path */
function FlowArc({ d, id, speed = "2s" }: { d: string; id: string; speed?: string }) {
  return (
    <g>
      <defs>
        <marker id={id} markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0,6 2.5,0 5" fill={G} />
        </marker>
      </defs>
      {/* Static faint background path */}
      <path d={d} fill="none" stroke={G} strokeWidth={2.2} strokeOpacity={0.15}
        markerEnd={`url(#${id})`} />
      {/* Animated flowing overlay */}
      <path d={d} fill="none" stroke={G} strokeWidth={2.2}
        strokeDasharray="6 10" markerEnd={`url(#${id})`}>
        <animate attributeName="stroke-dashoffset" from="32" to="0" dur={speed} repeatCount="indefinite" />
      </path>
    </g>
  );
}

/** Rounded box with a single letter */
function LetterBox({ cx, cy, letter }: { cx: number; cy: number; letter: string }) {
  const s = 18; // half-size
  return (
    <g>
      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2}
        rx={5} fill={GL} stroke={G} strokeWidth={2} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
        fill={GD} fontSize={18} fontWeight={700} fontFamily="Arial,sans-serif">
        {letter}
      </text>
    </g>
  );
}

/** Central database cylinder with "i" */
function CenterDB({ cx, cy }: { cx: number; cy: number }) {
  const w = 16, h = 22, ew = 16, eh = 5; // cylinder dims
  return (
    <g>
      {/* Cylinder body */}
      <rect x={cx - w} y={cy - h / 2} width={w * 2} height={h} rx={2} fill={GL} stroke={G} strokeWidth={1.8} />
      {/* Top ellipse */}
      <ellipse cx={cx} cy={cy - h / 2} rx={ew} ry={eh} fill={GL} stroke={G} strokeWidth={1.8} />
      {/* Bottom ellipse (half) */}
      <path d={`M${cx - ew},${cy + h / 2} A${ew},${eh} 0 0,0 ${cx + ew},${cy + h / 2}`}
        fill={GL} stroke={G} strokeWidth={1.8} />
      {/* "i" label */}
      <text x={cx} y={cy + 4} textAnchor="middle" dominantBaseline="central"
        fill={GD} fontSize={16} fontWeight={700} fontFamily="serif" fontStyle="italic">
        i
      </text>
    </g>
  );
}

export default function AnimatedLogo({ size = 36, animate = true }: { size?: number; animate?: boolean }) {
  // Viewbox: 120x120, center at 60,60
  const V = 120;
  const C = V / 2; // center

  // Box positions: top(A), right(C), bottom(B), left(D)
  const A = { x: C, y: 16 };       // top
  const Cr = { x: 104, y: C };     // right  (C = Customer)
  const B = { x: C, y: 104 };      // bottom
  const D = { x: 16, y: C };       // left

  // Arc paths (clockwise: A→C, C→B, B→D, D→A)
  // Using quadratic bezier curves for smooth arcs
  const arcs = [
    { d: `M${A.x + 18},${A.y + 6} Q${90},${18} ${Cr.x - 6},${Cr.y - 18}`, id: "ac" },
    { d: `M${Cr.x - 6},${Cr.y + 18} Q${90},${102} ${B.x + 18},${B.y - 6}`, id: "cb" },
    { d: `M${B.x - 18},${B.y - 6} Q${30},${102} ${D.x + 6},${D.y + 18}`, id: "bd" },
    { d: `M${D.x + 6},${D.y - 18} Q${30},${18} ${A.x - 18},${A.y + 6}`, id: "da" },
  ];

  return (
    <svg viewBox={`0 0 ${V} ${V}`} width={size} height={size} className="flex-shrink-0">
      {/* Flowing arrows */}
      {animate
        ? arcs.map((a, i) => <FlowArc key={a.id} d={a.d} id={a.id} speed={`${1.6 + i * 0.2}s`} />)
        : arcs.map(a => (
            <path key={a.id} d={a.d} fill="none" stroke={G} strokeWidth={2.2} strokeOpacity={0.4} />
          ))
      }

      {/* Letter boxes */}
      <LetterBox cx={A.x} cy={A.y} letter="A" />
      <LetterBox cx={Cr.x} cy={Cr.y} letter="C" />
      <LetterBox cx={B.x} cy={B.y} letter="B" />
      <LetterBox cx={D.x} cy={D.y} letter="D" />

      {/* Central database "i" */}
      <CenterDB cx={C} cy={C} />
    </svg>
  );
}
