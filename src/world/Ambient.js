// City life: street trees, traffic (driving on the left, as in Pakistan),
// pedestrians, crows, kites and boats.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROADS, DISTRICTS, PARKS, n } from './layout.js';
import { districtCells } from './grid.js';
import { mat, swayMaterial, WIND } from './materials.js';
import { mulberry32, makePath, samplePath, pick, range } from '../utils/math.js';
import { buildRickshawModel } from '../entities/Rickshaw.js';
import { Character, randomOutfit } from '../entities/Character.js';
import { truckArtTexture } from '../utils/truckArt.js';
import { boat, ship } from './landmarks/helpers.js';

const COASTAL_ROADS = new Set(['sea-view', 'ittehad', 'clifton', 'clifton-2', 'zamzama', 'dha-cross', 'sandspit']);

// ---------------------------------------------------------------------- trees & street furniture
const TREE_KINDS = {
  // neem: the city's everyday shade tree
  neem: { greens: [0x5e9a46, 0x6aa84f, 0x4f8a3c, 0x7aae55, 0x588f41] },
  // gulmohar: wide, flat crown that bursts flame-red in early summer
  gulmohar: { greens: [0xe8542c, 0xd9481f, 0xf06a3a, 0x6f9a52] },
  // amaltas: cascades of yellow
  amaltas: { greens: [0xf2c230, 0xe8b923, 0x7aae55] },
};

