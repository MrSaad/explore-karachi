// Modern Karachi: Teen Talwar, Bahria Icon, National Stadium, the airport,
// University of Karachi gate, Habib Bank Plaza, Shahrah-e-Faisal billboards.
import { THREE, mat, box, cyl, cone, tree, flagPole } from './helpers.js';
import { makeFacadeMaterial } from '../materials.js';

function facade(color) {
  const m = makeFacadeMaterial();
  m.color.setHex(color);
  return m;
}

function sword(h = 15) {
  const g = new THREE.Group();
  const white = mat(0xfafafa);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.55, h, 4), white);
  blade.position.y = h / 2;
  blade.scale.z = 0.35;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.45), mat(0xe8e8e8));
  guard.position.y = 0.1;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6), white);
  grip.position.y = -0.8;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), white);
  pommel.position.y = -1.7;
  g.add(blade, guard, grip, pommel);
  return g;
}

export function teenTalwar() {
  const g = new THREE.Group();
  g.add(cyl(4.2, 4.6, 1.2, 0xe5e0d5, 0, 0.5, 0, 16));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const s = sword(15);
    // hilt at the bottom, tip in the sky, leaning slightly inward
    s.position.set(Math.sin(a) * 2.2, 3.6, Math.cos(a) * 2.2);
    s.rotation.set(0, a, 0);
    s.rotateX(-0.1);
    g.add(s);
  }
  return { group: g, colliders: [{ type: 'circle', x: 0, z: 0, r: 5.6 }], reserve: 0, iconY: 21 };
}

export function bahriaIcon() {
  const g = new THREE.Group();
  const glass = mat(0x6f9fc0, { roughness: 0.15, metalness: 0.45 });
  const glass2 = mat(0x88b4cf, { roughness: 0.15, metalness: 0.45 });
  g.add(box(26, 8, 20, facade(0xd8d4cc)));
  // main tower — slightly tapered with a sloped crown
  const main = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 7.4, 80, 4), glass);
  main.rotation.y = Math.PI / 4;
  main.position.set(-3, 48, -2);
  g.add(main);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6.3, 10, 4), glass2);
  crown.rotation.y = Math.PI / 4;
  crown.position.set(-3, 93, -2);
  g.add(crown);
  g.add(cyl(0.2, 0.3, 8, 0xdddddd, -3, 98, -2, 6));
  // mullion bands
  for (let y = 12; y < 88; y += 6) {
    const r = 7.4 - ((y - 8) / 80) * 1.1;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.35, 4), mat(0xdfe7ec));
    band.rotation.y = Math.PI / 4;
    band.position.set(-3, y, -2);
    g.add(band);
  }
  // second, shorter tower
  const second = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 42, 4), glass2);
  second.rotation.y = Math.PI / 4;
  second.position.set(7, 29, 4);
  g.add(second);
  return {
    group: g,
    colliders: [{ type: 'box', x: 0, z: 0, hw: 13, hd: 10 }],
    reserve: 17,
    iconY: 14,
  };
}

export function stadium() {
  const g = new THREE.Group();
  const RX = 22, RZ = 17, SEG = 44;
  const field = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(0x5fa045));
  field.rotation.x = -Math.PI / 2;
  field.scale.set(RX - 3, RZ - 3, 1);
  field.position.y = 0.12;
  g.add(field);
  g.add(box(2.2, 0.06, 7, 0xd8c08c, 0, 0.12, 0));
  // tiered stands
  const seatColors = [0x0b6e3b, 0xf2f2f2, 0x1d6fb8, 0x0b6e3b];
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const x = Math.cos(a) * RX, z = Math.sin(a) * RZ;
    const seg = new THREE.Group();
    for (let t = 0; t < 3; t++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6 + t * 1.6, 1.6), mat(seatColors[(i + t) % seatColors.length]));
      step.position.set(0, (1.6 + t * 1.6) / 2, t * 1.5);
      seg.add(step);
    }
    seg.position.set(x, 0, z);
    seg.lookAt(x * 2, 0, z * 2);
    g.add(seg);
  }
  // floodlights
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x * (RX + 2), pz = z * (RZ + 2);
    g.add(cyl(0.4, 0.5, 22, 0xb8b8b8, px, 0, pz, 6));
    const panel = box(4, 2.4, 0.5, 0xfffbe0, px, 22, pz, { emissive: 0xfff3b0, emissiveIntensity: 0.5 });
    panel.lookAt(0, 22, 0);
    g.add(panel);
  }
  return {
    group: g,
    colliders: [
      { type: 'circle', x: 0, z: 0, r: 18 },
      { type: 'circle', x: -10, z: 0, r: 15 },
      { type: 'circle', x: 10, z: 0, r: 15 },
    ],
    reserve: 24,
    iconY: 14,
  };
}

