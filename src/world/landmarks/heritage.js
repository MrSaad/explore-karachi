// Heritage landmarks: Mazar-e-Quaid, Frere Hall, Empress Market, Merewether Tower,
// Wazir Mansion, Mohatta Palace, the KMC Building, Chaukhandi Tombs.
import { THREE, mat, box, cyl, cone, dome, archRow, tree, flagPole } from './helpers.js';

const SANDSTONE = 0xd8b46e;
const SANDSTONE_DARK = 0xb98f4f;

/** Pyramid roof with 4 sides, aligned to the axes. */
function pyramid(w, h, color, y) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(w * 0.7071, h, 4), mat(color));
  m.rotation.y = Math.PI / 4;
  m.position.y = y + h / 2;
  return m;
}

/** Pitched roof running along x. */
function gableRoof(w, d, h, color, y) {
  const shape = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color));
  m.position.y = y;
  return m;
}

function clockFaces(size, y, color = 0xfdf6e3) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(size * 0.32, 16), mat(color));
    const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.08, size * 0.25), mat(0x222222));
    hand.position.set(0, size * 0.08, 0.02);
    face.add(hand);
    const a = (i * Math.PI) / 2;
    face.position.set(Math.sin(a) * (size / 2 + 0.03), y, Math.cos(a) * (size / 2 + 0.03));
    face.rotation.y = a;
    g.add(face);
  }
  return g;
}

function pinnacles(w, y, h, color) {
  const g = new THREE.Group();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(cyl(0.25, 0.3, h * 0.5, color, (x * w) / 2, y, (z * w) / 2, 6));
    g.add(cone(0.35, h * 0.6, color, (x * w) / 2, y + h * 0.5, (z * w) / 2, 6));
  }
  return g;
}

export function mazar() {
  const g = new THREE.Group();
  const marble = mat(0xf6f3ec);
  // Raised terrace with steps
  g.add(box(26, 1.4, 26, 0xe9e3d6));
  for (let i = 0; i < 4; i++) g.add(box(8, 0.35 * (4 - i), 1.2, 0xe9e3d6, 0, 0, 13 + i * 1.2 - 0.6));
  // Tomb body
  const body = box(12, 7.5, 12, marble, 0, 1.4, 0);
  g.add(body);
  // Big pointed arches on each face (dark recess)
  for (let i = 0; i < 4; i++) {
    const a = archRow(1, 7, 6, 1.8, 6.02, 0x5f6f73, 4.6);
    a.rotation.y = (i * Math.PI) / 2;
    g.add(a);
  }
  // Signature curved square dome — a lathe with 4 sides
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = 8.49 * Math.pow(1 - t, 0.75) * (1 - 0.15 * Math.sin(t * Math.PI));
    pts.push(new THREE.Vector2(Math.max(0.01, r), t * 10));
  }
  const domeGeo = new THREE.LatheGeometry(pts, 4);
  const domeMesh = new THREE.Mesh(domeGeo, marble);
  domeMesh.rotation.y = Math.PI / 4;
  domeMesh.position.y = 8.9;
  g.add(domeMesh);
  g.add(cyl(0.2, 0.35, 1.6, 0xd4af37, 0, 18.6, 0, 8));
  // Fountains & walkways in four directions
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const path = box(4.5, 0.1, 16, 0xdcd3c0, 0, 0.02, 0);
    path.position.set(Math.sin(a) * 21, 0.05, Math.cos(a) * 21);
    path.rotation.y = a;
    g.add(path);
    for (let k = 0; k < 4; k++) {
      const f = box(1.4, 0.3, 1.4, 0x4fb0d6, 0, 0, 0);
      f.position.set(Math.sin(a) * (16 + k * 3), 0.15, Math.cos(a) * (16 + k * 3));
      g.add(f);
    }
  }
  g.add(flagPole(-11, 11, 10), flagPole(11, 11, 10));
  return {
    group: g,
    colliders: [{ type: 'box', x: 0, z: 0, hw: 13, hd: 13 }],
    reserve: 30,
    iconY: 22,
  };
}

export function frereHall() {
  const g = new THREE.Group();
  const stone = mat(SANDSTONE);
  const band = mat(0xb5583f);
  g.add(box(18, 8, 9, stone));
  for (const y of [2.6, 5.4]) g.add(box(18.2, 0.35, 9.2, band, 0, y, 0));
  g.add(box(18.4, 0.5, 9.4, SANDSTONE_DARK, 0, 8, 0));
  g.add(gableRoof(18, 9, 3.6, 0x7b4a3a, 8.4));
  g.add(archRow(7, 16, 4.4, 2.8, 4.52, 0x5c4a3a));
  g.add(archRow(7, 16, 2.4, 0.2, 4.52, 0x5c4a3a));
  // Central tower
  g.add(box(4.4, 15, 4.4, stone, 0, 0, 4.6));
  g.add(box(4.6, 0.35, 4.6, band, 0, 10, 4.6));
  g.add(archRow(1, 4, 3, 11, 6.82, 0x4e3e30, 1.6));
  const spire = pyramid(4.6, 6, 0x6e4537, 15);
  spire.position.z = 4.6;
  g.add(spire);
  g.add(pinnacles(4.4, 15, 3, SANDSTONE_DARK).translateZ(4.6));
  // Side turrets
  for (const x of [-9, 9]) {
    g.add(cyl(0.9, 0.9, 10, stone, x, 0, 4.5, 8));
    g.add(cone(1.1, 2.4, 0x6e4537, x, 10, 4.5, 8));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(tree(Math.cos(a) * 15, Math.sin(a) * 12, 1.1));
  }
  return {
    group: g,
    colliders: [
      { type: 'box', x: 0, z: 0, hw: 9.4, hd: 4.8 },
      { type: 'box', x: 0, z: 4.6, hw: 2.4, hd: 2.4 },
    ],
    reserve: 18,
    iconY: 25,
  };
}

