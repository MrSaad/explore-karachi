// Title screen: loading progress, then choose an explorer and start.
import * as THREE from 'three';
import { Character, OUTFITS } from '../entities/Character.js';

export class StartScreen {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'start';
    this.el.innerHTML = `
      <div class="panel start-inner">
        <div class="urdu urdu-title">کراچی کی سیر</div>
        <h1>Explore <span>Karachi</span></h1>
        <p class="lede">Walk the streets of Pakistan's biggest city, flag down a rickshaw, and collect a passport stamp
        for every landmark, bazaar, beach and neighbourhood you discover, along with the stories behind them.</p>
        <div class="loading">
          <div class="loading-line">Loading…</div>
          <div class="loading-bar"><div></div></div>
        </div>
        <div class="ready hidden">
          <div class="chooser">
            <button class="choice selected" data-outfit="male" type="button">
              <canvas width="360" height="380"></canvas>
              <strong>Shalwar kameez &amp; waistcoat</strong>
              <small>Crisp white cotton, ready for the heat</small>
            </button>
            <button class="choice" data-outfit="female" type="button">
              <canvas width="360" height="380"></canvas>
              <strong>Shalwar kameez &amp; dupatta</strong>
              <small>Teal kameez, marigold dupatta</small>
            </button>
          </div>
          <div class="start-actions"></div>
          <div class="start-foot">Best with sound on 🔊 · Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move</div>
        </div>
      </div>`;
    root.appendChild(this.el);
    this.lineEl = this.el.querySelector('.loading-line');
    this.barEl = this.el.querySelector('.loading-bar div');
    this.selected = 'male';
    this.steps = 0;
  }

  progress(label, fraction) {
    this.lineEl.textContent = label;
    if (fraction !== undefined) this.barEl.style.width = `${Math.round(fraction * 100)}%`;
  }

  _startPreviews() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(360, 380, false);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x9a8a6a, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const cam = new THREE.PerspectiveCamera(30, 360 / 380, 0.1, 50);
    cam.position.set(0, 1.4, 5.2);
    cam.lookAt(0, 0.95, 0);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0xe8d5a9 }),
    );
    disc.position.y = -0.04;
    scene.add(disc);
    const chars = {
      male: new Character(OUTFITS.male, { shadows: false }),
      female: new Character(OUTFITS.female, { shadows: false }),
    };
    const canvases = {};
    this.el.querySelectorAll('.choice').forEach((b) => {
      canvases[b.dataset.outfit] = b.querySelector('canvas').getContext('2d');
    });
    let t = 0;
    let last = performance.now();
    const loop = () => {
      if (this.stopped) {
        renderer.dispose();
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      for (const key of ['male', 'female']) {
        const c = chars[key];
        scene.add(c.root);
        const active = key === this.selected;
        c.root.rotation.y = Math.sin(t * 0.8) * 0.5 + (active ? t * 0.6 : 0);
        c.update(dt, active ? 4 : 0);
        renderer.render(scene, cam);
        const ctx = canvases[key];
        ctx.clearRect(0, 0, 360, 380);
        ctx.drawImage(renderer.domElement, 0, 0);
        scene.remove(c.root);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Show the chooser. Resolves with { outfit, fresh } once the player starts.
   * `save` lets us offer "continue".
   */
  choose({ hasProgress, outfit, count, total }) {
    this.el.querySelector('.loading').classList.add('hidden');
    this.el.querySelector('.ready').classList.remove('hidden');
    if (outfit) this._select(outfit);
    this._startPreviews();
    this.el
      .querySelectorAll('.choice')
      .forEach((b) => b.addEventListener('click', () => this._select(b.dataset.outfit)));
    const actions = this.el.querySelector('.start-actions');
    return new Promise((resolve) => {
      const go = (fresh) => {
        this.stopped = true;
        this.el.classList.add('fade');
        setTimeout(() => this.el.remove(), 700);
        resolve({ outfit: this.selected, fresh });
      };
      if (hasProgress) {
        actions.innerHTML = `
          <button class="btn" data-act="continue">Continue journey · ${count}/${total} stamps</button>
          <button class="btn secondary" data-act="fresh">Start a new passport</button>`;
        actions.querySelector('[data-act=continue]').addEventListener('click', () => go(false));
        actions.querySelector('[data-act=fresh]').addEventListener('click', () => {
          if (count === 0 || confirm('Start over? Your collected stamps will be cleared.')) go(true);
        });
      } else {
        actions.innerHTML = `<button class="btn" data-act="start">Start exploring →</button>`;
        actions.querySelector('[data-act=start]').addEventListener('click', () => go(true));
      }
      actions.querySelector('.btn').focus();
    });
  }

  _select(outfit) {
    this.selected = outfit;
    this.el.querySelectorAll('.choice').forEach((b) => b.classList.toggle('selected', b.dataset.outfit === outfit));
  }
}
