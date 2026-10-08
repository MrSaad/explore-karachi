// The waterfront: Port Grand, Do Darya, Sea View, Hawke's Bay, Manora,
// Karachi Port and Boat Basin.
import {
  THREE,
  mat,
  box,
  cyl,
  cone,
  dome,
  tree,
  palm,
  umbrella,
  stall,
  table,
  charpai,
  camel,
  boat,
  ship,
  flagPole,
} from './helpers.js';

const BULBS = [0xffd60a, 0xff006e, 0x06d6a0, 0x3a86ff, 0xfb5607];

function stringLights(points, y = 3.2) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i],
      [bx, bz] = points[i + 1];
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      const sag = Math.sin(t * Math.PI) * 0.5;
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 4),
        mat(BULBS[(i + k) % BULBS.length], { emissive: BULBS[(i + k) % BULBS.length], emissiveIntensity: 0.9 }),
      );
      b.position.set(ax + (bx - ax) * t, y - sag, az + (bz - az) * t);
      g.add(b);
    }
  }
  return g;
}

function deck(w, d, x = 0, z = 0) {
  const g = new THREE.Group();
  g.add(box(w, 0.4, d, 0x9c7a55, x, -0.3, z));
  for (let px = -w / 2 + 1; px < w / 2; px += 3) {
    for (let pz = -d / 2 + 1; pz < d / 2; pz += 3) g.add(cyl(0.2, 0.2, 2.5, 0x5c4a3a, x + px, -2.8, z + pz, 5));
  }
  return g;
}

export function portGrand({ rand }) {
  const g = new THREE.Group();
  // pier stretching out over the harbour (+z is the water side)
  g.add(deck(8, 26, 0, 13));
  const colliders = [];
  for (let i = 0; i < 5; i++) {
    const z = 4 + i * 4.6;
    const side = i % 2 ? 1 : -1;
    g.add(stall(side * 2.6, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, BULBS[i]));
    colliders.push({ type: 'box', x: side * 2.6, z, hw: 0.7, hd: 1.2 });
  }
  // railings
  for (const x of [-4, 4]) g.add(box(0.12, 1, 26, 0xdedede, x, 0, 13));
  g.add(box(8, 1, 0.12, 0xdedede, 0, 0, 26));
  // string lights along the pier
  const pts = [];
  for (let z = 0; z <= 26; z += 4) pts.push([0, z]);
  g.add(stringLights(pts, 3.6));
  for (let z = 0; z <= 26; z += 8) g.add(cyl(0.06, 0.06, 3.6, 0x888888, 0, 0, z, 4));
  // the ancient banyan tree at the landward end
  const banyan = new THREE.Group();
  banyan.add(cyl(1.0, 1.4, 4, 0x6b5136, 0, 0, 0, 8));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    banyan.add(cyl(0.12, 0.12, 4.2, 0x7a5c3e, Math.cos(a) * 3, 0, Math.sin(a) * 3, 4));
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), mat(0x4f8a3c));
    c.position.set(Math.cos(a) * 2.5, 5, Math.sin(a) * 2.5);
    banyan.add(c);
  }
  banyan.add(new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 0), mat(0x568f40)).translateY(6));
  banyan.position.set(-9, 0, -3);
  g.add(banyan);
  colliders.push({ type: 'circle', x: -9, z: -3, r: 1.5 });
  g.add(boat(9, 16, 0.3, 0x1d6fb8, 6), boat(-9, 22, -0.2, 0xe63946, 5));
  return {
    group: g,
    colliders,
    walkable: [
      [
        [-4, -1],
        [4, -1],
        [4, 26],
        [-4, 26],
      ],
    ],
    reserve: 12,
    iconY: 8,
  };
}

export function doDarya() {
  const g = new THREE.Group();
  g.add(deck(34, 20, 0, 8));
  const colliders = [];
  // three restaurant pavilions
  for (let i = 0; i < 3; i++) {
    const x = -11 + i * 11;
    g.add(box(8, 3.2, 4, [0xf1e3c6, 0xe8d5b7, 0xf6ead8][i], x, 0, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.2, 4), mat([0x9b2226, 0x005f73, 0xbb3e03][i]));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.6);
    roof.position.set(x, 4.3, 0);
    g.add(roof);
    colliders.push({ type: 'box', x, z: 0, hw: 4, hd: 2 });
    for (let k = 0; k < 3; k++) {
      const tx = x - 2.6 + k * 2.6,
        tz = 6 + (k % 2) * 3.5;
      g.add(table(tx, tz, k % 2 ? 0xf2f2f2 : 0xd94848));
      colliders.push({ type: 'circle', x: tx, z: tz, r: 1.2 });
    }
  }
  for (const x of [-17, 17]) g.add(box(0.12, 1, 20, 0xdedede, x, 0, 8));
  g.add(box(34, 1, 0.12, 0xdedede, 0, 0, 18));
  g.add(
    stringLights(
      [
        [-16, 17],
        [-6, 17],
        [6, 17],
        [16, 17],
      ],
      3,
    ),
  );
  for (const x of [-16, 16]) g.add(cyl(0.06, 0.06, 3, 0x888888, x, 0, 17, 4));
  return {
    group: g,
    colliders,
    walkable: [
      [
        [-17, -3],
        [17, -3],
        [17, 18],
        [-17, 18],
      ],
    ],
    reserve: 14,
    iconY: 9,
  };
}