function crownGeometry(kind) {
  const parts = [];
  if (kind === 'gulmohar') {
    for (const [x, y, z, r] of [
      [0, 3.1, 0, 1.6],
      [1.3, 2.9, 0.3, 1.2],
      [-1.2, 2.95, -0.4, 1.25],
      [0.2, 3.3, -1.1, 1.1],
    ]) {
      const g = new THREE.IcosahedronGeometry(r, 0);
      g.scale(1.25, 0.55, 1.25);
      g.translate(x, y, z);
      parts.push(g);
    }
  } else {
    for (const [x, y, z, r] of [
      [0, 3.0, 0, 1.5],
      [0.8, 3.7, 0.3, 1.05],
      [-0.7, 3.5, -0.4, 1.1],
      [0.1, 2.6, 0.9, 0.95],
    ]) {
      const g = new THREE.IcosahedronGeometry(r, 0);
      g.translate(x, y, z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

function buildTrees(scene, collision, terrain, rand) {
  const trees = []; // { x, z, s, r, kind }
  const palms = [];
  const shrubs = [];

  const pickKind = () => {
    const k = rand();
    return k < 0.8 ? 'neem' : k < 0.93 ? 'gulmohar' : 'amaltas';
  };
  const plant = (list, x, z, s, extra = {}) => {
    list.push({ x, z, s, r: rand() * Math.PI * 2, ...extra });
    collision.addCircle(x, z, 0.45, 'tree');
  };
  const nearOtherRoad = (road, x, z) =>
    ROADS.some((r) => r !== road && r.path.some((q) => Math.hypot(q[0] - x, q[1] - z) < r.width / 2 + 1.5));

  // avenues: trees along every road, palms along the coast
  for (const road of ROADS) {
    const palmy = COASTAL_ROADS.has(road.id);
    const step = palmy ? 9 : 11;
    const path = makePath(road.path);
    for (let s = step / 2; s < path.length; s += step) {
      const p = samplePath(path, s);
      for (const side of [-1, 1]) {
        if (rand() < 0.2) continue;
        const off = road.width / 2 + 2.6;
        const x = p.x + p.dz * side * off,
          z = p.z - p.dx * side * off;
        if (!terrain.isLand(x, z) || !collision.isFree(x, z, 1.1) || nearOtherRoad(road, x, z)) continue;
        if (palmy) plant(palms, x, z, 0.85 + rand() * 0.4);
        else plant(trees, x, z, 0.85 + rand() * 0.4, { kind: pickKind() });
        // a low shrub between some of the trees
        if (rand() < 0.35) {
          const q = samplePath(path, s + step / 2);
          const sx = q.x + q.dz * side * off,
            sz = q.z - q.dx * side * off;
          if (terrain.isLand(sx, sz) && collision.isFree(sx, sz, 0.8))
            shrubs.push({ x: sx, z: sz, s: 0.6 + rand() * 0.5, r: rand() * 6 });
        }
      }
    }
  }

  // trees inside neighbourhoods: in the galis and courtyards
  for (const d of DISTRICTS) {
    const chance =
      { villas: 0.45, bungalow: 0.5, campus: 0.5, apartments: 0.25, midrise: 0.2, huts: 0.3 }[d.style] ?? 0.12;
    for (const c of districtCells(d)) {
      if (!c.lane || rand() > chance) continue;
      const x = c.x + (rand() - 0.5) * 2,
        z = c.z + (rand() - 0.5) * 2;
      if (!terrain.isLand(x, z) || terrain.isRoad(x, z) || terrain.isBlocked(x, z) || !collision.isFree(x, z, 1.3))
        continue;
      if (d.style === 'huts' || d.id === 'clifton') plant(palms, x, z, 0.8 + rand() * 0.35);
      else plant(trees, x, z, 0.75 + rand() * 0.45, { kind: pickKind() });
    }
  }

  // shady rings around the bigger parks
  for (const park of PARKS) {
    if (park.r < 9) continue;
    const n = Math.floor((Math.PI * 2 * park.r * 0.88) / 5.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.2;
      const x = park.at[0] + Math.cos(a) * park.r * 0.88,
        z = park.at[1] + Math.sin(a) * park.r * 0.88;
      if (terrain.isLand(x, z) && collision.isFree(x, z, 1.2))
        plant(trees, x, z, 0.8 + rand() * 0.4, { kind: pickKind() });
    }
  }

  // and a scattering everywhere else
  for (let i = 0; i < 900; i++) {
    const x = range(rand, -330, 330),
      z = range(rand, -300, 120);
    if (!terrain.isLand(x, z) || terrain.isRoad(x, z) || terrain.isBlocked(x, z) || !collision.isFree(x, z, 1.4))
      continue;
    if (rand() < 0.5) plant(trees, x, z, 0.8 + rand() * 0.5, { kind: pickKind() });
    else shrubs.push({ x, z, s: 0.6 + rand() * 0.6, r: rand() * 6 });
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const make = (geo, material, list, setup, colorFn, shadow = true) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((t, i) => {
      dummy.rotation.set(0, 0, 0);
      setup(t);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (colorFn) m.setColorAt(i, color.setHex(colorFn(t)));
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
  };
  const place = (t, sy = 1) => {
    dummy.position.set(t.x, 0, t.z);
    dummy.rotation.set(0, t.r, 0);
    dummy.scale.set(t.s, t.s * sy, t.s);
  };

  const trunk = new THREE.CylinderGeometry(0.16, 0.28, 2.4, 6);
  trunk.translate(0, 1.2, 0);
  make(trunk, mat(0x7a5636), trees, (t) => place(t));
  for (const kind of Object.keys(TREE_KINDS)) {
    const list = trees.filter((t) => t.kind === kind);
    const greens = TREE_KINDS[kind].greens;
    make(
      crownGeometry(kind),
      swayMaterial(0xffffff, { amp: 0.06, base: 2 }),
      list,
      (t) => place(t),
      (t) => greens[Math.floor(t.r * 7) % greens.length],
    );
  }

  const palmTrunk = new THREE.CylinderGeometry(0.14, 0.24, 6, 6);
  palmTrunk.translate(0, 3, 0);
  const fronds = new THREE.ConeGeometry(2.4, 1.1, 7, 2, true);
  fronds.rotateX(Math.PI);
  fronds.translate(0, 6.1, 0);
  make(palmTrunk, mat(0x8a6a48), palms, (t) => place(t));
  make(fronds, swayMaterial(0x4f9442, { amp: 0.07, base: 5.6, side: THREE.DoubleSide }), palms, (t) => place(t));

  const shrubGeo = new THREE.IcosahedronGeometry(0.8, 0);
  shrubGeo.scale(1.3, 0.75, 1.3);
  shrubGeo.translate(0, 0.5, 0);
  const shrubColors = [0x5b8f3f, 0x6aa84f, 0x4f7f36, 0xd6247a, 0x7aae55];
  make(
    shrubGeo,
    swayMaterial(0xffffff, { amp: 0.04, base: 0.4 }),
    shrubs,
    (t) => place(t),
    (t) => shrubColors[Math.floor(t.r * 3) % shrubColors.length],
    false,
  );
}

/** Electricity poles with sagging wires, streetlights, parked bikes and fruit carts. */
function buildStreetFurniture(scene, collision, terrain, rand) {
  const poles = [];
  const lamps = [];
  const bikes = [];
  const carts = [];
  const wirePts = [];

  for (const road of ROADS) {
    const path = makePath(road.path);
    if (road.kind === 'highway') {
      // tall streetlights down both sides
      for (let s = 6; s < path.length; s += 20) {
        const p = samplePath(path, s);
        for (const side of [-1, 1]) {
          const off = road.width / 2 + 1.2;
          const x = p.x + p.dz * side * off,
            z = p.z - p.dx * side * off;
          if (!terrain.isLand(x, z) || !collision.isFree(x, z, 0.5)) continue;
          lamps.push({ x, z, yaw: Math.atan2(-p.dz * side, p.dx * side) });
          collision.addCircle(x, z, 0.25, 'pole');
        }
      }
      continue;
    }
    // wooden/concrete electricity poles on one side, wires sagging between them
    const side = road.id.length % 2 ? 1 : -1;
    const off = road.width / 2 + 1.5;
    let prev = null;
    for (let s = 4; s < path.length; s += 16) {
      const p = samplePath(path, s);
      const x = p.x + p.dz * side * off,
        z = p.z - p.dx * side * off;
      if (!terrain.isLand(x, z) || !collision.isFree(x, z, 0.5)) {
        prev = null;
        continue;
      }
      poles.push({ x, z, yaw: Math.atan2(p.dx, p.dz), tf: rand() < 0.15 });
      collision.addCircle(x, z, 0.25, 'pole');
      if (prev) {
        // three wires, each a catenary-ish sag between cross-arm ends
        for (const w of [-0.9, 0, 0.9]) {
          const ax = prev.x + prev.cx * w,
            az = prev.z + prev.cz * w;
          const bx = x + p.dz * w,
            bz = z - p.dx * w;
          const N = 6;
          for (let i = 0; i < N; i++) {
            const t0 = i / N,
              t1 = (i + 1) / N;
            const sag = (t) => 7.1 - Math.sin(t * Math.PI) * 0.9;
            wirePts.push(
              ax + (bx - ax) * t0,
              sag(t0),
              az + (bz - az) * t0,
              ax + (bx - ax) * t1,
              sag(t1),
              az + (bz - az) * t1,
            );
          }
        }
      }
      prev = { x, z, cx: p.dz, cz: -p.dx }; // cross-arm direction
    }

    // parked motorbikes and fruit carts along the kerb of busier streets
    if (road.kind === 'street' || rand() < 0.5) {
      for (let s = 8; s < path.length; s += 7) {
        if (rand() > 0.35) continue;
        const p = samplePath(path, s);
        const sd = rand() < 0.5 ? 1 : -1;
        const o = road.width / 2 + 0.7;
        const x = p.x + p.dz * sd * o,
          z = p.z - p.dx * sd * o;
        if (!terrain.isLand(x, z) || !collision.isFree(x, z, 0.8)) continue;
        if (rand() < 0.8) {
          bikes.push({
            x,
            z,
            yaw: Math.atan2(p.dx, p.dz) + Math.PI / 2 + (rand() - 0.5) * 0.4,
            color: pick(rand, [0xb22222, 0x1d1d1f, 0x2f4f7f, 0xb22222]),
          });
        } else {
          carts.push({
            x,
            z,
            yaw: Math.atan2(p.dx, p.dz),
            color: pick(rand, [0xf4a261, 0xe63946, 0xffd60a, 0x6a994e, 0xff7b00]),
          });
          collision.addCircle(x, z, 0.8, 'cart');
        }
      }
    }
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const make = (geo, material, list, setup, shadow = true) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.yaw, 0);
      dummy.scale.set(1, 1, 1);
      if (setup) setup(t);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (t.color !== undefined) m.setColorAt(i, color.setHex(t.color));
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
  };
  const merged = (parts) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  const bx = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const cy = (rt, rb, h, x, y, z, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z);

  // electricity poles (+ occasional transformer)
  make(merged([cy(0.12, 0.18, 7.6, 0, 0, 0), bx(2.2, 0.12, 0.12, 0, 7.0, 0)]), mat(0x8c8579), poles, null);
  make(
    merged([bx(0.7, 0.9, 0.6, 0, 4.6, 0.35)]),
    mat(0x5c6670),
    poles.filter((p) => p.tf),
    null,
  );
  if (wirePts.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
    scene.add(
      new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 })),
    );
  }

  // streetlights with a warm lamp head
  make(merged([cy(0.1, 0.16, 8.5, 0, 0, 0), bx(0.12, 0.12, 2.2, 0, 8.4, 1.0)]), mat(0x9aa0a6), lamps, null);
  make(
    merged([bx(0.5, 0.18, 0.8, 0, 8.25, 2.0)]),
    mat(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.6 }),
    lamps,
    null,
    false,
  );

  // parked motorbikes (frame + wheels)
  const wheelA = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8).rotateZ(Math.PI / 2).translate(0, 0.3, 0.62);
  const wheelB = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8).rotateZ(Math.PI / 2).translate(0, 0.3, -0.62);
  make(
    merged([bx(0.32, 0.45, 1.3, 0, 0.45, 0), bx(0.3, 0.12, 0.6, 0, 0.9, -0.2), bx(0.7, 0.05, 0.05, 0, 1.2, 0.55)]),
    mat(0xffffff, { roughness: 0.5 }),
    bikes,
    null,
  );
  make(
    merged([wheelA, wheelB]),
    mat(0x1b1b1d),
    bikes.map((b) => ({ ...b, color: undefined })),
    null,
    false,
  );

  // fruit carts (thela) with a heap of produce
  make(
    merged([bx(1.2, 0.12, 2.0, 0, 0.75, 0), bx(0.08, 0.75, 0.08, 0.5, 0, 0.8), bx(0.08, 0.75, 0.08, -0.5, 0, 0.8)]),
    mat(0x8a5a3b),
    carts.map((c) => ({ ...c, color: undefined })),
    null,
  );
  const heap = new THREE.IcosahedronGeometry(0.55, 0).scale(1.6, 0.6, 2.4).translate(0, 1.05, 0);
  make(heap, mat(0xffffff), carts, null);
  const cartWheel = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 10).rotateZ(Math.PI / 2);
  make(
    merged([cartWheel.clone().translate(0.65, 0.38, -0.4), cartWheel.clone().translate(-0.65, 0.38, -0.4)]),
    mat(0x3d3d3d),
    carts.map((c) => ({ ...c, color: undefined })),
    null,
    false,
  );
}

