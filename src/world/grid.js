// Each neighbourhood is laid out on its own rotated grid of plots. Every fourth
// row/column is left open as a gali (lane), which the ground painter draws and
// the building generator skips, so lanes and buildings always line up.
import { BUILDING_STYLES } from './layout.js';
import { mulberry32 } from '../utils/math.js';

const mod = (a, b) => ((a % b) + b) % b;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Iterate grid cells for a district. Yields { x, z, angle, size, lane, edge }. */
export function* districtCells(d) {
  const style = BUILDING_STYLES[d.style];
  if (!style) return;
  const s = style.spacing;
  const a = d.grid || 0;
  const ca = Math.cos(a),
    sa = Math.sin(a);
  const K = Math.ceil(d.r / s) + 1;
  const rand = mulberry32(hashStr(d.id));
  for (let i = -K; i <= K; i++) {
    for (let j = -K; j <= K; j++) {
      const lx = i * s,
        lz = j * s;
      const x = d.center[0] + lx * ca - lz * sa;
      const z = d.center[1] + lx * sa + lz * ca;
      const dist = Math.hypot(lx, lz);
      // wobbly edge so districts don't look like perfect circles
      const edge = d.r * (0.82 + rand() * 0.25);
      if (dist > edge) continue;
      const lane = mod(i, 4) === 3 || mod(j, 4) === 3;
      yield { x, z, angle: a, size: s, lane, falloff: dist / d.r, rand: rand() };
    }
  }
}

export { hashStr };
