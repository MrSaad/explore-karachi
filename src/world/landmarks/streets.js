// Street life: Burns Road food stalls, Tariq Road shopfronts, Zamzama cafés,
// and Lyari's football ground.
import { THREE, mat, box, cyl, cone, sphere, umbrella, stall, table, charpai, tree } from './helpers.js';

/** Points along a road near (cx, cz), offset to either side. Local coords. */
function alongRoad(road, cx, cz, { span = 30, step = 6, offset = 2 } = {}) {
  const out = [];
  if (!road) return out;
  let best = 0,
    bestD = Infinity;
  road.path.forEach((p, i) => {
    const d = Math.hypot(p[0] - cx, p[1] - cz);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  // walk along the path accumulating distance in both directions
  const collect = (dir) => {
    let dist = 0;
    let i = best;
    let next = step / 2;
    while (i + dir >= 0 && i + dir < road.path.length && dist < span / 2) {
      const [ax, az] = road.path[i];
      const [bx, bz] = road.path[i + dir];
      const seg = Math.hypot(bx - ax, bz - az);
      while (next <= dist + seg && next < span / 2) {
        const t = (next - dist) / seg;
        const px = ax + (bx - ax) * t,
          pz = az + (bz - az) * t;
        let dx = (bx - ax) * dir,
          dz = (bz - az) * dir;
        const l = Math.hypot(dx, dz) || 1;
        dx /= l;
        dz /= l;
        for (const side of [-1, 1]) {
          const o = road.width / 2 + offset;
          const x = px + dz * side * o,
            z = pz - dx * side * o;
          out.push({ x: x - cx, z: z - cz, face: Math.atan2(px - x, pz - z), side });
        }
        next += step;
      }
      dist += seg;
      i += dir;
    }
  };
  collect(1);
  collect(-1);
  return out;
}

const AWNINGS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x8338ec, 0xffb703, 0x3a86ff];

export function burnsRoad({ road, x: cx, z: cz, rand }) {
  const g = new THREE.Group();
  const colliders = [];
  const spots = alongRoad(road, cx, cz, { span: 40, step: 6, offset: 1.6 });
  spots.forEach((s, i) => {
    if (i % 3 === 2) {
      // a big copper deg (pot) of nihari on a stand
      g.add(cyl(0.9, 0.7, 0.9, 0x8a8a8a, s.x, 0, s.z, 10));
      g.add(cyl(1.0, 0.9, 1.0, 0xb87333, s.x, 0.9, s.z, 12));
      g.add(cyl(0.95, 0.95, 0.05, 0x7b2d12, s.x, 1.85, s.z, 12));
      colliders.push({ type: 'circle', x: s.x, z: s.z, r: 1.1 });
    } else {
      const st = stall(s.x, s.z, s.face, AWNINGS[i % AWNINGS.length]);
      g.add(st);
      colliders.push({ type: 'circle', x: s.x, z: s.z, r: 1.2 });
    }
  });
  // plastic tables spilling into the lane
  for (let i = 0; i < 5; i++) {
    const s = spots[(i * 3 + 1) % Math.max(1, spots.length)];
    if (!s) break;
    const tx = s.x * 0.7,
      tz = s.z * 0.7;
    g.add(table(tx + (rand() - 0.5) * 2, tz + (rand() - 0.5) * 2, 0xf2f2f2));
  }
  return { group: g, colliders, reserve: 0, iconY: 8 };
}

function kurtaRack(x, z, face, rand) {
  const g = new THREE.Group();
  g.add(box(2.4, 0.08, 0.08, 0x777777, 0, 2.2, 0));
  for (const px of [-1.2, 1.2]) g.add(box(0.08, 2.2, 0.08, 0x777777, px, 0, 0));
  const cols = [0xd81b60, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xf4511e, 0xffffff];
  for (let i = 0; i < 5; i++) {
    const k = box(0.4, 1.1, 0.05, cols[Math.floor(rand() * cols.length)], -0.9 + i * 0.45, 1.0, 0);
    g.add(k);
  }
  g.position.set(x, 0, z);
  g.rotation.y = face;
  return g;
}

export function tariqRoad({ road, x: cx, z: cz, rand }) {
  const g = new THREE.Group();
  const colliders = [];
  const spots = alongRoad(road, cx, cz, { span: 46, step: 5, offset: 1.8 });
  spots.forEach((s, i) => {
    if (i % 2) g.add(kurtaRack(s.x, s.z, s.face, rand));
    else {
      // mannequin in shalwar kameez
      const m = new THREE.Group();
      const col = AWNINGS[i % AWNINGS.length];
      m.add(cyl(0.22, 0.3, 1.0, col, 0, 0.4, 0, 8));
      m.add(cyl(0.18, 0.2, 0.55, col, 0, 1.4, 0, 8));
      m.add(sphere(0.14, 0xe0e0e0, 0, 2.1, 0, 8, 6));
      m.add(cyl(0.05, 0.05, 0.4, 0x888888, 0, 0, 0, 4));
      m.position.set(s.x, 0, s.z);
      g.add(m);
    }
    colliders.push({ type: 'circle', x: s.x, z: s.z, r: 0.8 });
  });
  // Chaand Raat lights strung across the road
  const BULBS = [0xffd60a, 0xff006e, 0x06d6a0, 0x3a86ff];
  for (let i = 0; i + 1 < spots.length; i += 4) {
    const a = spots[i],
      b = spots[i + 1];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const c = BULBS[k % BULBS.length];
      const bulb = sphere(
        0.12,
        mat(c, { emissive: c, emissiveIntensity: 0.9 }),
        a.x + (b.x - a.x) * t,
        5.5 - Math.sin(t * Math.PI) * 0.8,
        a.z + (b.z - a.z) * t,
        6,
        4,
      );
      g.add(bulb);
    }
  }
  return { group: g, colliders, reserve: 0, iconY: 8 };
}