// ---------------------------------------------------------------------- vehicles
const CAR_COLORS = [0xf2f2f2, 0xd9d9d9, 0x1d1d1f, 0xb22222, 0x2f4f7f, 0xc0c0c0, 0x8b8b83, 0xe8d8b0];

function carModel(rand) {
  const g = new THREE.Group();
  const body = mat(pick(rand, CAR_COLORS), { roughness: 0.45 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 4), body);
  b.position.y = 0.75;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.1), mat(0x2b3a48, { roughness: 0.2 }));
  cab.position.set(0, 1.4, -0.2);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.9), body);
  roof.position.set(0, 1.76, -0.2);
  g.add(b, cab, roof);
  const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 8);
  wheel.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-0.85, 1.25],
    [0.85, 1.25],
    [-0.85, -1.25],
    [0.85, -1.25],
  ]) {
    const w = new THREE.Mesh(wheel, mat(0x1b1b1d));
    w.position.set(x, 0.34, z);
    g.add(w);
  }
  return g;
}

function busModel(rand, seed) {
  // the famous decorated Karachi minibus / W-11
  const g = new THREE.Group();
  const base = pick(rand, ['#1f9d55', '#e63946', '#3a86ff', '#ff9f1c', '#8338ec']);
  const art = new THREE.MeshStandardMaterial({ map: truckArtTexture(seed, base, 512, 128), roughness: 0.6 });
  const plain = mat(new THREE.Color(base).getHex(), { roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 9), [art, art, plain, plain, plain, plain]);
  body.position.y = 1.8;
  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.7, 8), mat(0x2b3a48, { roughness: 0.2 }));
  windows.position.y = 2.3;
  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 6), mat(0xd9b44a));
  roofRack.position.set(0, 3.15, -0.5);
  g.add(body, windows, roofRack);
  // passengers riding on the roof — a very Karachi touch
  if (rand() < 0.5) {
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), mat(pick(rand, [0xf2ede0, 0x9fb8c9, 0x7a8b6f])));
      p.position.set(-0.5 + i * 0.5, 3.6, -1 + i * 0.8);
      g.add(p);
    }
  }
  const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
  wheel.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-1.1, 3],
    [1.1, 3],
    [-1.1, -3],
    [1.1, -3],
  ]) {
    const w = new THREE.Mesh(wheel, mat(0x1b1b1d));
    w.position.set(x, 0.5, z);
    g.add(w);
  }
  return g;
}

