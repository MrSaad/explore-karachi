// Procedural "truck art" panels — the bright, floral, chevron-bordered painting
// style found on Pakistani trucks, buses and rickshaws.
import * as THREE from 'three';
import { mulberry32 } from './math.js';

const BRIGHTS = ['#e63946', '#ffb703', '#219ebc', '#06d6a0', '#ff006e', '#8338ec', '#fb5607', '#ffd60a', '#2a9d8f'];

function flower(ctx, x, y, r, rand) {
  const petals = 6 + Math.floor(rand() * 4);
  const c1 = BRIGHTS[Math.floor(rand() * BRIGHTS.length)];
  const c2 = BRIGHTS[Math.floor(rand() * BRIGHTS.length)];
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.25, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRIGHTS[Math.floor(rand() * BRIGHTS.length)];
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function chevrons(ctx, x, y, w, h, rand) {
  const n = Math.max(4, Math.round(w / h));
  const step = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = BRIGHTS[(i + Math.floor(rand() * 2)) % BRIGHTS.length];
    ctx.beginPath();
    ctx.moveTo(x + i * step, y + h);
    ctx.lineTo(x + i * step + step / 2, y);
    ctx.lineTo(x + (i + 1) * step, y + h);
    ctx.fill();
  }
}

export function truckArtCanvas(seed = 1, base = '#1f9d55', w = 256, h = 128) {
  const rand = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // borders
  const b = h * 0.14;
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(0, 0, w, b);
  ctx.fillRect(0, h - b, w, b);
  chevrons(ctx, 0, 0, w, b, rand);
  chevrons(ctx, 0, h - b, w, b, rand);
  // inner panel
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(b * 0.6, b * 1.4, w - b * 1.2, h - b * 2.8);
  // flowers & dots
  const count = Math.round(w / (h * 0.45));
  for (let i = 0; i < count; i++) {
    flower(ctx, ((i + 0.5) / count) * w, h / 2 + (rand() - 0.5) * h * 0.1, h * 0.2, rand);
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = BRIGHTS[Math.floor(rand() * BRIGHTS.length)];
    ctx.beginPath();
    ctx.arc(rand() * w, b * 1.6 + rand() * (h - b * 3.2), 2 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

const texCache = new Map();
export function truckArtTexture(seed = 1, base = '#1f9d55', w = 256, h = 128) {
  const key = `${seed}|${base}|${w}|${h}`;
  if (!texCache.has(key)) {
    const t = new THREE.CanvasTexture(truckArtCanvas(seed, base, w, h));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
