// Places of worship: St. Patrick's Cathedral, Tooba Mosque, Abdullah Shah Ghazi.
import { THREE, mat, box, cyl, cone, dome, archRow, tree, flagPole } from './helpers.js';

function stripeTexture(a = '#1f8a4c', b = '#f5f5f0', stripes = 16) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const ctx = c.getContext('2d');
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? a : b;
    ctx.fillRect((i / stripes) * 256, 0, 256 / stripes + 1, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function stPatricks() {
  const g = new THREE.Group();
  const stone = mat(0xebe3d1);
  // Nave running north–south, facade facing +z
  g.add(box(9, 10, 22, stone, 0, 0, -2));
  const roofShape = new THREE.Shape([new THREE.Vector2(-4.7, 0), new THREE.Vector2(4.7, 0), new THREE.Vector2(0, 4.5)]);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 22, bevelEnabled: false });
  roofGeo.translate(0, 0, -13);
  const roof = new THREE.Mesh(roofGeo, mat(0x6d6f73));
  roof.position.y = 10;
  g.add(roof);
  // Side aisles
  g.add(box(3, 6, 20, stone, -6, 0, -2), box(3, 6, 20, stone, 6, 0, -2));
  for (const s of [-1, 1]) {
    const a = archRow(6, 18, 3.5, 1.2, 0, 0x4a5568, 1);
    a.rotation.y = (s * Math.PI) / 2;
    a.position.set(s * 7.52, 0, -2);
    g.add(a);
  }
  // Facade with two towers, rose window and a big doorway
  g.add(box(9, 12, 1, stone, 0, 0, 9.4));
  const gable = new THREE.Mesh(new THREE.ConeGeometry(4.6, 4, 3), stone);
  gable.rotation.y = Math.PI;
  gable.scale.set(1, 1, 0.12);
  gable.position.set(0, 14, 9.6);
  g.add(gable);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), mat(0x2f4f7f));
  rose.position.set(0, 9, 9.92);
  const roseRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.95, 16), mat(0xd1c6ad));
  roseRing.position.set(0, 9, 9.93);
  g.add(rose, roseRing);
  g.add(archRow(1, 3, 5, 0.2, 9.92, 0x3c2f25, 2.4));
  for (const x of [-5.6, 5.6]) {
    g.add(box(3, 16, 3, stone, x, 0, 9));
    g.add(cone(2, 5, 0x6d6f73, x, 16, 9, 4).rotateY(Math.PI / 4));
    g.add(archRow(1, 2, 3, 11, 10.52, 0x3c2f25, 1).translateX(x));
  }
  // Monument to Christ the King
  g.add(box(3, 1.5, 3, 0xd8d0bf, 0, 0, 18));
  g.add(cyl(0.7, 0.9, 11, 0xebe3d1, 0, 1.5, 18, 10));
  g.add(cyl(0.45, 0.6, 1.8, 0xf7f3ea, 0, 12.5, 18, 8));
  g.add(cyl(0.25, 0.25, 0.5, 0xf7f3ea, 0, 14.3, 18, 8));
  for (let i = 0; i < 4; i++) g.add(tree(-9 + i * 6, 15, 0.8));
  return {
    group: g,
    colliders: [
      { type: 'box', x: 0, z: -2, hw: 7.6, hd: 11.2 },
      { type: 'box', x: 0, z: 9, hw: 7.2, hd: 1.7 },
      { type: 'circle', x: 0, z: 18, r: 1.8 },
    ],
    reserve: 18,
    iconY: 22,
  };
}

export function tooba() {
  const g = new THREE.Group();
  const marble = mat(0xf7f6f1);
  // Courtyard platform
  g.add(box(36, 0.5, 34, 0xe5e1d8, 2, 0, 0));
  // Low circular wall with arched openings
  g.add(cyl(14, 14, 3.6, marble, 0, 0.5, 0, 48));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const op = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.2), mat(0x8fa3ad, { side: THREE.DoubleSide }));
    op.position.set(Math.sin(a) * 14.03, 2, Math.cos(a) * 14.03);
    op.rotation.y = a;
    g.add(op);
  }
  // The famous shallow dome
  const d = dome(14.2, marble, 'shallow', 48);
  d.position.y = 4.1;
  d.scale.y = 1.45;
  g.add(d);
  g.add(cyl(0.3, 0.5, 1.2, 0xd4af37, 0, 11.6, 0, 8));
  // Single slender minaret
  const mx = 17, mz = 9;
  g.add(cyl(1.1, 1.3, 30, marble, mx, 0.5, mz, 12));
  for (const y of [12, 22, 29]) g.add(cyl(1.7, 1.5, 0.6, marble, mx, y, mz, 12));
  g.add(cyl(0.9, 0.9, 3, marble, mx, 30.5, mz, 12));
  g.add(cone(1.0, 3.2, 0xf7f6f1, mx, 33.5, mz, 12));
  g.add(cyl(0.08, 0.08, 1.2, 0xd4af37, mx, 36.7, mz, 6));
  return {
    group: g,
    colliders: [
      { type: 'circle', x: 0, z: 0, r: 14.3 },
      { type: 'circle', x: mx, z: mz, r: 1.6 },
    ],
    reserve: 22,
    iconY: 18,
  };
}

export function shrine() {
  const g = new THREE.Group();
  // Hill
  const hill = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 3.5, 10), mat(0xb59a6e));
  hill.position.y = 1.75;
  g.add(hill);
  // Stairs up the south side
  for (let i = 0; i < 7; i++) g.add(box(2.6, 0.5 * (i + 1), 0.9, 0xe8e2d6, 0, 0, 9 - i * 0.65));
  // Shrine body
  const white = mat(0xf5f5f0);
  g.add(box(6, 4.2, 6, white, 0, 3.5, 0));
  g.add(box(6.4, 0.4, 6.4, 0x1f8a4c, 0, 7.7, 0));
  g.add(archRow(3, 5, 3, 3.6, 3.02, 0x1f6b3c));
  // Green-and-white striped dome
  const domeMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.6, flatShading: true });
  g.add(cyl(2.5, 2.5, 1, white, 0, 8.1, 0, 16));
  const d = dome(2.6, domeMat, 'pointed', 16);
  d.position.y = 9.1;
  g.add(d);
  g.add(cyl(0.08, 0.15, 1.4, 0xd4af37, 0, 12.3, 0, 6));
  // Corner mini-minarets and green flags
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    g.add(cyl(0.3, 0.3, 2.2, white, x, 7.7, z, 8));
    g.add(cone(0.4, 0.9, 0x1f8a4c, x, 9.9, z, 8));
  }
  const f1 = flagPole(-4, 4.5, 6, false);
  f1.position.y = 3.5;
  f1.userData.flag.children.forEach((c) => (c.material = mat(0x1f8a4c, { side: THREE.DoubleSide })));
  g.add(f1);
  return {
    group: g,
    colliders: [{ type: 'circle', x: 0, z: 0, r: 8.6 }],
    reserve: 12,
    iconY: 16,
  };
}
