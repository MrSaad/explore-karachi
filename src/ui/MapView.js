// Full-screen map: see every place (visited or not), filter by category,
// and click anywhere on land to fast-travel there.
import { getPaintedCanvas } from '../world/mapPainter.js';
import { WORLD, DISTRICTS } from '../world/layout.js';

const MAP_SCALE = 2;

export class MapView extends EventTarget {
  constructor(root, { categories, places }) {
    super();
    this.root = root;
    this.categories = categories;
    this.places = places;
    this.hidden = new Set();
    this.el = null;
    this.highlight = null;
  }

  get isOpen() {
    return !!this.el;
  }

  open({ entries, discovered, player, highlight = null }) {
    if (this.el) return;
    this.entries = entries;
    this.discovered = discovered;
    this.player = player;
    this.highlight = highlight;
    const counts = {};
    for (const e of entries) {
      const c = (counts[e.place.category] ||= { total: 0, seen: 0 });
      c.total++;
      if (discovered.has(e.place.id)) c.seen++;
    }
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.innerHTML = `
      <div class="panel">
        <button class="close-btn" type="button" aria-label="Close map">✕</button>
        <div class="title-row">
          <h2>Map of Karachi</h2>
          <span class="sub">Click anywhere on land to travel there · ${discovered.size}/${entries.length} places visited</span>
        </div>
        <div class="map-body">
          <div class="map-wrap"><canvas></canvas><div class="map-tip hidden"></div></div>
          <div class="map-side">
            <h3>Show on map</h3>
            <div class="legend">
              ${Object.entries(this.categories)
                .map(([id, c]) => `<button data-cat="${id}" class="${this.hidden.has(id) ? 'off' : ''}">
                  <span class="dot" style="background:${c.color}"></span>${c.icon} ${c.label}
                  <span class="count">${counts[id]?.seen || 0}/${counts[id]?.total || 0}</span></button>`)
                .join('')}
            </div>
            <div class="map-key">
              <span><i style="background:#0b6e3b"></i>Visited</span>
              <span><i style="background:#fff;border:2px solid #0b6e3b"></i>Not yet</span>
              <span><i style="background:#e63946"></i>You</span>
            </div>
            <div class="map-help">Fast travel works on foot or in the rickshaw. If you're on foot, your rickshaw stays where you parked it, but you can always press <kbd>R</kbd> to call it.</div>
          </div>
        </div>
      </div>`;
    this.root.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas');
    this.tip = this.el.querySelector('.map-tip');
    this.el.querySelector('.close-btn').addEventListener('click', () => this.close());
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.querySelectorAll('.legend button').forEach((b) =>
      b.addEventListener('click', () => {
        const c = b.dataset.cat;
        if (this.hidden.has(c)) this.hidden.delete(c);
        else this.hidden.add(c);
        b.classList.toggle('off', this.hidden.has(c));
        this.draw();
      }),
    );
    this.canvas.addEventListener('mousemove', (e) => this._hover(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hover = null;
      this.tip.classList.add('hidden');
      this.draw();
    });
    this.canvas.addEventListener('click', (e) => this._click(e));
    this._resize = () => this._layout();
    window.addEventListener('resize', this._resize);
    this._layout();
    this._t = 0;
    const tick = () => {
      if (!this.el) return;
      this._t += 1 / 60;
      if (this.highlight) this.draw();
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  close() {
    if (!this.el) return;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resize);
    this.el.remove();
    this.el = null;
    this.dispatchEvent(new Event('close'));
  }

  _layout() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    // fit the land (not all the sea) into the canvas
    const bounds = { minX: -440, maxX: 440, minZ: -320, maxZ: 200 };
    const bw = bounds.maxX - bounds.minX, bh = bounds.maxZ - bounds.minZ;
    this.scale = Math.min(this.canvas.width / bw, this.canvas.height / bh);
    this.ox = (this.canvas.width - bw * this.scale) / 2 - bounds.minX * this.scale;
    this.oz = (this.canvas.height - bh * this.scale) / 2 - bounds.minZ * this.scale;
    this.draw();
  }

  toScreen(x, z) {
    return [this.ox + x * this.scale, this.oz + z * this.scale];
  }

  toWorld(sx, sy) {
    return [(sx - this.ox) / this.scale, (sy - this.oz) / this.scale];
  }