export function empressMarket() {
  const g = new THREE.Group();
  const stone = mat(0xdcb87a);
  // Four wings around a courtyard
  g.add(box(20, 7, 4, stone, 0, 0, 8));
  g.add(box(20, 7, 4, stone, 0, 0, -8));
  g.add(box(4, 7, 12, stone, 8, 0, 0));
  g.add(box(4, 7, 12, stone, -8, 0, 0));
  for (const [x, z, w, d] of [[0, 8, 20, 4], [0, -8, 20, 4], [8, 0, 4, 12], [-8, 0, 4, 12]]) {
    g.add(box(w + 0.4, 0.5, d + 0.4, SANDSTONE_DARK, x, 7, z));
    g.add(gableRoof(w, d, 2, 0x8d5b45, 7.4).translateX(x).translateZ(z));
  }
  g.add(archRow(6, 18, 4.5, 0.3, 10.03, 0x5c4a3a));
  // Clock tower over the main entrance
  g.add(box(5, 22, 5, stone, 0, 0, 10));
  g.add(box(5.4, 0.5, 5.4, SANDSTONE_DARK, 0, 16, 10));
  g.add(clockFaces(5, 19, 0xfdf6e3).translateZ(10));
  g.add(pyramid(5.4, 6, 0x6e4537, 22).translateZ(10));
  g.add(pinnacles(5, 22, 3, SANDSTONE_DARK).translateZ(10));
  // Spice sacks and stalls out front
  const spices = [0xc1121f, 0xf4a261, 0xe9c46a, 0x6a994e, 0x9c6644, 0xffb703];
  for (let i = 0; i < 12; i++) {
    const x = -9 + (i % 6) * 3.4, z = 14 + Math.floor(i / 6) * 1.8;
    g.add(cyl(0.45, 0.55, 0.8, 0xe8dcc0, x, 0, z, 8));
    g.add(cone(0.42, 0.4, spices[i % spices.length], x, 0.8, z, 8));
  }
  return {
    group: g,
    colliders: [
      { type: 'box', x: 0, z: 0, hw: 10.2, hd: 10.2 },
      { type: 'box', x: 0, z: 10, hw: 2.7, hd: 2.7 },
    ],
    reserve: 18,
    iconY: 32,
  };
}

export function merewether() {
  const g = new THREE.Group();
  const stone = mat(0xd8b980);
  g.add(box(6, 1.2, 6, SANDSTONE_DARK, 0, 0.2, 0));
  g.add(box(5, 22, 5, stone, 0, 1.4, 0));
  for (const y of [6, 12, 17.5]) g.add(box(5.4, 0.4, 5.4, SANDSTONE_DARK, 0, y, 0));
  for (let i = 0; i < 4; i++) {
    const a = archRow(1, 4, 5, 2, 2.52, 0x4e3e30, 2);
    a.rotation.y = (i * Math.PI) / 2;
    g.add(a);
    const w = archRow(2, 4, 3, 13, 2.52, 0x4e3e30, 0.9);
    w.rotation.y = (i * Math.PI) / 2;
    g.add(w);
  }
  g.add(clockFaces(5, 20, 0xfdf6e3));
  g.add(pyramid(5.2, 7, 0x7a6a58, 23.4));
  g.add(pinnacles(5, 23.4, 3.5, SANDSTONE_DARK));
  return {
    group: g,
    colliders: [{ type: 'circle', x: 0, z: 0, r: 5 }],
    reserve: 0,
    iconY: 34,
  };
}

export function wazirMansion() {
  const g = new THREE.Group();
  const stone = mat(0xd6b88a);
  g.add(box(9, 11, 8, stone));
  for (const y of [3.6, 7.2]) g.add(box(9.3, 0.3, 8.3, SANDSTONE_DARK, 0, y, 0));
  g.add(box(9.6, 0.6, 8.6, SANDSTONE_DARK, 0, 11, 0));
  // wooden jharokha balconies
  for (const y of [3.9, 7.5]) {
    g.add(box(6, 2.2, 1.2, 0x6b3e26, 0, y, 4.5));
    g.add(box(6.3, 0.25, 1.4, 0x4a2a18, 0, y + 2.2, 4.5));
  }
  g.add(archRow(3, 7, 3, 0, 4.03, 0x3d2c20));
  g.add(flagPole(0, 2.5, 4).translateY(11.5));
  return {
    group: g,
    colliders: [{ type: 'box', x: 0, z: 0, hw: 4.6, hd: 4.6 }],
    reserve: 8,
    iconY: 16,
  };
}

