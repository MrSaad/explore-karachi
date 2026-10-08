// Draws the city onto a 2D canvas. Used twice:
//  - mode 'ground': the texture on the 3D land (soft colours, lanes, beaches)
//  - mode 'map':    the stylised minimap / fast-travel map
import { COAST, RIVERS, ROADS, ROUNDABOUTS, DISTRICTS, PARKS, HILLS, WORLD, n } from './layout.js';
import { districtCells } from './grid.js';
import { tracePoly, traceLine } from './terrain.js';
import { mulberry32 } from '../utils/math.js';

const GROUND_TINT = {
  heritage: '#cdb58a', dense: '#cbb48f', colonial: '#d2bb90', towers: '#c4bcae', bungalow: '#c9c69a',
  apartments: '#d3c3a0', villas: '#ddd0b0', midrise: '#cfbd99', campus: '#bfc48f', industrial: '#b9b2a2',
  informal: '#c6ab84', port: '#b8b2a6', huts: '#e3d2a8', none: '#cfc6b2',
};

const MAP_TINT = {
  heritage: '#ecd6ad', dense: '#eedcbc', colonial: '#efdcb6', towers: '#dfe2e6', bungalow: '#e3ecc8',
  apartments: '#f0e2c8', villas: '#f5ecd8', midrise: '#eedfc4', campus: '#dcebc4', industrial: '#dcd9d2',
  informal: '#e9d4b4', port: '#d9dcdf', huts: '#f6ead0', none: '#e4e1da',
};

export function worldCanvas(scale) {
  const c = document.createElement('canvas');
  c.width = Math.ceil((WORLD.maxX - WORLD.minX) * scale);
  c.height = Math.ceil((WORLD.maxZ - WORLD.minZ) * scale);
  // CPU-backed canvas: rasterising thousands of small shapes is far faster here
  // than on an accelerated canvas, especially on weak/software GPUs.
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(scale, 0, 0, scale, -WORLD.minX * scale, -WORLD.minZ * scale);
  return { canvas: c, ctx };
}

