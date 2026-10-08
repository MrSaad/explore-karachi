// Tiny modelling kit for the landmark builders. Everything is low-poly and
// flat-shaded; builders work in local coordinates around (0, 0).
import * as THREE from 'three';
import { mat } from '../materials.js';

export { THREE, mat };

export function box(w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' ? color : mat(color, opts));
  m.position.set(x, y + h / 2, z);
  return m;
}

export function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 12, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'object' ? color : mat(color, opts));
  m.position.set(x, y + h / 2, z);
  return m;
}

export function cone(r, h, color, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), typeof color === 'object' ? color : mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}

export function sphere(r, color, x = 0, y = 0, z = 0, ws = 12, hs = 8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), typeof color === 'object' ? color : mat(color));
  m.position.set(x, y, z);
  return m;
}

/** Onion/pointed dome from a profile — `kind`: 'onion' | 'half' | 'shallow' | 'pointed'. */
export function dome(r, color, kind = 'half', seg = 16) {
  const pts = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let x, y;
    if (kind === 'onion') {
      const a = t * Math.PI;
      x = r * Math.sin(a) * (1 + 0.25 * Math.sin(a * 1.0)) * (1 - t * 0.15);
      y = r * 1.3 * (1 - Math.cos(t * Math.PI)) * 0.5 * 1.4;
      if (t > 0.85) x *= (1 - t) / 0.15;
    } else if (kind === 'shallow') {
      x = r * Math.cos(t * Math.PI * 0.5);
      y = r * 0.38 * Math.sin(t * Math.PI * 0.5);
    } else if (kind === 'pointed') {
      x = r * Math.cos(t * Math.PI * 0.5);
      y = r * 1.25 * Math.sin(t * Math.PI * 0.5) + (t > 0.8 ? (t - 0.8) * r * 1.2 : 0);
    } else {
      x = r * Math.cos(t * Math.PI * 0.5);
      y = r * Math.sin(t * Math.PI * 0.5);
    }
    pts.push(new THREE.Vector2(Math.max(0.001, x), y));
  }
  pts[pts.length - 1].x = 0.001;
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), typeof color === 'object' ? color : mat(color));
  return m;
}

/** A row of arch-shaped dark insets on a façade (faces +z). */
export function archRow(count, width, height, y, z, color = 0x6b5a48, archW = null) {
  const g = new THREE.Group();
  const aw = archW ?? (width / count) * 0.55;
  for (let i = 0; i < count; i++) {
    const x = -width / 2 + (width / count) * (i + 0.5);
    const rect = new THREE.Mesh(new THREE.PlaneGeometry(aw, height * 0.7), mat(color, { side: THREE.DoubleSide }));
    rect.position.set(x, y + height * 0.35, z);
    const top = new THREE.Mesh(new THREE.CircleGeometry(aw / 2, 10, 0, Math.PI), mat(color, { side: THREE.DoubleSide }));
    top.position.set(x, y + height * 0.7, z);
    g.add(rect, top);
  }
  return g;
}

/** Simple palm tree. */
export function palm(x, z, h = 6, rand = Math.random) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 6), mat(0x8a6a48));
  trunk.position.y = h / 2;
  trunk.rotation.z = (rand() - 0.5) * 0.15;
  g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 4), mat(0x4f9442));
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.2, h - 0.2, Math.sin(a) * 1.2);
    leaf.rotation.z = Math.PI / 2 + 0.4;
    leaf.rotation.y = -a;
    leaf.scale.set(1, 1, 0.3);
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  return g;
}

export function tree(x, z, s = 1, color = 0x5e9a46) {
  const g = new THREE.Group();
  g.add(cyl(0.18 * s, 0.25 * s, 1.6 * s, 0x7a5636, 0, 0, 0, 6));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * s, 0), mat(color));
  crown.position.y = 2.4 * s;
  g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

/** Striped beach umbrella. */
export function umbrella(x, z, color = 0xe63946) {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 2.2, 0xdddddd, 0, 0, 0, 5));
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 8), mat(color));
  top.position.y = 2.3;
  g.add(top);
  g.position.set(x, 0, z);
  return g;
}

/** Food stall / thela with a coloured awning. */
export function stall(x, z, rot = 0, color = 0xe63946) {
  const g = new THREE.Group();
  g.add(box(2.2, 0.9, 1.2, 0x8a5a3b, 0, 0, 0));
  g.add(box(2.0, 0.15, 1.0, 0xc0c0c0, 0, 0.9, 0));
  for (const [px, pz] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) g.add(cyl(0.04, 0.04, 2.2, 0x555555, px, 0, pz, 4));
  const awn = box(2.5, 0.12, 1.6, color, 0, 2.2, 0.1);
  awn.rotation.x = 0.15;
  g.add(awn);
  // a pot or tawa on top
  g.add(cyl(0.3, 0.25, 0.3, 0x444444, -0.4, 1.05, 0, 8));
  g.add(cyl(0.35, 0.35, 0.04, 0x222222, 0.5, 1.05, 0, 10));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function table(x, z, color = 0xf2f2f2) {
  const g = new THREE.Group();
  g.add(cyl(0.6, 0.6, 0.06, color, 0, 0.75, 0, 10));
  g.add(cyl(0.05, 0.05, 0.75, 0x888888, 0, 0, 0, 4));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    g.add(box(0.4, 0.45, 0.4, color === 0xf2f2f2 ? 0xd94848 : 0xf2f2f2, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95));
  }
  g.position.set(x, 0, z);
  return g;
}

