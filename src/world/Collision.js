// Very small collision world: circles and rotated boxes in a spatial hash,
// plus the coastline (you can't walk into the sea).
import { getTerrain } from './terrain.js';

const CELL = 16;

export class CollisionWorld {
  constructor() {
    this.cells = new Map();
    this.terrain = getTerrain();
    this._seen = new Set();
  }

  _key(cx, cz) {
    return cx * 100003 + cz;
  }

  _insert(item, minX, minZ, maxX, maxZ) {
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const k = this._key(cx, cz);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(item);
      }
    }
  }

  addCircle(x, z, r, tag = null) {
    const item = { type: 'circle', x, z, r, tag };
    this._insert(item, x - r, z - r, x + r, z + r);
    return item;
  }

  /** Rotated rectangle: centre, half-width (local x), half-depth (local z), rotation about Y. */
  addBox(x, z, hw, hd, angle = 0, tag = null) {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const item = { type: 'box', x, z, hw, hd, c, s, tag };
    const ext = Math.abs(hw * c) + Math.abs(hd * s);
    const ezt = Math.abs(hw * s) + Math.abs(hd * c);
    this._insert(item, x - ext, z - ezt, x + ext, z + ezt);
    return item;
  }

  nearby(x, z, r) {
    this._seen.clear();
    const out = [];
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        const list = this.cells.get(this._key(cx, cz));
        if (!list) continue;
        for (const it of list) {
          if (this._seen.has(it)) continue;
          this._seen.add(it);
          out.push(it);
        }
      }
    }
    return out;
  }

  /** Push a circle (x, z, r) out of all obstacles. Returns corrected {x, z, hit}. */
  resolve(x, z, r) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const it of this.nearby(x, z, r + 2)) {
        if (it.type === 'circle') {
          const dx = x - it.x,
            dz = z - it.z;
          const d = Math.hypot(dx, dz);
          const min = r + it.r;
          if (d < min && d > 1e-5) {
            x = it.x + (dx / d) * min;
            z = it.z + (dz / d) * min;
            moved = hit = true;
          }
        } else {
          // into box-local space (rotation by -angle)
          const dx = x - it.x,
            dz = z - it.z;
          const lx = dx * it.c + dz * it.s;
          const lz = -dx * it.s + dz * it.c;
          const qx = Math.max(-it.hw, Math.min(it.hw, lx));
          const qz = Math.max(-it.hd, Math.min(it.hd, lz));
          let ox = lx - qx,
            oz = lz - qz;
          let d = Math.hypot(ox, oz);
          if (d < r) {
            let nx, nz;
            if (d > 1e-5) {
              nx = ox / d;
              nz = oz / d;
            } else {
              // centre inside the box: push out along the shallowest axis
              const px = it.hw - Math.abs(lx),
                pz = it.hd - Math.abs(lz);
              if (px < pz) {
                nx = Math.sign(lx) || 1;
                nz = 0;
                d = -px;
              } else {
                nx = 0;
                nz = Math.sign(lz) || 1;
                d = -pz;
              }
            }
            const push = r - d;
            const nlx = lx + nx * push,
              nlz = lz + nz * push;
            x = it.x + nlx * it.c - nlz * it.s;
            z = it.z + nlx * it.s + nlz * it.c;
            moved = hit = true;
          }
        }
      }
      if (!moved) break;
    }
    return { x, z, hit };
  }

  /** Is the circle free of obstacles and on land? */
  isFree(x, z, r) {
    if (!this.terrain.isLand(x, z)) return false;
    const res = this.resolve(x, z, r);
    return !res.hit;
  }

  /**
   * Move from (x0,z0) by (dx,dz) with sliding against obstacles and coastline.
   */
  move(x0, z0, dx, dz, r) {
    let x = x0 + dx,
      z = z0 + dz;
    const t = this.terrain;
    if (!t.isLand(x, z)) {
      // slide along the coast by trying each axis on its own
      if (t.isLand(x0 + dx, z0)) z = z0;
      else if (t.isLand(x0, z0 + dz)) x = x0;
      else return { x: x0, z: z0, hit: true };
    }
    const res = this.resolve(x, z, r);
    if (!t.isLand(res.x, res.z)) return { x: x0, z: z0, hit: true };
    return res;
  }

  /** Find a free spot near (x, z) — used for fast travel and parking. */
  findFree(x, z, r, maxR = 60) {
    const land = this.terrain.nearestLand(x, z);
    if (!land) return null;
    [x, z] = land;
    if (this.isFree(x, z, r)) return [x, z];
    for (let rad = 2; rad < maxR; rad += 1.5) {
      const steps = Math.ceil((Math.PI * 2 * rad) / 2);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = x + Math.cos(a) * rad,
          pz = z + Math.sin(a) * rad;
        if (this.isFree(px, pz, r)) return [px, pz];
      }
    }
    return [x, z];
  }
}