function truckModel(rand, seed) {
  // Bedford-style truck with a carved wooden crown over the cab
  const g = new THREE.Group();
  const base = pick(rand, ['#ffb703', '#06d6a0', '#e63946', '#219ebc']);
  const art = new THREE.MeshStandardMaterial({ map: truckArtTexture(seed + 7, base, 384, 128), roughness: 0.6 });
  const plain = mat(new THREE.Color(base).getHex());
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.2, 2.2), plain);
  cab.position.set(0, 1.6, 3.2);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.5), art);
  crown.position.set(0, 3.3, 4.1);
  crown.rotation.x = -0.25;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 6), [art, art, mat(0x8a5a3b), plain, art, art]);
  bed.position.set(0, 1.8, -1);
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.2, 5.6), mat(0xd8c7a6));
  load.position.set(0, 3.4, -1);
  g.add(cab, crown, bed, load);
  const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 8);
  wheel.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-1.15, 3.2],
    [1.15, 3.2],
    [-1.15, -2.5],
    [1.15, -2.5],
  ]) {
    const w = new THREE.Mesh(wheel, mat(0x1b1b1d));
    w.position.set(x, 0.55, z);
    g.add(w);
  }
  return g;
}

function bikeModel(rand) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.6), mat(pick(rand, [0xb22222, 0x1d1d1f, 0x2f4f7f])));
  frame.position.y = 0.7;
  const rider = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, 0.4),
    mat(pick(rand, [0xf2ede0, 0x9fb8c9, 0x3f5a73, 0xd9cbb0])),
  );
  rider.position.set(0, 1.4, -0.1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(0xc68e66));
  head.position.set(0, 1.95, -0.05);
  g.add(frame, rider, head);
  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.12, 8);
  wheel.rotateZ(Math.PI / 2);
  for (const z of [0.7, -0.7]) {
    const w = new THREE.Mesh(wheel, mat(0x1b1b1d));
    w.position.set(0, 0.33, z);
    g.add(w);
  }
  return g;
}