function plane(x, z, rot, tail = 0x0b6e3b) {
  const g = new THREE.Group();
  const white = mat(0xf4f4f4);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 18, 10), white);
  body.rotation.x = Math.PI / 2;
  body.position.y = 2.2;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), white);
  nose.position.set(0, 2.2, 9);
  nose.scale.z = 1.6;
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4, 10), white);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 2.4, -11);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 3.2), white);
  wing.position.set(0, 1.8, 0.5);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 3), mat(tail));
  fin.position.set(0, 4.6, -11.5);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 1.8), white);
  stab.position.set(0, 2.6, -11.5);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 14, 10, 1, true, -0.4, 0.8), mat(tail, { side: THREE.DoubleSide }));
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 2.2;
  g.add(body, nose, tailCone, wing, fin, stab, stripe);
  for (const ex of [-5, 5]) g.add(cyl(0.6, 0.6, 2.4, 0xc8c8c8, ex, 0.6, 1.6, 8).rotateX(Math.PI / 2));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function airport() {
  const g = new THREE.Group();
  // terminal with a curved roof and glass front
  g.add(box(46, 7, 14, facade(0xe7e4dc)));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 48, 16, 1, false, -Math.PI / 2, Math.PI), mat(0xcfd6db));
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.35, 1, 1);
  roof.position.y = 7;
  g.add(roof);
  g.add(box(44, 5, 0.3, mat(0x8fc3dc, { roughness: 0.1, metalness: 0.4 }), 0, 0.8, 7.05));
  // signature domes on the landside
  for (let i = -2; i <= 2; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2efe8));
    d.position.set(i * 8, 7.5, 3);
    g.add(d);
  }
  // control tower
  g.add(cyl(1.4, 1.8, 22, 0xe7e4dc, 30, 0, -6, 10));
  g.add(cyl(3.2, 2.4, 2.8, mat(0x5d8fb0, { roughness: 0.2, metalness: 0.3 }), 30, 22, -6, 10));
  g.add(cyl(3.4, 3.4, 0.5, 0xe7e4dc, 30, 24.8, -6, 10));
  g.add(plane(-12, -22, Math.PI / 2 + 0.3));
  g.add(plane(14, -26, -Math.PI / 2 + 0.2, 0x1d6fb8));
  g.add(flagPole(-20, 12, 10), flagPole(20, 12, 10));
  return {
    group: g,
    colliders: [
      { type: 'box', x: 0, z: 0, hw: 23, hd: 7 },
      { type: 'circle', x: 30, z: -6, r: 2.2 },
      { type: 'circle', x: -12, z: -22, r: 3 },
      { type: 'circle', x: 14, z: -26, r: 3 },
    ],
    reserve: 0,
    iconY: 18,
  };
}

export function kuGate() {
  const g = new THREE.Group();
  const concrete = mat(0xe6dccb);
  for (const x of [-8, 8]) {
    g.add(box(2.6, 13, 2.6, concrete, x, 0, 0));
    g.add(box(3.2, 1, 3.2, 0xc9b99f, x, 0, 0));
  }
  g.add(box(19, 2, 2.6, concrete, 0, 13, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.45, 8, 24), mat(0x3d7a5a));
  ring.position.y = 17.6;
  g.add(ring);
  g.add(box(0.8, 2.6, 0.8, concrete, 0, 15, 0));
  const plaque = box(8, 1.2, 0.2, 0x0b6e3b, 0, 13.4, 1.4);
  g.add(plaque);
  for (let i = 0; i < 6; i++) g.add(tree(-14 + (i % 2) * 28, 6 + Math.floor(i / 2) * 6, 1));
  return {
    group: g,
    colliders: [
      { type: 'box', x: -8, z: 0, hw: 1.6, hd: 1.6 },
      { type: 'box', x: 8, z: 0, hw: 1.6, hd: 1.6 },
    ],
    rot: 2.4,
    reserve: 0,
    iconY: 21,
  };
}