export function seaView({ rand }) {
  const g = new THREE.Group();
  const colliders = [];
  const cols = [0xe63946, 0xffb703, 0x219ebc, 0x8338ec, 0x06d6a0];
  for (let i = 0; i < 7; i++) {
    const x = -24 + i * 8 + rand() * 3,
      z = 4 + rand() * 4;
    g.add(umbrella(x, z, cols[i % cols.length]));
  }
  const camels = [
    [-10, -2, 0.4, 0xe63946],
    [-4, 2, 2.2, 0x8338ec],
    [12, -1, -0.6, 0x06d6a0],
  ];
  for (const [x, z, r, s] of camels) {
    g.add(camel(x, z, r, s));
    colliders.push({ type: 'circle', x, z, r: 1.3 });
  }
  // horse
  const horse = camel(18, 3, 1.4, 0xffb703);
  horse.scale.set(0.8, 0.75, 0.8);
  g.add(horse);
  colliders.push({ type: 'circle', x: 18, z: 3, r: 1 });
  // bhutta (corn) and chaat stalls on the promenade
  for (let i = 0; i < 3; i++) {
    const x = -16 + i * 16;
    g.add(stall(x, -8, 0, cols[(i + 2) % cols.length]));
    colliders.push({ type: 'box', x, z: -8, hw: 1.2, hd: 0.7 });
  }
  for (let i = 0; i < 6; i++) g.add(palm(-26 + i * 10, -10, 6 + rand() * 2, rand));
  return { group: g, colliders, reserve: 10, iconY: 8 };
}

function turtle(x, z, s = 1, rot = 0) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.6 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5b7a3a));
  shell.scale.set(1, 0.5, 1.25);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 6, 5), mat(0x8a9a6a));
  head.position.set(0, 0.1 * s, 0.8 * s);
  g.add(shell, head);
  for (const [fx, fz] of [
    [-0.55, 0.35],
    [0.55, 0.35],
    [-0.4, -0.5],
    [0.4, -0.5],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.05, 0.2 * s), mat(0x8a9a6a));
    f.position.set(fx * s, 0.03, fz * s);
    g.add(f);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function hawkesBay({ rand }) {
  const g = new THREE.Group();
  const colliders = [];
  const hutColors = [0xf4a261, 0x2a9d8f, 0xe76f51, 0x8ecae6, 0xffb703];
  for (let i = 0; i < 5; i++) {
    const x = -14 + i * 7,
      z = -8 + (i % 2) * 2;
    g.add(box(4.5, 3, 4, 0xf3ead6, x, 0, z));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.6, 4), mat(hutColors[i]));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(x, 3.8, z);
    g.add(roof);
    g.add(box(1.2, 2, 0.1, 0x6b4226, x, 0, z + 2.02));
    colliders.push({ type: 'box', x, z, hw: 2.3, hd: 2.1 });
  }
  // nesting turtles and a trail of hatchlings to the sea
  g.add(turtle(-4, 4, 1.3, 2.6), turtle(6, 6, 1.2, 3.0));
  for (let i = 0; i < 9; i++) g.add(turtle(2 + rand() * 6 - 3, 7 + i * 0.9, 0.25, Math.PI + (rand() - 0.5)));
  colliders.push({ type: 'circle', x: -4, z: 4, r: 0.9 }, { type: 'circle', x: 6, z: 6, r: 0.9 });
  for (let i = 0; i < 4; i++) g.add(palm(-18 + i * 11, -14, 6, rand));
  return { group: g, colliders, reserve: 14, iconY: 8 };
}