const RICKSHAW_COLORS = [
  [0x1f9d55, '#1f9d55'],
  [0x2a6fdb, '#2a6fdb'],
  [0xe63946, '#e63946'],
  [0xf4a261, '#f4a261'],
];

function buildTraffic(scene, rand) {
  const vehicles = [];
  const paths = ROADS.map((r) => ({ road: r, path: makePath(r.path) }));
  const total = paths.reduce((a, p) => a + p.path.length, 0);
  const COUNT = 90;
  for (const { road, path } of paths) {
    const k = Math.max(1, Math.round((path.length / total) * COUNT));
    for (let i = 0; i < k; i++) {
      const roll = rand();
      let model, len, speed;
      if (roll < 0.33) {
        const [body, art] = pick(rand, RICKSHAW_COLORS);
        model = buildRickshawModel({ body, art, seed: Math.floor(rand() * 1000), shadows: false });
        model.scale.setScalar(1.3);
        len = 3.6;
        speed = range(rand, 9, 13);
      } else if (roll < 0.63) {
        model = carModel(rand);
        len = 4.2;
        speed = range(rand, 11, 17);
      } else if (roll < 0.8) {
        model = bikeModel(rand);
        len = 2;
        speed = range(rand, 12, 18);
      } else if (roll < 0.92) {
        model = busModel(rand, Math.floor(rand() * 1000));
        len = 9;
        speed = range(rand, 8, 12);
      } else {
        model = truckModel(rand, Math.floor(rand() * 1000));
        len = 8;
        speed = range(rand, 7, 10);
      }
      model.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      scene.add(model);
      const dir = rand() < 0.5 ? 1 : -1;
      vehicles.push({
        model,
        road,
        path,
        len,
        speed,
        cur: speed,
        dir,
        s: rand() * path.length,
        lane: dir * road.width * (road.kind === 'highway' ? 0.3 : 0.25),
        laneCur: 0,
        hornCooldown: 0,
      });
    }
  }
  return vehicles;
}

