// Land, sea, rivers and roads.
import * as THREE from 'three';
import { COAST, RIVERS, ROADS, ROAD_STYLE, ROUNDABOUTS, HILLS, WORLD } from './layout.js';
import { getPaintedCanvas } from './mapPainter.js';
import { mat, PALETTE } from './materials.js';
import { mulberry32 } from '../utils/math.js';

const GROUND_SCALE = 3; // texture pixels per world unit

/** Flat ribbon along a polyline (roads, rivers, markings), lying at height y. */
export function ribbonGeometry(pts, width, y = 0, closed = false) {
  const pos = [];
  const uv = [];
  const idx = [];
  const hw = width / 2;
  const n = pts.length;
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    // perpendicular (left side)
    const px = dz, pz = -dx;
    if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    pos.push(pts[i][0] + px * hw, y, pts[i][1] + pz * hw);
    pos.push(pts[i][0] - px * hw, y, pts[i][1] - pz * hw);
    uv.push(0, dist, 1, dist);
    if (i < n - 1 || closed) {
      const a = i * 2, b = i * 2 + 1, c = ((i + 1) % n) * 2, d = ((i + 1) % n) * 2 + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dashed centre-line markings as one merged geometry. */
function dashGeometry(pts, width, dash, gap, y, offset = 0) {
  const pos = [];
  const idx = [];
  let carry = 0;
  let on = true;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    if (segLen < 1e-6) continue;
    const dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
    const px = dz, pz = -dx;
    let s = 0;
    while (segLen - s > 1e-6) {
      const remain = (on ? dash : gap) - carry;
      const step = Math.min(remain, segLen - s);
      if (on) {
        const x0 = ax + dx * s + px * offset, z0 = az + dz * s + pz * offset;
        const x1 = ax + dx * (s + step) + px * offset, z1 = az + dz * (s + step) + pz * offset;
        const k = pos.length / 3;
        const hw = width / 2;
        pos.push(x0 + px * hw, y, z0 + pz * hw, x0 - px * hw, y, z0 - pz * hw);
        pos.push(x1 + px * hw, y, z1 + pz * hw, x1 - px * hw, y, z1 - pz * hw);
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
      s += step;
      carry += step;
      if (carry >= (on ? dash : gap) - 1e-6) {
        carry = 0;
        on = !on;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mergeGeometries(geoms) {
  // Minimal merge for non-indexed-compatible ribbons (position/normal/index only).
  let vCount = 0;
  let iCount = 0;
  for (const g of geoms) {
    vCount += g.attributes.position.count;
    iCount += g.index.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count;
    io += gi.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

function makeSeaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x1f6f93) },
      uShallow: { value: new THREE.Color(0x3fa7c4) },
      uSun: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.08 + uTime * 0.9) * 0.18 + sin(p.z * 0.11 - uTime * 0.7) * 0.14
                + sin((p.x + p.z) * 0.21 + uTime * 1.6) * 0.06;
        p.y += w;
        vWave = w;
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      varying vec3 vPos;
      varying float vWave;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float depth = smoothstep(120.0, 280.0, vPos.z);
        vec3 col = mix(uShallow, uDeep, depth);
        col += vWave * 0.35;
        // glints
        vec2 cell = floor(vPos.xz * 0.5);
        float h = hash(cell);
        float glint = step(0.985, h) * (0.5 + 0.5 * sin(uTime * 3.0 + h * 40.0));
        col += glint * 0.35;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

export function buildGround(scene) {
  const group = new THREE.Group();
  group.name = 'ground';

  // ---- Land slab ---------------------------------------------------------
  const shape = new THREE.Shape(COAST.map(([x, z]) => new THREE.Vector2(x, z)));
  const landGeo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false, steps: 1 });
  landGeo.rotateX(Math.PI / 2); // shape (x, z) → world (x, 0, z); extrudes downward

  const canvas = getPaintedCanvas('ground', GROUND_SCALE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const Wd = WORLD.maxX - WORLD.minX;
  const Hd = WORLD.maxZ - WORLD.minZ;
  tex.repeat.set(1 / Wd, -1 / Hd);
  tex.offset.set(-WORLD.minX / Wd, 1 + WORLD.minZ / Hd);
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
  const sideMat = mat(PALETTE.earth);
  const land = new THREE.Mesh(landGeo, [topMat, sideMat]);
  land.receiveShadow = true;
  group.add(land);

  // ---- Sea ---------------------------------------------------------------
  const seaGeo = new THREE.PlaneGeometry(2400, 1800, 120, 90);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = makeSeaMaterial();
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, -0.9, 0);
  group.add(sea);

  // foam line hugging the coast
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const foam = new THREE.Mesh(ribbonGeometry(COAST, 2.2, -0.35, true), foamMat);
  group.add(foam);

  // ---- Rivers ------------------------------------------------------------
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x5b8f86, roughness: 0.4, metalness: 0.1 });
  for (const r of RIVERS) {
    const bank = new THREE.Mesh(ribbonGeometry(r.path, r.width + 3, 0.015), mat(0x9e8a64));
    const water = new THREE.Mesh(ribbonGeometry(r.path, r.width, 0.03), riverMat);
    bank.receiveShadow = water.receiveShadow = true;
    group.add(bank, water);
  }

  // ---- Roads -------------------------------------------------------------
  const sidewalkGeoms = [];
  const roadGeoms = { highway: [], main: [], street: [] };
  const markGeoms = [];
  const yellowGeoms = [];
  for (const r of ROADS) {
    const st = ROAD_STYLE[r.kind];
    sidewalkGeoms.push(ribbonGeometry(r.path, st.width + 2.4, 0.05));
    roadGeoms[r.kind].push(ribbonGeometry(r.path, st.width, 0.08));
    if (st.markings === 'dashed') markGeoms.push(dashGeometry(r.path, 0.35, 3, 3, 0.1));
    if (st.markings === 'double') {
      yellowGeoms.push(dashGeometry(r.path, 0.3, 1000, 0.01, 0.1, 0.35));
      yellowGeoms.push(dashGeometry(r.path, 0.3, 1000, 0.01, 0.1, -0.35));
      markGeoms.push(dashGeometry(r.path, 0.3, 3, 4, 0.1, 3.2));
      markGeoms.push(dashGeometry(r.path, 0.3, 3, 4, 0.1, -3.2));
    }
  }
  const sidewalk = new THREE.Mesh(mergeGeometries(sidewalkGeoms), mat(PALETTE.pavement, { flat: false }));
  sidewalk.receiveShadow = true;
  group.add(sidewalk);
  for (const kind of Object.keys(roadGeoms)) {
    if (!roadGeoms[kind].length) continue;
    const m = new THREE.Mesh(mergeGeometries(roadGeoms[kind]), mat(ROAD_STYLE[kind].color, { flat: false }));
    m.receiveShadow = true;
    group.add(m);
  }
  group.add(new THREE.Mesh(mergeGeometries(markGeoms), new THREE.MeshBasicMaterial({ color: 0xf2f2ea })));
  group.add(new THREE.Mesh(mergeGeometries(yellowGeoms), new THREE.MeshBasicMaterial({ color: 0xf0c03a })));

  // Roundabouts (chowrangis)
  for (const rb of ROUNDABOUTS) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(rb.r, 32), mat(PALETTE.asphalt, { flat: false }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(rb.at[0], 0.085, rb.at[1]);
    disc.receiveShadow = true;
    const curb = new THREE.Mesh(new THREE.CylinderGeometry(rb.island, rb.island, 0.5, 24), mat(0xe8e2d4));
    curb.position.set(rb.at[0], 0.25, rb.at[1]);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(rb.island - 0.4, rb.island - 0.4, 0.56, 24), mat(PALETTE.grass));
    grass.position.set(rb.at[0], 0.27, rb.at[1]);
    curb.receiveShadow = grass.receiveShadow = true;
    group.add(disc, curb, grass);
  }

  // ---- Hills -------------------------------------------------------------
  const rand = mulberry32(42);
  for (const h of HILLS) {
    const geo = new THREE.ConeGeometry(h.r, h.h, 9, 3);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < h.h / 2 - 0.01 && p.getY(i) > -h.h / 2 + 0.01) {
        p.setX(i, p.getX(i) * (0.85 + rand() * 0.3));
        p.setZ(i, p.getZ(i) * (0.85 + rand() * 0.3));
      }
    }
    geo.computeVertexNormals();
    const hill = new THREE.Mesh(geo, mat(0xb39a72));
    hill.scale.y = 1;
    hill.position.set(h.at[0], h.h / 2 - 0.5, h.at[1]);
    hill.castShadow = hill.receiveShadow = true;
    group.add(hill);
  }

  scene.add(group);
  return {
    group,
    update(t) {
      seaMat.uniforms.uTime.value = t;
      foamMat.opacity = 0.4 + Math.sin(t * 1.3) * 0.15;
    },
  };
}
