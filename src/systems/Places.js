// Points of interest: floating markers in the world, proximity detection,
// and the "discovered" set that feeds the passport and the map.
import * as THREE from 'three';

const FAR = 150; // show a small pin within this distance

export class Places extends EventTarget {
  constructor({ places, categories, landmarks, camera, container, discovered = [] }) {
    super();
    this.places = places;
    this.categories = categories;
    this.camera = camera;
    this.discovered = new Set(discovered);
    this.byId = new Map(places.map((p) => [p.id, p]));
    this.entries = landmarks.list; // { place, pos, anchor }
    this.nearest = null;
    this._v = new THREE.Vector3();

    this.layer = document.createElement('div');
    this.layer.className = 'markers';
    container.appendChild(this.layer);

    for (const e of this.entries) {
      const cat = categories[e.place.category];
      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = `
        <div class="pin" style="background:${cat.color}"></div>
        <button class="bubble" type="button" aria-label="Learn about ${e.place.name}">
          <span class="ico" style="background:${cat.color}">${cat.icon}</span>
          <span class="txt">${e.place.name}<small>Click or press Space</small></span>
        </button>
        <div class="stem"></div>`;
      el.querySelector('.bubble').addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.open(e.place.id);
      });
      this.layer.appendChild(el);
      e.el = el;
      e.state = '';
      this._applySeen(e);
    }
  }

  _applySeen(e) {
    e.el.classList.toggle('seen', this.discovered.has(e.place.id));
  }

  get total() {
    return this.places.length;
  }

  get count() {
    return this.discovered.size;
  }

  isDiscovered(id) {
    return this.discovered.has(id);
  }

  /** Open a place's card. Marks it discovered the first time. */
  open(id) {
    const place = this.byId.get(id);
    if (!place) return;
    const first = !this.discovered.has(id);
    if (first) {
      this.discovered.add(id);
      const e = this.entries.find((x) => x.place.id === id);
      if (e) this._applySeen(e);
      this.dispatchEvent(new CustomEvent('discover', { detail: { place } }));
    }
    this.dispatchEvent(new CustomEvent('open', { detail: { place, first } }));
  }

  reset() {
    this.discovered.clear();
    for (const e of this.entries) this._applySeen(e);
  }

  /** Distance from the player to a place (to its centre or its model, whichever is closer). */
  distance(e, p) {
    const a = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
    const b = Math.hypot(p.x - e.anchor.x, p.z - e.anchor.z);
    return Math.min(a, b);
  }

  update(playerPos, width, height) {
    let nearest = null;
    let nearestD = Infinity;
    for (const e of this.entries) {
      const d = this.distance(e, playerPos);
      const near = d <= e.place.radius;
      if (near && d < nearestD) {
        nearest = e;
        nearestD = d;
      }
      const visible = d < FAR;
      if (!visible) {
        if (e.state !== 'off') {
          e.el.style.display = 'none';
          e.state = 'off';
        }
        continue;
      }
      // project anchor to screen
      this._v.copy(e.anchor).project(this.camera);
      const x = (this._v.x * 0.5 + 0.5) * width;
      const y = (-this._v.y * 0.5 + 0.5) * height;
      const onScreen = x > -100 && x < width + 100 && y > -100 && y < height + 100;
      if (!onScreen) {
        if (e.state !== 'off') {
          e.el.style.display = 'none';
          e.state = 'off';
        }
        continue;
      }
      if (e.state === 'off' || e.state === '') e.el.style.display = '';
      const state = near ? 'near' : 'far';
      if (state !== e.state) {
        e.el.classList.toggle('near', near);
        e.state = state;
      }
      e.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (nearest !== this.nearest) {
      if (this.nearest) this.nearest.el.classList.remove('focus');
      if (nearest) nearest.el.classList.add('focus');
      this.nearest = nearest;
      this.dispatchEvent(new CustomEvent('nearest', { detail: { place: nearest?.place || null } }));
    }
  }
}