export function zamzama({ road, x: cx, z: cz }) {
  const g = new THREE.Group();
  const colliders = [];
  const spots = alongRoad(road, cx, cz, { span: 40, step: 8, offset: 2.2 });
  const cols = [0x2a9d8f, 0xf2f2f2, 0x264653, 0xe9c46a];
  spots.forEach((s, i) => {
    g.add(umbrella(s.x, s.z, cols[i % cols.length]));
    g.add(table(s.x + Math.sin(s.face + Math.PI) * 1.2, s.z + Math.cos(s.face + Math.PI) * 1.2, 0xf2f2f2));
    colliders.push({ type: 'circle', x: s.x, z: s.z, r: 1.4 });
    if (i % 2 === 0) {
      const p = cyl(0.5, 0.4, 0.8, 0xc2b8a3, s.x + 2, 0, s.z, 8);
      const plant = sphere(0.7, 0x4f8a3c, s.x + 2, 1.3, s.z, 6, 5);
      g.add(p, plant);
    }
  });
  return { group: g, colliders, reserve: 0, iconY: 8 };
}

export function lyariFootball() {
  const g = new THREE.Group();
  const cx = 0,
    cz = -3;
  // dusty pitch with chalk lines
  g.add(box(19, 0.06, 12, 0xc9a86b, cx, 0.05, cz));
  const white = mat(0xf5f5f5);
  g.add(box(19, 0.02, 0.2, white, cx, 0.12, cz - 6), box(19, 0.02, 0.2, white, cx, 0.12, cz + 6));
  g.add(box(0.2, 0.02, 12, white, cx - 9.5, 0.12, cz), box(0.2, 0.02, 12, white, cx + 9.5, 0.12, cz));
  g.add(box(0.2, 0.02, 12, white, cx, 0.12, cz));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.1, 20), white);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, 0.13, cz);
  g.add(ring);
  // goals
  for (const s of [-1, 1]) {
    const x = cx + s * 9.5;
    g.add(box(0.15, 2, 0.15, white, x, 0, cz - 2.2), box(0.15, 2, 0.15, white, x, 0, cz + 2.2));
    g.add(box(0.15, 0.15, 4.5, white, x, 2, cz));
  }
  g.add(sphere(0.22, 0xffffff, cx + 2, 0.22, cz + 1, 8, 6));
  // a small boxing ring beside the pitch
  const bx = 14,
    bz = 2;
  g.add(box(5, 0.8, 5, 0x1d3557, bx, 0, bz));
  for (const [px, pz] of [
    [-2.3, -2.3],
    [2.3, -2.3],
    [-2.3, 2.3],
    [2.3, 2.3],
  ])
    g.add(cyl(0.1, 0.1, 1.6, 0xe63946, bx + px, 0.8, bz + pz, 6));
  for (const y of [1.4, 1.9]) {
    g.add(box(4.6, 0.05, 0.05, 0xf5f5f5, bx, y, bz - 2.3), box(4.6, 0.05, 0.05, 0xf5f5f5, bx, y, bz + 2.3));
    g.add(box(0.05, 0.05, 4.6, 0xf5f5f5, bx - 2.3, y, bz), box(0.05, 0.05, 4.6, 0xf5f5f5, bx + 2.3, y, bz));
  }
  // a mural wall in Brazil colours
  g.add(box(10, 3, 0.4, 0xffdf00, cx - 2, 0, cz - 8.5));
  g.add(box(6, 1.6, 0.42, 0x009c3b, cx - 2, 0.7, cz - 8.5));
  g.add(sphere(0.6, 0x002776, cx - 2, 1.5, cz - 8.2, 10, 8));
  for (let i = 0; i < 3; i++) g.add(tree(-12, -8 + i * 5, 0.9));
  return {
    group: g,
    colliders: [
      { type: 'box', x: bx, z: bz, hw: 2.6, hd: 2.6 },
      { type: 'box', x: cx - 2, z: cz - 8.5, hw: 5, hd: 0.3 },
    ],
    reserve: 13,
    iconY: 8,
  };
}