export function manora() {
  const g = new THREE.Group();
  // Lighthouse: octagonal, tapering, with a lantern room
  const white = mat(0xf4f1ea);
  g.add(cyl(2.4, 2.6, 1.2, 0xc9b99f, 0, 0, 0, 8));
  g.add(cyl(1.5, 2.2, 20, white, 0, 1.2, 0, 8));
  g.add(cyl(1.4, 1.4, 1.2, 0xd62828, 0, 7.5, 0, 8));
  g.add(cyl(1.3, 1.3, 1.2, 0xd62828, 0, 14, 0, 8));
  g.add(cyl(2.2, 2.2, 0.4, 0x333333, 0, 21.2, 0, 10));
  const lantern = cyl(1.2, 1.2, 2, mat(0xfff3b0, { emissive: 0xffe066, emissiveIntensity: 1.2 }), 0, 21.6, 0, 10);
  g.add(lantern);
  g.add(cone(1.5, 1.6, 0xd62828, 0, 23.6, 0, 10));
  // Shri Varun Dev Mandir — a sandstone temple with a curved shikhara
  const tx = 10,
    tz = -5;
  const stone = mat(0xd2b07a);
  g.add(box(6, 0.8, 6, 0xbfa070, tx, 0, tz));
  g.add(box(4.5, 4, 4.5, stone, tx, 0.8, tz));
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(Math.max(0.05, 2.4 * Math.cos(t * Math.PI * 0.5) ** 0.7), t * 7));
  }
  const shikhara = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), stone);
  shikhara.position.set(tx, 4.8, tz);
  g.add(shikhara);
  g.add(cyl(0.5, 0.4, 0.6, 0xd4af37, tx, 11.8, tz, 8));
  const flag = flagPole(tx + 1.5, tz + 1.5, 4, false);
  flag.position.y = 4.8;
  flag.userData.flag.children.forEach((c) => (c.material = mat(0xf77f00, { side: THREE.DoubleSide })));
  g.add(flag);
  // old fort wall fragments
  g.add(box(10, 2.2, 1.4, 0xb39b78, -9, 0, 6), box(1.4, 2.2, 7, 0xb39b78, -14, 0, 3));
  return {
    group: g,
    colliders: [
      { type: 'circle', x: 0, z: 0, r: 2.6 },
      { type: 'box', x: tx, z: tz, hw: 3, hd: 3 },
      { type: 'box', x: -9, z: 6, hw: 5, hd: 0.7 },
      { type: 'box', x: -14, z: 3, hw: 0.7, hd: 3.5 },
    ],
    reserve: 15,
    iconY: 27,
  };
}

export function port() {
  const g = new THREE.Group();
  const colliders = [];
  // gantry cranes along the wharf edge (+z = water)
  for (let i = 0; i < 3; i++) {
    const x = -14 + i * 14;
    const c = new THREE.Group();
    const steel = mat([0xd62828, 0x1d6fb8, 0xf4a261][i]);
    for (const lx of [-3, 3]) for (const lz of [-2, 3]) c.add(box(0.7, 16, 0.7, steel, lx, 0, lz));
    c.add(box(7, 1.2, 6, steel, 0, 14, 0.5));
    c.add(box(1.4, 1.2, 26, steel, 0, 16, 9));
    c.add(box(2.4, 2, 2.4, 0x333333, 0, 13.5, 12));
    c.position.set(x, 0, 2);
    g.add(c);
    colliders.push({ type: 'box', x, z: 2.5, hw: 3.4, hd: 2.9 });
  }
  // container stacks
  const cc = [0xd62828, 0x1d3557, 0xf77f00, 0x2a9d8f, 0x6a4c93, 0xe9c46a, 0x8d99ae];
  let k = 0;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 6; i++) {
      const h = 1 + ((i + r) % 3);
      for (let s = 0; s < h; s++) g.add(box(5.6, 2.4, 2.4, cc[k++ % cc.length], -16 + i * 6.2, s * 2.4, -6 - r * 3.2));
    }
  }
  colliders.push({ type: 'box', x: -0.5, z: -9.2, hw: 19, hd: 5 });
  // a container ship alongside
  g.add(ship(0, 14, Math.PI, 0x1d3557, 36));
  return { group: g, colliders, rot: 0.73, reserve: 20, iconY: 20 };
}

export function boatBasin({ rand }) {
  const g = new THREE.Group();
  const colliders = [];
  const cols = [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8338ec];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = Math.cos(a) * 9,
      z = Math.sin(a) * 7;
    g.add(stall(x, z, -a + Math.PI / 2, cols[i]));
    colliders.push({ type: 'circle', x, z, r: 1.3 });
  }
  for (let i = 0; i < 6; i++) {
    const x = (rand() - 0.5) * 10,
      z = (rand() - 0.5) * 6;
    if (i % 2) g.add(table(x, z));
    else g.add(charpai(x, z, rand() * 3));
    colliders.push({ type: 'circle', x, z, r: 1 });
  }
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pts.push([Math.cos(a) * 11, Math.sin(a) * 9]);
  }
  g.add(stringLights(pts, 3.4));
  for (let i = 0; i < 10; i += 2) g.add(cyl(0.06, 0.06, 3.4, 0x888888, pts[i][0], 0, pts[i][1], 4));
  return { group: g, colliders, reserve: 14, iconY: 8 };
}