// ---------------------------------------------------------------------- birds & kites
function crow() {
  const g = new THREE.Group();
  const black = mat(0x1d1d22, { side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.7), black);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), black);
  wl.geometry.translate(-0.45, 0, 0);
  wl.rotation.x = -Math.PI / 2;
  const wr = wl.clone();
  wr.scale.x = -1;
  const lw = new THREE.Group();
  lw.add(wl);
  const rw = new THREE.Group();
  rw.add(wr);
  g.add(body, lw, rw);
  g.userData.wings = [lw, rw];
  return g;
}

function kite(color) {
  const g = new THREE.Group();
  const shape = new THREE.Shape([
    new THREE.Vector2(0, 1),
    new THREE.Vector2(0.75, 0),
    new THREE.Vector2(0, -1.1),
    new THREE.Vector2(-0.75, 0),
  ]);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(color, { side: THREE.DoubleSide }));
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), mat(0xffffff, { side: THREE.DoubleSide }));
  tail.position.y = -1.6;
  g.add(m, tail);
  return g;
}

// ---------------------------------------------------------------------- main
export function buildAmbient(scene, collision, terrain) {
  const rand = mulberry32(2024);
  buildTrees(scene, collision, terrain, rand);
  buildStreetFurniture(scene, collision, terrain, rand);
  const vehicles = buildTraffic(scene, rand);

  // pedestrians recycle around the player
  const peds = [];
  for (let i = 0; i < 22; i++) {
    const c = new Character(randomOutfit(rand));
    c.root.scale.setScalar(1.3);
    c.root.visible = false;
    scene.add(c.root);
    peds.push({ c, active: false, speed: 0, dx: 0, dz: 0, timer: 0 });
  }

  // crows circling over a few neighbourhoods
  const flocks = [];
  for (const [cx, cz] of [n([-60, 20]), n([-165, 60]), n([20, 112]), n([160, 180]), n([-40, -110]), n([-250, -70])]) {
    const birds = [];
    for (let i = 0; i < 6; i++) {
      const b = crow();
      scene.add(b);
      birds.push({
        b,
        r: 8 + rand() * 10,
        a: rand() * Math.PI * 2,
        h: 18 + rand() * 8,
        sp: 0.35 + rand() * 0.3,
        ph: rand() * 10,
      });
    }
    flocks.push({ cx, cz, birds });
  }

  // kites (patang) over rooftops
  const kites = [];
  const kiteColors = [0xe63946, 0xffb703, 0x06d6a0, 0x8338ec, 0x3a86ff, 0xff006e];
  for (const [kx, kz] of [
    n([-170, 70]),
    n([-150, 40]),
    n([-185, -5]),
    n([30, -138]),
    n([-60, 190]),
    n([170, 200]),
    n([-250, 230]),
  ]) {
    const k = kite(pick(rand, kiteColors));
    const anchor = new THREE.Vector3(kx + (rand() - 0.5) * 6, 8, kz + (rand() - 0.5) * 6);
    k.position.set(anchor.x + 6, 26, anchor.z - 8);
    scene.add(k);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([anchor, k.position.clone()]);
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
    );
    scene.add(line);
    kites.push({ k, anchor, line, ph: rand() * 10 });
  }

  // boats bobbing in the harbour and ships offshore
  const boats = [];
  for (const [bx, bz, r] of [
    [-232, 120, 0.4],
    [-220, 112, 1.2],
    [-205, 125, 2.1],
    [-240, 135, 0.2],
    [-300, 120, 1.5],
    [330, 150, 0.7],
    [-90, 128, 1.0],
  ]) {
    const b = boat(bx, bz, r, pick(rand, [0x2a9d8f, 0xe63946, 0x1d6fb8, 0xf4a261, 0xffffff]), 5 + rand() * 3);
    scene.add(b);
    boats.push(b);
  }
  const ships = [];
  for (let i = 0; i < 3; i++) {
    const s = ship(0, 0, 0, pick(rand, [0x8b1e1e, 0x1d3557, 0x2a4d3a]), 40 + rand() * 10);
    scene.add(s);
    ships.push({ s, x: -400 + i * 300, z: 215 + i * 18, v: (i % 2 ? -1 : 1) * (2 + rand() * 1.5) });
  }

  function spawnPed(p, pos) {
    // pick a sidewalk spot on a nearby road
    for (let tries = 0; tries < 12; tries++) {
      const road = ROADS[Math.floor(rand() * ROADS.length)];
      const pts = road.path;
      const i = Math.floor(rand() * (pts.length - 1));
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1];
      const d = Math.hypot(ax - pos.x, az - pos.z);
      if (d < 25 || d > 75) continue;
      let dx = bx - ax,
        dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const side = rand() < 0.5 ? 1 : -1;
      const off = road.width / 2 + 1.2;
      const x = ax + dz * side * off,
        z = az - dx * side * off;
      if (!terrain.isLand(x, z) || !collision.isFree(x, z, 0.4)) continue;
      const dir = rand() < 0.5 ? 1 : -1;
      p.c.root.position.set(x, 0, z);
      p.dx = dx * dir;
      p.dz = dz * dir;
      p.speed = 1.6 + rand() * 1.2;
      p.timer = 6 + rand() * 10;
      p.active = true;
      p.c.root.visible = true;
      return;
    }
  }

  return {
    update(dt, t, playerPos, audio) {
      WIND.value = t;
      // traffic
      for (const v of vehicles) {
        const pos = samplePath(v.path, v.s);
        const fx = pos.dx * v.dir,
          fz = pos.dz * v.dir;
        // keep left; slow down if the player is just ahead in our lane
        const lx = pos.x + pos.dz * v.lane,
          lz = pos.z - pos.dx * v.lane;
        const px = playerPos.x - lx,
          pz = playerPos.z - lz;
        const ahead = px * fx + pz * fz;
        const side = Math.abs(px * fz - pz * fx);
        let target = v.speed;
        if (ahead > 0 && ahead < v.len + 6 && side < 2.6) {
          target = 0;
          v.hornCooldown -= dt;
          if (v.hornCooldown <= 0 && ahead < 40) {
            v.hornCooldown = 2.5 + Math.random() * 3;
            if (Math.hypot(px, pz) < 30) audio?.horn(0.08, 380 + Math.random() * 200, 0.18);
          }
        }
        v.cur += (target - v.cur) * Math.min(1, dt * (target < v.cur ? 6 : 1.5));
        v.s += v.cur * v.dir * dt;
        if (v.s > v.path.length - 2 || v.s < 2) {
          v.dir *= -1;
          v.lane *= -1;
          v.s = Math.min(v.path.length - 2.01, Math.max(2.01, v.s));
        }
        v.model.position.set(lx, 0, lz);
        v.model.rotation.y = Math.atan2(fx, fz);
      }

      // pedestrians
      for (const p of peds) {
        if (!p.active) {
          spawnPed(p, playerPos);
          continue;
        }
        const r = p.c.root;
        const dist = Math.hypot(r.position.x - playerPos.x, r.position.z - playerPos.z);
        p.timer -= dt;
        if (dist > 95 || p.timer < -20) {
          p.active = false;
          r.visible = false;
          continue;
        }
        if (p.timer < 0 && p.speed > 0) {
          // pause to chat / look at a shop, then carry on (maybe turn around)
          p.speed = 0;
        } else if (p.timer < -4 && p.speed === 0) {
          p.timer = 6 + Math.random() * 10;
          p.speed = 1.6 + Math.random() * 1.2;
          if (Math.random() < 0.4) {
            p.dx *= -1;
            p.dz *= -1;
          }
        }
        if (p.speed > 0) {
          const res = collision.move(r.position.x, r.position.z, p.dx * p.speed * dt, p.dz * p.speed * dt, 0.35);
          if (res.hit && Math.hypot(res.x - r.position.x, res.z - r.position.z) < p.speed * dt * 0.3) {
            p.dx *= -1;
            p.dz *= -1;
          }
          r.position.x = res.x;
          r.position.z = res.z;
          r.rotation.y = Math.atan2(p.dx, p.dz);
        }
        p.c.update(dt, p.speed);
      }

      // birds
      for (const f of flocks) {
        const near = Math.hypot(f.cx - playerPos.x, f.cz - playerPos.z) < 160;
        for (const b of f.birds) {
          b.b.visible = near;
          if (!near) continue;
          b.a += b.sp * dt;
          b.b.position.set(f.cx + Math.cos(b.a) * b.r, b.h + Math.sin(t + b.ph) * 1.5, f.cz + Math.sin(b.a) * b.r);
          b.b.rotation.y = -b.a;
          const flap = Math.sin(t * 9 + b.ph) * 0.6;
          b.b.userData.wings[0].rotation.z = flap;
          b.b.userData.wings[1].rotation.z = -flap;
        }
      }

      // kites sway on the breeze
      for (const k of kites) {
        k.k.position.set(
          k.anchor.x + 6 + Math.sin(t * 0.7 + k.ph) * 3,
          24 + Math.sin(t * 1.3 + k.ph) * 2,
          k.anchor.z - 8 + Math.cos(t * 0.5 + k.ph) * 2,
        );
        k.k.rotation.set(Math.sin(t * 2 + k.ph) * 0.2, -Math.PI / 4, Math.sin(t * 1.7 + k.ph) * 0.4);
        const arr = k.line.geometry.attributes.position.array;
        arr[3] = k.k.position.x;
        arr[4] = k.k.position.y - 1;
        arr[5] = k.k.position.z;
        k.line.geometry.attributes.position.needsUpdate = true;
      }

      for (const b of boats) {
        b.position.y = -0.6 + Math.sin(t * 1.4 + b.userData.bob) * 0.12;
        b.rotation.z = Math.sin(t * 1.1 + b.userData.bob) * 0.05;
      }
      for (const s of ships) {
        s.x += s.v * dt;
        if (s.x > 520) s.x = -520;
        if (s.x < -520) s.x = 520;
        s.s.position.set(s.x, 0, s.z);
        s.s.rotation.y = s.v > 0 ? 0 : Math.PI;
      }
    },
  };
}