export function charpai(x, z, rot = 0) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.08, 2.0, 0xd8c39a, 0, 0.45, 0));
  for (const [px, pz] of [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]]) g.add(box(0.1, 0.5, 0.1, 0x6b4226, px, 0, pz));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function camel(x, z, rot = 0, saddle = 0xe63946) {
  const g = new THREE.Group();
  const tan = mat(0xc89b63);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.0), tan);
  body.position.y = 1.9;
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), tan);
  hump.position.set(0, 2.4, -0.1);
  hump.scale.set(1, 0.8, 1.3);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.35), tan);
  neck.position.set(0, 2.4, 1.1);
  neck.rotation.x = 0.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.65), tan);
  head.position.set(0, 2.95, 1.45);
  const sad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.9), mat(saddle));
  sad.position.set(0, 2.75, -0.1);
  g.add(body, hump, neck, head, sad);
  for (const [px, pz] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.18), tan);
    leg.position.set(px, 0.75, pz);
    g.add(leg);
  }
  // tassels
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), mat([0xffd60a, 0x06d6a0, 0xff006e, 0x3a86ff, 0xfb5607][i]));
    t.position.set(-0.5, 2.55, -0.5 + i * 0.22);
    t.rotation.x = Math.PI;
    g.add(t);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function boat(x, z, rot = 0, color = 0x2a9d8f, len = 6) {
  const g = new THREE.Group();
  const hullGeo = new THREE.CylinderGeometry(len * 0.17, len * 0.12, len, 6, 1, false, 0, Math.PI);
  hullGeo.rotateZ(Math.PI / 2);
  hullGeo.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, mat(color, { side: THREE.DoubleSide }));
  hull.position.y = 0.2;
  hull.scale.y = 0.8;
  hull.rotation.z = Math.PI;
  g.add(hull);
  g.add(box(len * 0.25, 0.9, len * 0.2, 0xf1e3c6, 0, 0.15, -len * 0.15));
  g.add(cyl(0.06, 0.06, len * 0.6, 0x6b4226, 0, 0.1, len * 0.1, 4));
  // pennant flags
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), mat(0xe63946, { side: THREE.DoubleSide }));
  flag.position.set(0.4, len * 0.6, len * 0.1);
  g.add(flag);
  g.position.set(x, -0.6, z);
  g.rotation.y = rot;
  g.userData.bob = Math.random() * 10;
  return g;
}

export function ship(x, z, rot = 0, hullColor = 0x8b1e1e, len = 34) {
  const g = new THREE.Group();
  g.add(box(len, 3.2, len * 0.18, hullColor, 0, -1.5, 0));
  g.add(box(len, 0.6, len * 0.18 + 0.02, 0x222222, 0, -1.6, 0));
  g.add(box(len * 0.18, 4.5, len * 0.16, 0xf2f2f2, -len * 0.38, 1.7, 0));
  g.add(box(len * 0.05, 2, len * 0.05, 0xd62828, -len * 0.38, 6.2, 0));
  const colors = [0xd62828, 0x1d3557, 0xf77f00, 0x2a9d8f, 0x6a4c93, 0xe9c46a];
  let k = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      g.add(box(len * 0.1, 1.3, len * 0.07, colors[k++ % colors.length], -len * 0.2 + i * len * 0.11, 1.7 + j * 1.3, -len * 0.04));
      g.add(box(len * 0.1, 1.3, len * 0.07, colors[k++ % colors.length], -len * 0.2 + i * len * 0.11, 1.7 + j * 1.3, len * 0.04));
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

/** Thin flag on a pole — Pakistan green/white by default. */
export function flagPole(x, z, h = 8, pak = true) {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.08, h, 0xdddddd, 0, 0, 0, 6));
  const fl = new THREE.Group();
  const white = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), mat(0xffffff, { side: THREE.DoubleSide }));
  white.position.x = 0.25;
  const green = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), mat(pak ? 0x0b6e3b : 0xe63946, { side: THREE.DoubleSide }));
  green.position.x = 1.25;
  fl.add(white, green);
  if (pak) {
    const moon = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 12, 1, 0.6, Math.PI * 1.6), mat(0xffffff, { side: THREE.DoubleSide }));
    moon.position.set(1.25, 0, 0.01);
    fl.add(moon);
  }
  fl.position.y = h - 0.8;
  g.add(fl);
  g.position.set(x, 0, z);
  g.userData.flag = fl;
  return g;
}

export function shadowAll(g) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