export function paintMap(ctx, mode = 'ground') {
  const isMap = mode === 'map';
  const W = WORLD;

  // Sea
  if (isMap) {
    const g = ctx.createLinearGradient(0, W.minZ, 0, W.maxZ);
    g.addColorStop(0, '#a9dceb');
    g.addColorStop(1, '#6fbfdc');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#2f8fb3';
  }
  ctx.fillRect(W.minX, W.minZ, W.maxX - W.minX, W.maxZ - W.minZ);

  // Land base
  ctx.save();
  tracePoly(ctx, COAST);
  ctx.fillStyle = isMap ? '#f3ead6' : '#d6c39b';
  ctx.fill();
  ctx.clip();

  if (!isMap) {
    // grainy speckle so the ground doesn't look plastic
    const rand = mulberry32(7);
    for (let i = 0; i < 26000; i++) {
      const x = W.minX + rand() * (W.maxX - W.minX);
      const z = W.minZ + rand() * (W.maxZ - W.minZ);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,60,30,0.07)';
      ctx.fillRect(x, z, 1 + rand() * 2, 1 + rand() * 2);
    }
  }

  // Neighbourhood tints
  for (const d of DISTRICTS) {
    const tint = (isMap ? MAP_TINT : GROUND_TINT)[d.style] || '#ccc';
    const g = ctx.createRadialGradient(d.center[0], d.center[1], d.r * 0.2, d.center[0], d.center[1], d.r * 1.1);
    g.addColorStop(0, tint);
    g.addColorStop(0.75, tint);
    g.addColorStop(1, tint + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.center[0], d.center[1], d.r * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Galis (lanes) between blocks
  if (!isMap) {
    ctx.fillStyle = 'rgba(120,108,92,0.55)';
    for (const d of DISTRICTS) {
      for (const c of districtCells(d)) {
        if (!c.lane) continue;
        ctx.save();
        ctx.translate(c.x, c.z);
        ctx.rotate(c.angle);
        ctx.fillRect(-c.size / 2 - 0.3, -c.size / 2 - 0.3, c.size + 0.6, c.size + 0.6);
        ctx.restore();
      }
    }
  }

  // Hills
  for (const h of HILLS) {
    const g = ctx.createRadialGradient(h.at[0], h.at[1], 0, h.at[0], h.at[1], h.r * 1.15);
    g.addColorStop(0, isMap ? '#d9c19a' : '#a88d64');
    g.addColorStop(1, isMap ? '#d9c19a00' : '#a88d6400');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(h.at[0], h.at[1], h.r * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Airport apron + runway
  ctx.fillStyle = isMap ? '#dedbd5' : '#a9a7a2';
  tracePoly(ctx, [n([325, 168]), n([440, 168]), n([440, 320]), n([305, 320])]);
  ctx.fill();
  ctx.save();
  const rc = n([392, 262]);
  ctx.translate(rc[0], rc[1]);
  ctx.rotate(-0.42);
  ctx.fillStyle = isMap ? '#9a9a9a' : '#3d3f44';
  ctx.fillRect(-85, -7, 170, 14);
  if (!isMap) {
    ctx.fillStyle = '#e9e9e9';
    for (let x = -78; x < 78; x += 9) ctx.fillRect(x, -0.4, 5, 0.8);
    ctx.fillRect(-84, -6, 4, 12);
    ctx.fillRect(80, -6, 4, 12);
  }
  ctx.restore();

  // Parks
  for (const p of PARKS) {
    ctx.fillStyle = isMap ? '#c8e3a9' : '#86ad62';
    ctx.beginPath();
    ctx.arc(p.at[0], p.at[1], p.r, 0, Math.PI * 2);
    ctx.fill();
    if (!isMap) {
      ctx.strokeStyle = 'rgba(60,90,40,0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230,215,180,0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.at[0], p.at[1], p.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Beaches along the shore
  ctx.lineJoin = 'round';
  ctx.strokeStyle = isMap ? '#f7e3b0' : '#ecd9a8';
  ctx.lineWidth = isMap ? 8 : 26;
  tracePoly(ctx, COAST);
  ctx.stroke();
  if (!isMap) {
    ctx.strokeStyle = '#d9c08a';
    ctx.lineWidth = 6;
    tracePoly(ctx, COAST);
    ctx.stroke();
  }

  ctx.restore(); // end land clip

  if (isMap) {
    // coastline outline
    ctx.strokeStyle = '#6aaecb';
    ctx.lineWidth = 1.5;
    tracePoly(ctx, COAST);
    ctx.stroke();

    // rivers
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of RIVERS) {
      ctx.strokeStyle = '#8fcbe2';
      ctx.lineWidth = r.width * 0.8;
      traceLine(ctx, r.path);
      ctx.stroke();
    }

    // roads: casing then fill
    for (const pass of ['casing', 'fill']) {
      for (const r of ROADS) {
        const hw = r.kind === 'highway' ? 7 : r.kind === 'main' ? 5.2 : 3.4;
        ctx.strokeStyle = pass === 'casing' ? '#c9b48e' : r.kind === 'highway' ? '#f6c46a' : '#ffffff';
        ctx.lineWidth = pass === 'casing' ? hw + 2 : hw;
        traceLine(ctx, r.path);
        ctx.stroke();
      }
    }
    for (const rb of ROUNDABOUTS) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rb.at[0], rb.at[1], rb.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Big paintings are slow; cache the result per mode/scale. */
const cache = new Map();
export function getPaintedCanvas(mode, scale) {
  const key = `${mode}@${scale}`;
  if (!cache.has(key)) {
    const { canvas, ctx } = worldCanvas(scale);
    paintMap(ctx, mode);
    cache.set(key, canvas);
  }
  return cache.get(key);
}
