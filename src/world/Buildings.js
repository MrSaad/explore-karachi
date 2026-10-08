// Procedural city blocks: thousands of low-poly buildings drawn with a handful
// of InstancedMeshes, dressed with the details that make a Karachi street:
// rooftop water tanks and stair huts, laundry, dish antennas, balconies,
// AC units, shop shutters and awnings, and walled villas with bougainvillea.
import * as THREE from 'three';
import { DISTRICTS, BUILDING_STYLES, N } from './layout.js';
import { districtCells } from './grid.js';
import { getTerrain } from './terrain.js';
import { makeFacadeMaterial, mat, swayMaterial } from './materials.js';
import { mulberry32, pick, range, pointInPolygon } from '../utils/math.js';

// The "urban sprawl" area that gets low-density filler buildings between neighbourhoods.
const URBAN = N([
  [-330, 310],
  [300, 310],
  [300, -20],
  [210, -60],
  [-120, -60],
  [-210, -40],
  [-330, 40],
]);

const SIGN_COLORS = [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8338ec, 0x06d6a0, 0xff006e, 0x3a86ff, 0xfb5607];
const TANK_COLORS = [0x1d1d1f, 0x1d1d1f, 0x24527a, 0xf0f0f0, 0x1d1d1f];
const SHUTTER_COLORS = [0x7d8790, 0x6b7d8c, 0x8a8f86, 0x5d6d7e, 0x3f6e5a, 0x2f5f8a, 0x9a8f7e];
const CLOTH_COLORS = [0xe63946, 0xffb703, 0x219ebc, 0xf2f2f2, 0x8338ec, 0x06d6a0, 0xff006e, 0xf4a261, 0x2a9d8f];
const BLOOM_COLORS = [0xd6247a, 0xe0409a, 0xc2185b, 0xf06292, 0xff7043];

// Which styles get which kinds of detail
const SHOP_STYLES = new Set(['dense', 'colonial', 'midrise', 'heritage', 'suburb', 'informal']);
const BALCONY_STYLES = new Set(['apartments', 'midrise', 'colonial', 'heritage', 'dense']);
const HOME_STYLES = new Set(['dense', 'informal', 'midrise', 'suburb', 'colonial', 'apartments', 'heritage']);
const WALLED_STYLES = new Set(['villas', 'bungalow']);

