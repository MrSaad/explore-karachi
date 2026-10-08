// Owns the renderer, scene, world, player and the main loop.
import * as THREE from 'three';
import { IsoCamera } from './IsoCamera.js';
import { Input } from './Input.js';
import { buildGround } from '../world/Ground.js';
import { buildBuildings } from '../world/Buildings.js';
import { buildLandmarks } from '../world/landmarks/index.js';
import { buildAmbient } from '../world/Ambient.js';
import { CollisionWorld } from '../world/Collision.js';
import { getTerrain } from '../world/terrain.js';
import { Player } from '../entities/Player.js';
import { SPAWN } from '../world/layout.js';

export class Game extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.updaters = []; // (dt, t) => void, for world systems
    this.paused = false;

    // ?quality=low → no shadows/antialiasing (also handy for headless testing)
    this.lowQuality = new URLSearchParams(location.search).get('quality') === 'low';
    const renderer = new THREE.WebGLRenderer({ antialias: !this.lowQuality, powerPreference: 'high-performance' });
    renderer.setPixelRatio(this.lowQuality ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !this.lowQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfdbe6);

    this.iso = new IsoCamera(container.clientWidth / container.clientHeight);
    this.camera = this.iso.camera;
    this.input = new Input();

    this._setupLights();
    window.addEventListener('resize', () => this.resize());
    renderer.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.iso.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
      },
      { passive: false },
    );
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x9a8a6a, 1.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 60;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.4;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.sunOffset = new THREE.Vector3(-60, 120, 45);
  }

  /** Build the static world. `onProgress(label)` lets the loading screen narrate. */
  async buildWorld(onProgress = () => {}) {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    onProgress('Surveying the coastline…');
    await tick();
    this.terrain = getTerrain();
    this.collision = new CollisionWorld();
    onProgress('Paving Shahrah-e-Faisal…');
    await tick();
    this.ground = buildGround(this.scene);
    this.updaters.push((dt, t) => this.ground.update(t));
  }

  async buildCity(places, onProgress = () => {}) {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    onProgress('Restoring the landmarks…');
    await tick();
    this.landmarks = buildLandmarks(this.scene, this.collision, this.terrain, places);
    this.updaters.push((dt, t) => this.landmarks.update(t));
    onProgress('Raising the skyline…');
    await tick();
    this.buildings = buildBuildings(this.scene, this.collision);
    onProgress('Planting trees, starting the traffic…');
    await tick();
    this.ambient = buildAmbient(this.scene, this.collision, this.terrain);
  }

  createPlayer(outfit) {
    this.player = new Player(this.scene, this.collision, outfit);
    const [x, z] = this.collision.findFree(SPAWN[0], SPAWN[1], 0.6);
    this.player.placeAt(x, z, Math.PI);
    this.player.parkRickshawNear(x, z, Math.PI);
    this.iso.snapTo(this.player.position);
  }

  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.iso.setAspect(w / h);
  }

  start(frame) {
    this.onFrame = frame;
    this.renderer.setAnimationLoop(() => this._loop());
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    if (this.onFrame) this.onFrame(dt, this.time);
    for (const u of this.updaters) u(dt, this.time);

    const focus = this.iso.focus;
    this.sun.position.copy(focus).add(this.sunOffset);
    this.sun.target.position.copy(focus);
    this.iso.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
