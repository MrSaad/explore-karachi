// Always-on HUD: current area, corner minimap, buttons, progress and key prompts.
import { getPaintedCanvas } from '../world/mapPainter.js';
import { WORLD } from '../world/layout.js';

const MAP_SCALE = 2; // px per world unit in the cached map image
const MINI_ZOOM = 1.15; // minimap px per world unit

export class Hud extends EventTarget {
  constructor(root, { categories }) {
    super();
    this.categories = categories;
    this.el = document.createElement('div');
    this.el.innerHTML = `
      <div class="panel hud-area">
        <div class="label">You are in</div>
        <div class="name">Karachi</div>
        <div class="urdu">کراچی</div>
      </div>
      <div class="hud-right">
        <div class="minimap" title="Open map (M)">
          <canvas width="380" height="380"></canvas>
          <div class="compass">N</div>
        </div>
        <div class="hud-buttons">
          <button class="icon-btn" data-act="map" title="Map & fast travel (M)">🗺️<kbd>M</kbd></button>
          <button class="icon-btn" data-act="passport" title="Passport (P)">📕<kbd>P</kbd></button>
          <button class="icon-btn" data-act="sound" title="Sound on/off">🔊</button>
          <button class="icon-btn" data-act="help" title="Controls (?)">❔</button>
        </div>
      </div>
      <div class="hud-bottom-left">
        <button class="progress-pill" data-act="passport" title="Open passport (P)">
          <svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="#efe4cc" stroke-width="5"/>
          <circle class="arc" cx="18" cy="18" r="15" fill="none" stroke="#0b6e3b" stroke-width="5" stroke-linecap="round"
            stroke-dasharray="0 100" transform="rotate(-90 18 18)"/></svg>
          <span><span class="count">0</span>/<span class="total">0</span> stamps <small>· Passport</small></span>
        </button>
      </div>
      <div class="prompt"></div>`;
    root.appendChild(this.el);

    this.areaName = this.el.querySelector('.hud-area .name');
    this.areaUrdu = this.el.querySelector('.hud-area .urdu');
    this.promptEl = this.el.querySelector('.prompt');
    this.mini = this.el.querySelector('.minimap canvas');
    this.miniCtx = this.mini.getContext('2d');
    this.mapImage = getPaintedCanvas('map', MAP_SCALE);
    this._promptKey = '';
    this._area = '';

    this.el
      .querySelectorAll('[data-act]')
      .forEach((b) =>
        b.addEventListener('click', () => this.dispatchEvent(new CustomEvent('action', { detail: b.dataset.act }))),
      );
    this.el
      .querySelector('.minimap')
      .addEventListener('click', () => this.dispatchEvent(new CustomEvent('action', { detail: 'map' })));
  }

  setSound(on) {
    this.el.querySelector('[data-act=sound]').textContent = on ? '🔊' : '🔇';
  }

  setArea(name, urdu) {
    if (name === this._area) return;
    this._area = name;
    this.areaName.textContent = name;
    this.areaUrdu.textContent = urdu || '';
  }

  setProgress(count, total) {
    this.el.querySelector('.count').textContent = count;
    this.el.querySelector('.total').textContent = total;
    const pct = total ? (count / total) * 94.2 : 0;
    this.el.querySelector('.arc').setAttribute('stroke-dasharray', `${pct} 100`);
  }

  /** tips: [{ keys: ['F'], text: 'Get in the rickshaw' }] */
  setPrompts(tips) {
    const key = tips.map((t) => t.keys.join('+') + t.text).join('|');
    if (key === this._promptKey) return;
    this._promptKey = key;
    this.promptEl.innerHTML = tips
      .map((t) => `<div class="tip">${t.keys.map((k) => `<kbd>${k}</kbd>`).join('')} ${t.text}</div>`)
      .join('');
  }

  drawMinimap({ x, z, heading, rickshaw, entries, discovered, driving }) {
    const ctx = this.miniCtx;
    const W = this.mini.width,
      H = this.mini.height;
    const s = MINI_ZOOM * (W / 190);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#8fcde3';
    ctx.fillRect(0, 0, W, H);
    // map image: world (x, z) → image ((x - minX) * MAP_SCALE, (z - minZ) * MAP_SCALE)
    const k = s / MAP_SCALE;
    ctx.setTransform(k, 0, 0, k, W / 2 - (x - WORLD.minX) * MAP_SCALE * k, H / 2 - (z - WORLD.minZ) * MAP_SCALE * k);
    ctx.drawImage(this.mapImage, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const toScreen = (wx, wz) => [W / 2 + (wx - x) * s, H / 2 + (wz - z) * s];

    // places
    for (const e of entries) {
      const [sx, sy] = toScreen(e.pos.x, e.pos.z);
      if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;
      const cat = this.categories[e.place.category];
      const seen = discovered.has(e.place.id);
      ctx.beginPath();
      ctx.arc(sx, sy, seen ? 7 : 8, 0, Math.PI * 2);
      ctx.fillStyle = seen ? cat.color : '#fff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = seen ? '#fff' : cat.color;
      ctx.stroke();
      if (!seen) {
        ctx.fillStyle = cat.color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', sx, sy + 0.5);
      }
    }

    // parked rickshaw
    if (!driving && rickshaw) {
      const [rx, ry] = toScreen(rickshaw.x, rickshaw.z);
      ctx.fillStyle = '#1f9d55';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(rx - 6, ry - 5, 12, 10, 3);
      ctx.fill();
      ctx.stroke();
    }

    // player arrow (heading 0 = +z = down on the map)
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-heading);
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(9, -8);
    ctx.lineTo(0, -3);
    ctx.lineTo(-9, -8);
    ctx.closePath();
    ctx.fillStyle = '#e63946';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  }
}
