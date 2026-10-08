// Procedural city blocks: thousands of low-poly buildings drawn with a handful
// of InstancedMeshes. Rooftop water tanks are a very Karachi detail.
import * as THREE from 'three';
import { DISTRICTS, BUILDING_STYLES, N } from './layout.js';
import { districtCells } from './grid.js';
import { getTerrain } from './terrain.js';
import { makeFacadeMaterial, mat } from './materials.js';
import { mulberry32, pick, range, pointInPolygon } from '../utils/math.js';

// The "urban sprawl" area that gets low-density filler buildings between neighbourhoods.
const URBAN = N([[-330, 310], [300, 310], [300, -20], [210, -60], [-120, -60], [-210, -40], [-330, 40]]);

const SIGN_COLORS = [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8338ec, 0x06d6a0, 0xff006e, 0x3a86ff, 0xfb5607];
const TANK_COLORS = [0x1d1d1f, 0x1d1d1f, 0x24527a, 0xf0f0f0, 0x1d1d1f];

export function buildBuildings(scene, collision) {
  const terrain = getTerrain();
  const rand = mulberry32(1947);
  const items = []; // {x, z, w, d, h, angle, color, style}

  const place = (x, z, angle, cell, style, falloff, styleName) => {
    const w = Math.min(range(rand, style.size[0], style.size[1]), cell - 1.4);
    const d = Math.min(range(rand, style.size[0], style.size[1]), cell - 1.4);
    if (!terrain.canBuild(x, z, w / 2 + 0.6, d / 2 + 0.6)) return;
    // taller in the middle of a district, lower at the edges
    const hBias = 1 - falloff * 0.45;
    const h = range(rand, style.h[0], style.h[1]) * hBias;
    items.push({ x, z, w, d, h: Math.max(3, h), angle, color: pick(rand, style.palette), style, styleName });
  };

  for (const dist of DISTRICTS) {
    const style = BUILDING_STYLES[dist.style];
    if (!style) continue;
    for (const c of districtCells(dist)) {
      if (c.lane) continue;
      if (c.rand > style.density) continue;
      const jx = (rand() - 0.5) * 0.6, jz = (rand() - 0.5) * 0.6;
      place(c.x + jx, c.z + jz, c.angle, c.size, style, c.falloff, dist.style);
    }
  }

  // Filler sprawl between neighbourhoods
  const suburb = BUILDING_STYLES.suburb;
  for (let x = -330; x < 300; x += suburb.spacing) {
    for (let z = -310; z < 60; z += suburb.spacing) {
      if (!pointInPolygon(x, z, URBAN)) continue;
      if (DISTRICTS.some((d) => Math.hypot(x - d.center[0], z - d.center[1]) < d.r * 1.02)) continue;
      if (rand() > suburb.density) continue;
      place(x + (rand() - 0.5) * 2, z + (rand() - 0.5) * 2, 0, suburb.spacing, suburb, 0.5, 'suburb');
    }
  }

  // --- Instanced meshes ------------------------------------------------------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const facade = makeFacadeMaterial();
  const count = items.length;

  // Some buildings get a smaller setback storey on top, so count those.
  const tiers = [];
  const tanks = [];
  const signs = [];
  const chimneys = [];
  const parapets = [];

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const main = new THREE.InstancedMesh(boxGeo, facade, count);
  main.castShadow = main.receiveShadow = true;

  items.forEach((b, i) => {
    dummy.position.set(b.x, 0, b.z);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    main.setMatrixAt(i, dummy.matrix);
    color.setHex(b.color).offsetHSL(0, 0, (rand() - 0.5) * 0.06);
    main.setColorAt(i, color);
    collision.addBox(b.x, b.z, b.w / 2, b.d / 2, b.angle, 'building');

    const ca = Math.cos(b.angle), sa = Math.sin(b.angle);
    const local = (lx, lz) => [b.x + lx * ca - lz * sa, b.z + lx * sa + lz * ca];

    if (b.h > 10 && rand() < 0.35) {
      tiers.push({ x: b.x, z: b.z, y: b.h, w: b.w * 0.6, d: b.d * 0.6, h: 3.2, angle: b.angle, color: b.color });
    } else if (rand() < 0.6) {
      parapets.push({ x: b.x, z: b.z, y: b.h, w: b.w + 0.2, d: b.d + 0.2, angle: b.angle });
    }

    const nTanks = rand() < b.style.tanks ? 1 + Math.floor(rand() * 3) : 0;
    for (let k = 0; k < nTanks; k++) {
      const [tx, tz] = local((rand() - 0.5) * (b.w - 1.4), (rand() - 0.5) * (b.d - 1.4));
      tanks.push({ x: tx, z: tz, y: b.h, color: pick(rand, TANK_COLORS) });
    }

    if (b.style.chimneys && rand() < b.style.chimneys) {
      const [cx, cz] = local(b.w * 0.3, b.d * 0.25);
      chimneys.push({ x: cx, z: cz, y: b.h, h: 6 + rand() * 6 });
    }

    if (['dense', 'colonial', 'midrise', 'heritage', 'suburb', 'informal'].includes(b.styleName) && rand() < 0.45) {
      // a bright shop signboard on one face, just above the shutter
      const side = Math.floor(rand() * 4);
      const along = side % 2 === 0 ? b.w : b.d;
      const off = side % 2 === 0 ? b.d / 2 + 0.08 : b.w / 2 + 0.08;
      const [lx, lz] = [[0, off], [off, 0], [0, -off], [-off, 0]][side];
      const [sx, sz] = local(lx, lz);
      signs.push({ x: sx, z: sz, y: 2.6, w: along * 0.8, angle: b.angle + (side * Math.PI) / 2, color: pick(rand, SIGN_COLORS) });
    }
  });
  main.instanceMatrix.needsUpdate = true;
  scene.add(main);

  const instanced = (geo, material, list, setup) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((it, i) => {
      setup(it);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (it.color !== undefined) m.setColorAt(i, color.setHex(it.color));
    });
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  instanced(boxGeo, facade, tiers, (t) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, -t.angle, 0);
    dummy.scale.set(t.w, t.h, t.d);
  });

  // parapet = thin lighter slab on the roof edge
  instanced(boxGeo, mat(0xefe6d6), parapets, (p) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, -p.angle, 0);
    dummy.scale.set(p.w, 0.5, p.d);
  });

  const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8);
  tankGeo.translate(0, 0.55 + 0.5, 0);
  instanced(tankGeo, mat(0xffffff, { roughness: 0.6 }), tanks, (t) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
  });

  const chimGeo = new THREE.CylinderGeometry(0.5, 0.7, 1, 8);
  chimGeo.translate(0, 0.5, 0);
  instanced(chimGeo, mat(0x8c5a46), chimneys, (c) => {
    dummy.position.set(c.x, c.y, c.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, c.h, 1);
  });

  const signGeo = new THREE.BoxGeometry(1, 1, 0.12);
  instanced(signGeo, mat(0xffffff, { roughness: 0.5 }), signs, (s) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, -s.angle, 0);
    dummy.scale.set(s.w, 0.9, 1);
  });

  return { count };
}