export function mohatta() {
  const g = new THREE.Group();
  const pink = mat(0xd98f7e);
  const yellow = mat(0xe3c27a);
  g.add(box(18, 0.8, 12, 0xcfae80));
  g.add(box(16, 6, 10, pink, 0, 0.8, 0));
  g.add(box(16.4, 0.4, 10.4, yellow, 0, 6.8, 0));
  g.add(box(10, 4, 7, pink, 0, 7.2, 0));
  g.add(box(10.4, 0.35, 7.4, yellow, 0, 11.2, 0));
  g.add(archRow(7, 14, 4, 1, 5.03, 0x6b3a35));
  g.add(archRow(4, 8, 2.8, 7.6, 3.53, 0x6b3a35));
  // central dome on a drum
  g.add(cyl(2.6, 2.6, 1.4, yellow, 0, 11.5, 0, 12));
  const d = dome(2.7, pink, 'onion');
  d.position.y = 12.9;
  g.add(d);
  g.add(cyl(0.12, 0.2, 1.2, 0xd4af37, 0, 16.6, 0, 6));
  // corner chhatris
  for (const [x, z] of [[-7, -4], [7, -4], [-7, 4], [7, 4]]) {
    for (const [px, pz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) g.add(cyl(0.12, 0.12, 2, yellow, x + px, 7.2, z + pz, 5));
    const c = dome(1.25, pink, 'onion', 10);
    c.position.set(x, 9.2, z);
    g.add(c);
  }
  // jharokha balconies on the front
  for (const x of [-5, 5]) g.add(box(2.2, 1.6, 1, yellow, x, 3.2, 5.4));
  for (let i = 0; i < 6; i++) g.add(tree(-12 + i * 4.8, 10, 0.9, 0x6aa84f));
  return {
    group: g,
    colliders: [{ type: 'box', x: 0, z: 0, hw: 9, hd: 6 }],
    reserve: 16,
    iconY: 20,
  };
}

export function kmc() {
  const g = new THREE.Group();
  const stone = mat(0xe2c792);
  g.add(box(20, 9, 10, stone));
  g.add(box(20.4, 0.5, 10.4, SANDSTONE_DARK, 0, 9, 0));
  g.add(archRow(8, 18, 3.6, 0.4, 5.03, 0x5c4a3a));
  g.add(archRow(8, 18, 3.2, 4.8, 5.03, 0x5c4a3a));
  // central clock tower with a dome
  g.add(box(5, 18, 5, stone, 0, 0, 2.5));
  g.add(clockFaces(5, 15.5).translateZ(2.5));
  g.add(cyl(2.3, 2.6, 1.2, SANDSTONE_DARK, 0, 18, 2.5, 12));
  const d = dome(2.4, 0xe2c792, 'half');
  d.position.set(0, 19.2, 2.5);
  g.add(d);
  for (const x of [-9, 9]) {
    const c = dome(1.6, 0xe2c792, 'half', 10);
    c.position.set(x, 9.5, 4);
    g.add(c);
  }
  return {
    group: g,
    colliders: [{ type: 'box', x: 0, z: 0, hw: 10.2, hd: 5.2 }, { type: 'box', x: 0, z: 2.5, hw: 2.6, hd: 2.6 }],
    reserve: 13,
    iconY: 24,
  };
}

export function chaukhandi({ rand }) {
  const g = new THREE.Group();
  const stone = [0xd7b46a, 0xcfa95c, 0xdcbc78];
  const colliders = [];
  for (let i = 0; i < 26; i++) {
    const x = (rand() - 0.5) * 26, z = (rand() - 0.5) * 22;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue;
    const levels = 3 + Math.floor(rand() * 4);
    const rot = (rand() - 0.5) * 0.2;
    const grave = new THREE.Group();
    let y = 0;
    for (let k = 0; k < levels; k++) {
      const s = 1 - k * 0.11;
      grave.add(box(1.6 * s, 0.4, 2.6 * s, stone[(i + k) % 3], 0, y, 0));
      y += 0.4;
    }
    // carved turban-like top on men's graves
    if (rand() < 0.5) grave.add(cyl(0.25, 0.3, 0.5, 0xc79a50, 0, y, 0.5, 6));
    grave.position.set(x, 0, z);
    grave.rotation.y = rot;
    g.add(grave);
    colliders.push({ type: 'circle', x, z, r: 1.3 });
  }
  // one canopy tomb (chhatri) on pillars
  for (const [px, pz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) g.add(cyl(0.22, 0.22, 3.5, 0xcfa95c, 15 + px, 0, pz, 6));
  g.add(box(4, 0.4, 4, 0xcfa95c, 15, 3.5, 0));
  const d = dome(2, 0xd7b46a, 'half', 8);
  d.position.set(15, 3.9, 0);
  g.add(d);
  colliders.push({ type: 'box', x: 15, z: 0, hw: 2, hd: 2 });
  return { group: g, colliders, reserve: 20, iconY: 8 };
}
