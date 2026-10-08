// Small geometry + randomness helpers shared across the game.
// Map coordinates are [x, z] in world units: +x is east, +z is south (the sea).

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG so the city is identical on every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
export const range = (rand, a, b) => a + rand() * (b - a);

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1];
    const xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from point to segment, plus the closest-point parameter t. */
export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + dx * t, cz = az + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), t, cx, cz };
}

export function distToPolyline(px, pz, pts) {
  let best = { d: Infinity, seg: 0, t: 0, cx: 0, cz: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const r = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (r.d < best.d) best = { ...r, seg: i };
  }
  return best;
}

export function polylineLength(pts) {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  }
  return len;
}

/** Precompute cumulative lengths so we can sample a polyline by distance. */
export function makePath(pts) {
  const cum = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    cum.push(cum[i] + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
  }
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Sample position + heading at distance s along a path made by makePath. */
export function samplePath(path, s) {
  const { pts, cum, length } = path;
  s = clamp(s, 0, length);
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < s) i++;
  const segLen = cum[i + 1] - cum[i] || 1;
  const t = (s - cum[i]) / segLen;
  const [ax, az] = pts[i];
  const [bx, bz] = pts[i + 1];
  const dx = bx - ax, dz = bz - az;
  const l = Math.hypot(dx, dz) || 1;
  return { x: ax + dx * t, z: az + dz * t, dx: dx / l, dz: dz / l };
}

/** Chaikin smoothing — turns blocky polylines into gentle curves. */
export function smoothPolyline(pts, iterations = 2, closed = false) {
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    const next = [];
    const n = out.length;
    const limit = closed ? n : n - 1;
    if (!closed) next.push(out[0]);
    for (let i = 0; i < limit; i++) {
      const a = out[i], b = out[(i + 1) % n];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) next.push(out[n - 1]);
    out = next;
  }
  return out;
}

/** Shortest signed angle from a to b. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dampAngle(current, target, lambda, dt) {
  return current + angleDelta(current, target) * (1 - Math.exp(-lambda * dt));
}

export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * Catmull-Rom spline through every vertex (so road junctions stay put),
 * resampled roughly every `step` units.
 */
export function splinePolyline(pts, step = 4, closed = false) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const get = (i) => {
    if (closed) return pts[((i % n) + n) % n];
    return pts[clamp(i, 0, n - 1)];
  };
  const out = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const count = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < count; k++) {
      const t = k / count, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