  draw() {
    const ctx = this.canvas.getContext('2d');
    const { width: W, height: H } = this.canvas;
    const dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#7fc6df';
    ctx.fillRect(0, 0, W, H);
    const img = getPaintedCanvas('map', MAP_SCALE);
    const [ix, iy] = this.toScreen(WORLD.minX, WORLD.minZ);
    ctx.drawImage(img, ix, iy, img.width * (this.scale / MAP_SCALE), img.height * (this.scale / MAP_SCALE));

    // neighbourhood names
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of DISTRICTS) {
      const [sx, sy] = this.toScreen(d.center[0], d.center[1] - d.r * 0.55);
      ctx.font = `700 ${11 * dpr}px Inter, sans-serif`;
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(255,250,240,0.9)';
      const label = d.name.replace(/ \(.+\)/, '').toUpperCase();
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = 'rgba(70,55,40,0.75)';
      ctx.fillText(label, sx, sy);
    }
    ctx.font = `italic 600 ${16 * dpr}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const [sx, sy] = this.toScreen(80, 230);
    ctx.fillText('A R A B I A N   S E A', sx, sy);

    // places
    for (const e of this.entries) {
      if (this.hidden.has(e.place.category)) continue;
      const cat = this.categories[e.place.category];
      const seen = this.discovered.has(e.place.id);
      const [px, py] = this.toScreen(e.pos.x, e.pos.z);
      const r = (this.hover === e ? 10 : 8) * dpr;
      if (this.highlight === e.place.id) {
        const pulse = (Math.sin(this._t * 5) * 0.5 + 0.5) * 14 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, r + 6 * dpr + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = cat.color;
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = seen ? cat.color : '#fff';
      ctx.fill();
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = seen ? '#fff' : cat.color;
      ctx.stroke();
      ctx.fillStyle = seen ? '#fff' : cat.color;
      ctx.font = `800 ${10 * dpr}px Inter, sans-serif`;
      ctx.fillText(seen ? '✓' : '?', px, py + 0.5 * dpr);
    }

    // player
    const [ppx, ppy] = this.toScreen(this.player.x, this.player.z);
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(-this.player.heading);
    ctx.beginPath();
    ctx.moveTo(0, 11 * dpr);
    ctx.lineTo(8 * dpr, -7 * dpr);
    ctx.lineTo(0, -2 * dpr);
    ctx.lineTo(-8 * dpr, -7 * dpr);
    ctx.closePath();
    ctx.fillStyle = '#e63946';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5 * dpr;
    ctx.stroke();
    ctx.restore();

    if (this.cursor && !this.hover) {
      const [cx, cy] = this.cursor;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(42,33,26,0.7)';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    }
  }

  _pick(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) * this.dpr, sy = (e.clientY - r.top) * this.dpr;
    let best = null, bestD = 14 * this.dpr;
    for (const en of this.entries) {
      if (this.hidden.has(en.place.category)) continue;
      const [px, py] = this.toScreen(en.pos.x, en.pos.z);
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestD) { bestD = d; best = en; }
    }
    return { sx, sy, entry: best, cssX: e.clientX - r.left, cssY: e.clientY - r.top };
  }

  _hover(e) {
    const { sx, sy, entry, cssX, cssY } = this._pick(e);
    this.hover = entry;
    this.cursor = [sx, sy];
    if (entry) {
      const seen = this.discovered.has(entry.place.id);
      const cat = this.categories[entry.place.category];
      this.tip.innerHTML = `${entry.place.name}<small>${cat.icon} ${cat.label} · ${seen ? 'Visited ✓' : 'Not visited yet'} · click to travel</small>`;
    } else {
      const [wx, wz] = this.toWorld(sx, sy);
      const d = this._districtAt(wx, wz);
      this.tip.innerHTML = d ? `${d.name}<small>Click to travel here</small>` : `Travel here`;
    }
    this.tip.style.left = `${cssX}px`;
    this.tip.style.top = `${cssY}px`;
    this.tip.classList.remove('hidden');
    this.canvas.style.cursor = entry ? 'pointer' : 'crosshair';
    this.draw();
  }

  _districtAt(x, z) {
    let best = null, bestD = 1;
    for (const d of DISTRICTS) {
      const k = Math.hypot(x - d.center[0], z - d.center[1]) / d.r;
      if (k < bestD) { bestD = k; best = d; }
    }
    return best;
  }

  _click(e) {
    const { sx, sy, entry } = this._pick(e);
    if (entry) {
      this.dispatchEvent(new CustomEvent('travel', { detail: { x: entry.pos.x, z: entry.pos.z, place: entry.place } }));
    } else {
      const [x, z] = this.toWorld(sx, sy);
      this.dispatchEvent(new CustomEvent('travel', { detail: { x, z, place: null } }));
    }
  }
}
