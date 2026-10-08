// The player: walks around, hops in and out of the rickshaw.
import * as THREE from 'three';
import { Character } from './Character.js';
import { Rickshaw } from './Rickshaw.js';
import { dampAngle } from '../utils/math.js';

const WALK = 6;
const RUN = 11;

export class Player {
  constructor(scene, collision, outfit) {
    this.scene = scene;
    this.collision = collision;
    this.character = new Character(outfit);
    this.rickshaw = new Rickshaw();
    scene.add(this.character.root, this.rickshaw.root);
    this.mode = 'walk'; // 'walk' | 'drive'
    this.heading = 0;
    this.speed = 0;
    this.radius = 0.45;
    this.events = new EventTarget();
  }

  get position() {
    return this.mode === 'drive' ? this.rickshaw.position : this.character.root.position;
  }

  setOutfit(outfit) {
    const pos = this.character.root.position.clone();
    const rot = this.character.root.rotation.y;
    const parent = this.character.root.parent;
    parent.remove(this.character.root);
    this.character = new Character(outfit);
    this.character.root.position.copy(pos);
    this.character.root.rotation.y = rot;
    parent.add(this.character.root);
    if (this.mode === 'drive') this._seatInRickshaw();
  }

  placeAt(x, z, heading = this.heading) {
    if (this.mode === 'drive') {
      this.rickshaw.position.set(x, 0, z);
      this.rickshaw.heading = heading;
      this.rickshaw.root.rotation.y = heading;
      this.rickshaw.speed = 0;
    } else {
      this.character.root.position.set(x, 0, z);
      this.heading = heading;
      this.character.root.rotation.y = heading;
    }
  }

  parkRickshawNear(x, z, heading = 0) {
    const off = [x + Math.cos(heading) * 2.6, z - Math.sin(heading) * 2.6];
    const spot = this.collision.findFree(off[0], off[1], this.rickshaw.radius) || off;
    this.rickshaw.position.set(spot[0], 0, spot[1]);
    this.rickshaw.heading = heading;
    this.rickshaw.root.rotation.y = heading;
    this.rickshaw.speed = 0;
  }

  distanceToRickshaw() {
    const a = this.character.root.position, b = this.rickshaw.position;
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  canEnter() {
    return this.mode === 'walk' && this.distanceToRickshaw() < 3.6;
  }

  _seatInRickshaw() {
    const c = this.character;
    this.rickshaw.chassis.add(c.root);
    c.root.position.set(0, 0.62, 0.15);
    c.root.rotation.set(0, 0, 0);
    c.setSitting(true);
  }

  enter() {
    if (!this.canEnter()) return false;
    this.mode = 'drive';
    this.rickshaw.occupied = true;
    this._seatInRickshaw();
    this.events.dispatchEvent(new Event('enter'));
    return true;
  }

  exit() {
    if (this.mode !== 'drive') return false;
    const r = this.rickshaw;
    if (Math.abs(r.speed) > 4) return false;
    r.speed = 0;
    r.occupied = false;
    const c = this.character;
    r.chassis.remove(c.root);
    this.scene.add(c.root);
    c.setSitting(false);
    // step out on the left side
    const side = r.heading + Math.PI / 2;
    const want = [r.position.x + Math.sin(side) * 1.8, r.position.z + Math.cos(side) * 1.8];
    const spot = this.collision.findFree(want[0], want[1], this.radius) || want;
    c.root.position.set(spot[0], 0, spot[1]);
    this.heading = r.heading;
    c.root.rotation.y = this.heading;
    this.mode = 'walk';
    this.events.dispatchEvent(new Event('exit'));
    return true;
  }

  /** Summon the rickshaw next to the player (it "pulls up"). */
  callRickshaw() {
    if (this.mode !== 'walk') return false;
    const p = this.character.root.position;
    this.parkRickshawNear(p.x, p.z, this.heading);
    return true;
  }

  update(dt, input, cameraBasis) {
    const result = { hit: false, stepped: false };
    if (this.mode === 'walk') {
      const { x, y } = input.axes();
      const running = input.isDown('shift');
      const { forward, right } = cameraBasis;
      let dx = right[0] * x + forward[0] * y;
      let dz = right[1] * x + forward[1] * y;
      const len = Math.hypot(dx, dz);
      const target = len > 0 ? (running ? RUN : WALK) : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 10);
      if (len > 0) {
        dx /= len; dz /= len;
        this.heading = dampAngle(this.heading, Math.atan2(dx, dz), 14, dt);
        const p = this.character.root.position;
        const res = this.collision.move(p.x, p.z, dx * this.speed * dt, dz * this.speed * dt, this.radius);
        p.x = res.x;
        p.z = res.z;
      }
      this.character.root.rotation.y = this.heading;
      const before = Math.sin(this.character.phase);
      this.character.update(dt, this.speed);
      const after = Math.sin(this.character.phase);
      result.stepped = this.speed > 0.5 && Math.sign(before) !== Math.sign(after);
    } else {
      const { x, y } = input.axes();
      const boost = input.isDown('shift');
      const r = this.rickshaw.drive(dt, y, x, boost, this.collision);
      result.hit = r.hit;
    }
    this.rickshaw.animate(dt);
    return result;
  }
}