export function buildBuildings(scene, collision) {
  const terrain = getTerrain();
  const rand = mulberry32(1947);
  const items = []; // {x, z, w, d, h, angle, color, style, styleName, cell}

  const place = (x, z, angle, cell, style, falloff, styleName) => {
    let w = Math.min(range(rand, style.size[0], style.size[1]), cell - 1.4);
    let d = Math.min(range(rand, style.size[0], style.size[1]), cell - 1.4);
    // squeeze into tight plots next to roads rather than leaving them empty
    if (!terrain.canBuild(x, z, w / 2 + 0.6, d / 2 + 0.6)) {
      w *= 0.7;
      d *= 0.7;
      if (w < 3 || !terrain.canBuild(x, z, w / 2 + 0.5, d / 2 + 0.5)) return;
    }
    // taller in the middle of a district, lower at the edges
    const hBias = 1 - falloff * 0.45;
    const h = range(rand, style.h[0], style.h[1]) * hBias;
    items.push({ x, z, w, d, h: Math.max(3, h), angle, color: pick(rand, style.palette), style, styleName, cell });
  };

  for (const dist of DISTRICTS) {
    const style = BUILDING_STYLES[dist.style];
    if (!style) continue;
    for (const c of districtCells(dist)) {
      if (c.lane) continue;
      if (c.rand > style.density) continue;
      const jx = (rand() - 0.5) * 0.6,
        jz = (rand() - 0.5) * 0.6;
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

  // --- detail lists -----------------------------------------------------------
  const tiers = [];
  const parapets = [];
  const tanks = [];
  const signs = [];
  const chimneys = [];
  const shutters = [];
  const awnings = [];
  const balconies = [];
  const railings = [];
  const acs = [];
  const huts = [];
  const dishes = [];
  const lines = [];
  const poles = [];
  const clothes = [];
  const walls = [];
  const lawns = [];
  const blooms = [];

  for (const b of items) {
    collision.addBox(b.x, b.z, b.w / 2, b.d / 2, b.angle, 'building');
    const ca = Math.cos(b.angle),
      sa = Math.sin(b.angle);
    const local = (lx, lz) => [b.x + lx * ca - lz * sa, b.z + lx * sa + lz * ca];
    // Faces: k = 0..3 → outward normals +z, -x, -z, +x in building space.
    // Returns world position for (lateral u, outward offset o) and the yaw to face outward.
    const face = (k, u, o) => {
      const half = k % 2 === 0 ? b.d / 2 : b.w / 2;
      const th = (k * Math.PI) / 2;
      const c = Math.cos(th),
        s = Math.sin(th);
      // building-space point on face 0 is (u, half + o); rotate by k quarter-turns
      const lx = u * c - (half + o) * s;
      const lz = u * s + (half + o) * c;
      const [x, z] = local(lx, lz);
      return { x, z, angle: b.angle + th, span: k % 2 === 0 ? b.w : b.d };
    };

    // roof edge: a setback storey or a parapet
    if (b.h > 10 && rand() < 0.35) {
      tiers.push({ x: b.x, z: b.z, y: b.h, w: b.w * 0.6, d: b.d * 0.6, h: 3.2, angle: b.angle, color: b.color });
    } else if (rand() < 0.65) {
      parapets.push({ x: b.x, z: b.z, y: b.h, w: b.w + 0.2, d: b.d + 0.2, angle: b.angle });
    }
    const roofY = b.h;

    // water tanks
    const nTanks = rand() < b.style.tanks ? 1 + Math.floor(rand() * 3) : 0;
    for (let k = 0; k < nTanks; k++) {
      const [tx, tz] = local((rand() - 0.5) * (b.w - 1.4), (rand() - 0.5) * (b.d - 1.4));
      tanks.push({ x: tx, z: tz, y: roofY, color: pick(rand, TANK_COLORS) });
    }

    // stair hut ("mumty") giving access to the roof
    if (HOME_STYLES.has(b.styleName) && b.w > 4 && rand() < 0.5) {
      const sx = rand() < 0.5 ? -1 : 1,
        sz = rand() < 0.5 ? -1 : 1;
      const [hx, hz] = local(sx * (b.w / 2 - 1.2), sz * (b.d / 2 - 1.2));
      huts.push({ x: hx, z: hz, y: roofY, angle: b.angle, color: b.color });
    }

    // dish antenna
    if (rand() < 0.28) {
      const [dx, dz] = local((rand() - 0.5) * (b.w - 1.2), (rand() - 0.5) * (b.d - 1.2));
      dishes.push({ x: dx, z: dz, y: roofY, r: rand() * Math.PI * 2 });
    }

    // laundry drying on the roof
    if (HOME_STYLES.has(b.styleName) && b.w > 4 && rand() < 0.3) {
      const len = Math.min(b.w - 1.2, 3.4);
      const lz = (rand() - 0.5) * (b.d - 2);
      const [cx, cz] = local(0, lz);
      lines.push({ x: cx, z: cz, y: roofY + 1.55, len, angle: b.angle });
      for (const s of [-1, 1]) {
        const [px, pz] = local((s * len) / 2, lz);
        poles.push({ x: px, z: pz, y: roofY });
      }
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + ((i + 0.5) / n) * len + (rand() - 0.5) * 0.3;
        const [qx, qz] = local(u, lz);
        clothes.push({
          x: qx,
          z: qz,
          y: roofY + 1.55,
          angle: b.angle,
          w: 0.45 + rand() * 0.35,
          h: 0.5 + rand() * 0.45,
          color: pick(rand, CLOTH_COLORS),
        });
      }
    }

    if (b.style.chimneys && rand() < b.style.chimneys) {
      const [cx, cz] = local(b.w * 0.3, b.d * 0.25);
      chimneys.push({ x: cx, z: cz, y: roofY, h: 6 + rand() * 6 });
    }

    // ground floor shops: shutters all round, a signboard and an awning on one side
    if (SHOP_STYLES.has(b.styleName)) {
      if (rand() < 0.75)
        shutters.push({
          x: b.x,
          z: b.z,
          w: b.w + 0.08,
          d: b.d + 0.08,
          angle: b.angle,
          color: pick(rand, SHUTTER_COLORS),
        });
      if (rand() < 0.55) {
        const k = Math.floor(rand() * 4);
        const f = face(k, 0, 0.08);
        signs.push({ x: f.x, z: f.z, y: 2.6, w: f.span * 0.8, angle: f.angle, color: pick(rand, SIGN_COLORS) });
        if (rand() < 0.6) {
          const a = face(k, 0, 0.55);
          awnings.push({ x: a.x, z: a.z, y: 2.35, w: f.span * 0.85, angle: a.angle, color: pick(rand, SIGN_COLORS) });
        }
      }
    }

    // balconies stacked up a façade
    if (BALCONY_STYLES.has(b.styleName) && b.h > 7) {
      const faces = rand() < 0.5 ? [Math.floor(rand() * 4)] : [0, 2].map((k) => (k + Math.floor(rand() * 2)) % 4);
      for (const k of faces) {
        const span = k % 2 === 0 ? b.w : b.d;
        const bw = Math.min(span * 0.45, 3.2);
        const u = (rand() - 0.5) * (span - bw - 0.4);
        for (let y = 3.2; y < b.h - 1.5; y += 3.2) {
          if (rand() < 0.15) continue;
          const f = face(k, u, 0.4);
          balconies.push({ x: f.x, z: f.z, y, w: bw, angle: f.angle });
          const r = face(k, u, 0.78);
          railings.push({
            x: r.x,
            z: r.z,
            y: y + 0.18,
            w: bw,
            angle: r.angle,
            color: pick(rand, [0x3a3a3a, 0xd9d9d9, 0x2f5f8a, 0x7a5636]),
          });
        }
      }
    }

    // AC units bolted to the walls
    if (b.styleName !== 'huts' && b.styleName !== 'industrial') {
      const n = Math.floor(rand() * Math.min(4, b.h / 3));
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rand() * 4);
        const span = k % 2 === 0 ? b.w : b.d;
        const f = face(k, (rand() - 0.5) * (span - 1), 0.22);
        const floor = 1 + Math.floor(rand() * Math.max(1, Math.floor(b.h / 3.2) - 1));
        acs.push({ x: f.x, z: f.z, y: floor * 3.2 - 1.5, angle: f.angle });
      }
    }

    // villas: boundary wall with a gate, a lawn, and bougainvillea spilling over
    if (WALLED_STYLES.has(b.styleName)) {
      const half = b.cell / 2 - 0.35;
      if (terrain.canBuild(b.x, b.z, half + 0.2, half + 0.2)) {
        const lawn = local(0, 0);
        lawns.push({ x: lawn[0], z: lawn[1], s: half * 2 - 0.3, angle: b.angle });
        const gate = Math.floor(rand() * 4);
        for (let k = 0; k < 4; k++) {
          // each side is a wall segment; the gate side is split in two
          const segs =
            k === gate
              ? [
                  [-half, -1.4],
                  [1.4, half],
                ]
              : [[-half, half]];
          for (const [u0, u1] of segs) {
            const th = (k * Math.PI) / 2;
            const um = (u0 + u1) / 2;
            const lx = um * Math.cos(th) - half * Math.sin(th);
            const lz = um * Math.sin(th) + half * Math.cos(th);
            const [wx, wz] = local(lx, lz);
            const len = u1 - u0;
            walls.push({ x: wx, z: wz, len, angle: b.angle + th });
            collision.addBox(wx, wz, len / 2, 0.15, b.angle + th, 'wall');
          }
        }
        const nb = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < nb; i++) {
          const k = Math.floor(rand() * 4);
          const th = (k * Math.PI) / 2;
          const u = (rand() - 0.5) * (half * 1.6);
          const [bx, bz] = local(
            u * Math.cos(th) - (half - 0.3) * Math.sin(th),
            u * Math.sin(th) + (half - 0.3) * Math.cos(th),
          );
          blooms.push({ x: bx, z: bz, s: 0.7 + rand() * 0.5, color: pick(rand, BLOOM_COLORS) });
        }
      }
    }
  }

  // --- instanced meshes ---------------------------------------------------------
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const facade = makeFacadeMaterial();

  const instanced = (geo, material, list, setup, { shadow = true } = {}) => {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((it, i) => {
      dummy.rotation.order = 'XYZ';
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      setup(it, i);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (it.color !== undefined) m.setColorAt(i, color.setHex(it.color));
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  const main = instanced(boxGeo, facade, items, (b) => {
    dummy.position.set(b.x, 0, b.z);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(b.w, b.h, b.d);
  });
  // a little brightness variation between neighbours
  items.forEach((b, i) => main.setColorAt(i, color.setHex(b.color).offsetHSL(0, 0, (rand() - 0.5) * 0.06)));

  instanced(boxGeo, facade, tiers, (t) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, -t.angle, 0);
    dummy.scale.set(t.w, t.h, t.d);
  });

  instanced(boxGeo, mat(0xefe6d6), parapets, (p) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, -p.angle, 0);
    dummy.scale.set(p.w, 0.5, p.d);
  });

  const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8);
  tankGeo.translate(0, 0.55 + 0.5, 0);
  instanced(tankGeo, mat(0xffffff, { roughness: 0.6 }), tanks, (t) => dummy.position.set(t.x, t.y, t.z));

  // stair huts: a small box with a darker door
  instanced(boxGeo, mat(0xffffff), huts, (h) => {
    dummy.position.set(h.x, h.y, h.z);
    dummy.rotation.set(0, -h.angle, 0);
    dummy.scale.set(2.2, 2.5, 2.2);
  });
  instanced(
    boxGeo,
    mat(0x4a3b30),
    huts.map((h) => ({ ...h, color: undefined })),
    (h) => {
      const ca = Math.cos(h.angle),
        sa = Math.sin(h.angle);
      dummy.position.set(h.x - 1.12 * sa, h.y, h.z + 1.12 * ca);
      dummy.rotation.set(0, -h.angle, 0);
      dummy.scale.set(0.9, 1.9, 0.06);
    },
    { shadow: false },
  );

  const dishGeo = new THREE.CylinderGeometry(0.5, 0.06, 0.18, 10, 1, true);
  dishGeo.rotateX(-0.9);
  dishGeo.translate(0, 0.75, 0);
  const dishStem = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 4);
  dishStem.translate(0, 0.35, 0);
  instanced(dishGeo, mat(0xf2f2f2, { side: THREE.DoubleSide }), dishes, (d) => {
    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(0, d.r, 0);
  });
  instanced(dishStem, mat(0x777777), dishes, (d) => dummy.position.set(d.x, d.y, d.z), { shadow: false });

  // laundry: poles, line, and clothes that flap in the breeze
  instanced(
    boxGeo,
    mat(0x8a8a8a),
    poles,
    (p) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(0.07, 1.6, 0.07);
    },
    { shadow: false },
  );
  instanced(
    boxGeo,
    mat(0x333333),
    lines,
    (l) => {
      dummy.position.set(l.x, l.y, l.z);
      dummy.rotation.set(0, -l.angle, 0);
      dummy.scale.set(l.len, 0.03, 0.03);
    },
    { shadow: false },
  );
  const clothGeo = new THREE.PlaneGeometry(1, 1, 1, 3);
  clothGeo.translate(0, -0.5, 0); // hangs down from the line
  instanced(clothGeo, swayMaterial(0xffffff, { amp: 0.35, hang: true, side: THREE.DoubleSide }), clothes, (c) => {
    dummy.position.set(c.x, c.y, c.z);
    dummy.rotation.set(0, -c.angle, 0);
    dummy.scale.set(c.w, c.h, 1);
  });

  const chimGeo = new THREE.CylinderGeometry(0.5, 0.7, 1, 8);
  chimGeo.translate(0, 0.5, 0);
  instanced(chimGeo, mat(0x8c5a46), chimneys, (c) => {
    dummy.position.set(c.x, c.y, c.z);
    dummy.scale.set(1, c.h, 1);
  });

  // shop shutters: a slightly proud band around the ground floor
  instanced(boxGeo, mat(0xffffff, { roughness: 0.6, metalness: 0.2 }), shutters, (s) => {
    dummy.position.set(s.x, 0, s.z);
    dummy.rotation.set(0, -s.angle, 0);
    dummy.scale.set(s.w, 2.25, s.d);
  });

  const signGeo = new THREE.BoxGeometry(1, 1, 0.12);
  instanced(signGeo, mat(0xffffff, { roughness: 0.5, emissive: 0x222222 }), signs, (s) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, -s.angle, 0);
    dummy.scale.set(s.w, 0.9, 1);
  });

  instanced(boxGeo, mat(0xffffff), awnings, (a) => {
    dummy.position.set(a.x, a.y, a.z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.set(0.32, -a.angle, 0);
    dummy.scale.set(a.w, 0.08, 1.1);
  });

  instanced(boxGeo, mat(0xd8d2c6), balconies, (b) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(b.w, 0.18, 0.8);
  });
  instanced(
    boxGeo,
    mat(0xffffff, { roughness: 0.5, metalness: 0.3 }),
    railings,
    (r) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(0, -r.angle, 0);
      dummy.scale.set(r.w, 0.85, 0.06);
    },
    { shadow: false },
  );

  instanced(
    boxGeo,
    mat(0xe9e9e6, { roughness: 0.5 }),
    acs,
    (a) => {
      dummy.position.set(a.x, a.y, a.z);
      dummy.rotation.set(0, -a.angle, 0);
      dummy.scale.set(0.8, 0.55, 0.42);
    },
    { shadow: false },
  );

  // villa plots
  instanced(
    boxGeo,
    mat(0x8fb86a),
    lawns,
    (l) => {
      dummy.position.set(l.x, 0.02, l.z);
      dummy.rotation.set(0, -l.angle, 0);
      dummy.scale.set(l.s, 0.04, l.s);
    },
    { shadow: false },
  );
  instanced(boxGeo, mat(0xefe7d6), walls, (w) => {
    dummy.position.set(w.x, 0, w.z);
    dummy.rotation.set(0, -w.angle, 0);
    dummy.scale.set(w.len, 1.7, 0.3);
  });
  const bloomGeo = new THREE.IcosahedronGeometry(0.75, 0);
  bloomGeo.translate(0, 1.6, 0);
  instanced(bloomGeo, swayMaterial(0xffffff, { amp: 0.05, base: 1.2 }), blooms, (b) => {
    dummy.position.set(b.x, 0, b.z);
    dummy.scale.set(b.s * 1.3, b.s, b.s * 1.3);
  });

  return { count: items.length };
}
