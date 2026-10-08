// Rasterised lookups for the map: "is this point land?", "is there a road here?",
// "can a building go here?". Painting shapes onto small canvases and reading the
// pixels back is much faster than polygon tests when we place thousands of buildings.
import { COAST, RIVERS, ROADS, ROUNDABOUTS, PARKS, NO_BUILD, HILLS, WORLD } from './layout.js';

const RES = 1; // pixels per world unit
const W = Math.ceil((WORLD.maxX - WORLD.minX) * RES);
const H = Math.ceil((WORLD.maxZ - WORLD.minZ) * RES);

function makeCtx() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(RES, 0, 0, RES, -WORLD.minX * RES, -WORLD.minZ * RES);
  return ctx;
}

export function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function traceLine(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

function readMask(ctx) {
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4];
  return out;
}

class Terrain {
  constructor() {
    // Land
    let ctx = makeCtx();
    ctx.fillStyle = '#fff';
    tracePoly(ctx, COAST);
    ctx.fill();
    this.land = readMask(ctx);
    this._landCtx = ctx;

    // Roads + rivers (with a margin) — used for keeping buildings off them
    ctx = makeCtx();
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of ROADS) {
      ctx.lineWidth = r.width + 5;
      traceLine(ctx, r.path);
      ctx.stroke();
    }
    for (const r of RIVERS) {
      ctx.lineWidth = r.width + 5;
      traceLine(ctx, r.path);
      ctx.stroke();
    }
    for (const rb of ROUNDABOUTS) {
      ctx.beginPath();
      ctx.arc(rb.at[0], rb.at[1], rb.r + 3, 0, Math.PI * 2);
      ctx.fill();
    }
    this.road = readMask(ctx);

    // Places where generic buildings may not go
    ctx = makeCtx();
    ctx.fillStyle = '#fff';
    for (const p of PARKS) {
      ctx.beginPath();
      ctx.arc(p.at[0], p.at[1], p.r + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const z of NO_BUILD) {
      if (z.poly) tracePoly(ctx, z.poly);
      else {
        ctx.beginPath();
        ctx.arc(z.at[0], z.at[1], z.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    for (const h of HILLS) {
      ctx.beginPath();
      ctx.arc(h.at[0], h.at[1], h.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // keep a beach strip clear along the coast
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 22;
    tracePoly(ctx, COAST);
    ctx.stroke();
    this.blocked = readMask(ctx);
    this._blockCtx = ctx;
  }

  idx(x, z) {
    const px = Math.floor((x - WORLD.minX) * RES);
    const pz = Math.floor((z - WORLD.minZ) * RES);
    if (px < 0 || pz < 0 || px >= W || pz >= H) return -1;
    return pz * W + px;
  }

  isLand(x, z) {
    const i = this.idx(x, z);
    return i >= 0 && this.land[i] > 127;
  }

  isRoad(x, z) {
    const i = this.idx(x, z);
    return i >= 0 && this.road[i] > 127;
  }

  isBlocked(x, z) {
    const i = this.idx(x, z);
    return i < 0 || this.blocked[i] > 127;
  }

  /** Reserve a circular area (e.g. around a landmark) so filler buildings avoid it. */
  reserve(x, z, r) {
    const ctx = this._blockCtx;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
    this.blocked = readMask(ctx);
  }

  reserveMany(circles) {
    const ctx = this._blockCtx;
    ctx.fillStyle = '#fff';
    for (const c of circles) {
      ctx.beginPath();
      ctx.arc(c.x, c.z, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.blocked = readMask(ctx);
  }

  /** Make extra areas walkable (piers and decks over the water). */
  addLand(polys) {
    const ctx = this._landCtx;
    ctx.fillStyle = '#fff';
    for (const poly of polys) {
      tracePoly(ctx, poly);
      ctx.fill();
    }
    this.land = readMask(ctx);
  }

  /** Is a rectangle completely buildable? Samples corners + centre. */
  canBuild(x, z, hw, hd) {
    const pts = [
      [x, z],
      [x - hw, z - hd],
      [x + hw, z - hd],
      [x - hw, z + hd],
      [x + hw, z + hd],
    ];
    for (const [px, pz] of pts) {
      if (!this.isLand(px, pz) || this.isRoad(px, pz) || this.isBlocked(px, pz)) return false;
    }
    return true;
  }

  /** Nearest land point to (x, z), searching outward in rings. */
  nearestLand(x, z, maxR = 200) {
    if (this.isLand(x, z)) return [x, z];
    for (let r = 2; r < maxR; r += 2) {
      const steps = Math.ceil((Math.PI * 2 * r) / 2);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r;
        if (this.isLand(px, pz)) return [px, pz];
      }
    }
    return null;
  }
}

let instance = null;
export function getTerrain() {
  if (!instance) instance = new Terrain();
  return instance;
}