export function habibPlaza() {
  const g = new THREE.Group();
  g.add(box(16, 5, 16, facade(0xd9d2c4)));
  g.add(box(11, 40, 11, facade(0xcfc6b6), 0, 5, 0));
  // vertical fins on all four faces
  for (let i = 0; i < 4; i++) {
    const side = new THREE.Group();
    for (let k = -2; k <= 2; k++) side.add(box(0.5, 38, 0.6, 0xa7998a, k * 2.2, 6, 5.7));
    side.rotation.y = (i * Math.PI) / 2;
    g.add(side);
  }
  g.add(box(12, 2.4, 12, 0x8f7f6c, 0, 45, 0));
  g.add(cyl(0.12, 0.12, 6, 0xcccccc, 2, 47.4, 2, 4));
  return { group: g, colliders: [{ type: 'box', x: 0, z: 0, hw: 8, hd: 8 }], reserve: 11, iconY: 52 };
}

const ADS = [
  ['LAWN SALE', '50% OFF', '#d6336c', '#fff3bf'],
  ['DIL SE CHAI', 'har ghoont mein Karachi', '#7f4f24', '#ffe8cc'],
  ['BIRYANI KING', 'double boti!', '#e8590c', '#fff'],
  ['SASTA MOBILE', '4G • 5G • 6G?', '#1c7ed6', '#e7f5ff'],
  ['CRICKET TONIGHT', 'Karachi vs Lahore', '#0b6e3b', '#fff'],
  ['SHAADI HALL', 'bookings open', '#ae3ec9', '#fff0f6'],
];

function adTexture(i) {
  const [title, sub, bg, fg] = ADS[i % ADS.length];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(220, 20, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 128, 62);
  ctx.font = '20px sans-serif';
  ctx.fillText(sub, 128, 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A few towering billboards along a road (pass the road path in ctx). */
export function billboards({ road, x: cx, z: cz }) {
  const g = new THREE.Group();
  const colliders = [];
  if (!road) return { group: g, colliders, reserve: 0, iconY: 12 };
  // find the path point nearest to our centre, then walk along it
  let best = 0, bestD = Infinity;
  road.path.forEach((p, i) => {
    const d = Math.hypot(p[0] - cx, p[1] - cz);
    if (d < bestD) { bestD = d; best = i; }
  });
  let k = 0;
  for (let off = -30; off <= 30; off += 15) {
    const i = Math.max(1, Math.min(road.path.length - 2, best + Math.round(off / 3)));
    const [px, pz] = road.path[i];
    const [nx, nz] = road.path[i + 1];
    let dx = nx - px, dz = nz - pz;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const side = k % 2 ? 1 : -1;
    const ox = px + dz * side * (road.width / 2 + 5) - cx;
    const oz = pz - dx * side * (road.width / 2 + 5) - cz;
    const b = new THREE.Group();
    b.add(cyl(0.35, 0.45, 10, 0x7d7d7d, 0, 0, 0, 6));
    const panel = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 0.4), [
      mat(0x555555), mat(0x555555), mat(0x555555), mat(0x555555),
      new THREE.MeshStandardMaterial({ map: adTexture(k), roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12, emissiveMap: adTexture(k) }),
      new THREE.MeshStandardMaterial({ map: adTexture(k + 3), roughness: 0.6 }),
    ]);
    panel.position.y = 12;
    b.add(panel);
    b.position.set(ox, 0, oz);
    // face the road
    b.rotation.y = Math.atan2(-dz * side, dx * side) + Math.PI / 2;
    b.lookAt(px - cx, 0, pz - cz);
    g.add(b);
    colliders.push({ type: 'circle', x: ox, z: oz, r: 0.6 });
    k++;
  }
  return { group: g, colliders, reserve: 0, iconY: 18 };
}
