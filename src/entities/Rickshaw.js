// The auto-rickshaw: three wheels, black canopy, truck-art panels, attitude.
import * as THREE from 'three';
import { mat } from '../world/materials.js';
import { truckArtTexture } from '../utils/truckArt.js';
import { clamp } from '../utils/math.js';

export function buildRickshawModel({ body = 0x1f9d55, art = '#1f9d55', seed = 3, shadows = true } = {}) {
  const g = new THREE.Group();
  const paint = mat(body, { roughness: 0.5 });
  const black = mat(0x1b1b1d, { roughness: 0.8 });
  const chrome = mat(0xd9dde2, { roughness: 0.25, metalness: 0.8 });
  const artTex = truckArtTexture(seed, art, 256, 96);
  const artMat = new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.6 });

  // floor pan
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 2.3), black);
  floor.position.set(0, 0.42, -0.1);
  g.add(floor);

  // lower body with truck-art side panels (art on the sides, paint elsewhere)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.5, 1.75), [artMat, artMat, paint, paint, paint, paint]);
  lower.position.set(0, 0.76, -0.35);
  g.add(lower);

  // front cowl (driver's nose), tapered
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.6, 0.85, 4, 1), paint);
  nose.rotation.y = Math.PI / 4;
  nose.scale.set(1, 1, 0.75);
  nose.position.set(0, 0.85, 0.85);
  g.add(nose);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.06), mat(0xffd60a));
  stripe.position.set(0, 0.95, 1.18);
  stripe.rotation.x = -0.32;
  g.add(stripe);

  // headlight + indicator lights
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10),
    mat(0xfff6c9, { emissive: 0xfff2a8, emissiveIntensity: 0.6 }),
  );
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 1.08, 1.12);
  g.add(head);

  // windscreen
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xbfe3f2,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.set(0, 1.5, 0.72);
  glass.rotation.x = -0.18;
  g.add(glass);

  // canopy pillars + roof
  for (const [x, z] of [
    [-0.58, 0.68],
    [0.58, 0.68],
    [-0.6, -1.15],
    [0.6, -1.15],
  ]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 5), chrome);
    p.position.set(x, 1.48, z);
    g.add(p);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.1, 2.05), black);
  roof.position.set(0, 1.98, -0.24);
  g.add(roof);
  const roofCurve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.67, 0.67, 2.05, 10, 1, false, -Math.PI / 2, Math.PI),
    black,
  );
  roofCurve.rotation.x = Math.PI / 2;
  roofCurve.scale.set(1, 1, 0.22);
  roofCurve.position.set(0, 2.02, -0.24);
  g.add(roofCurve);
  // rear canvas curtain
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.95, 0.06), black);
  back.position.set(0, 1.5, -1.17);
  g.add(back);
  // decorative fringe on the roof edge
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 0.04), mat(0xe63946));
  fringe.position.set(0, 1.9, 0.79);
  g.add(fringe);

  // seats
  const seatMat = mat(0x9b2226);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.55), seatMat);
  bench.position.set(0, 1.08, -0.72);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.12), seatMat);
  benchBack.position.set(0, 1.35, -1.05);
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.42), seatMat);
  driverSeat.position.set(0, 1.08, 0.12);
  g.add(bench, benchBack, driverSeat);

  // handlebar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5), chrome);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.3, 0.6);
  g.add(bar);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [x, z] of [
    [0, 0.95],
    [-0.62, -0.75],
    [0.62, -0.75],
  ]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(wheelGeo, black), new THREE.Mesh(hubGeo, chrome));
    w.position.set(x, 0.26, z);
    g.add(w);
    wheels.push(w);
  }
  const mudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10, 1, true, 0, Math.PI), paint);
  mudguard.rotation.z = Math.PI / 2;
  mudguard.position.set(0, 0.3, 0.95);
  g.add(mudguard);

  if (shadows)
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  g.userData.wheels = wheels;
  return g;
}

export class Rickshaw {
  constructor() {
    this.root = new THREE.Group();
    this.chassis = buildRickshawModel();
    this.root.add(this.chassis);
    this.wheels = this.chassis.userData.wheels;
    this.heading = 0; // radians; 0 faces +z
    this.speed = 0;
    this.steer = 0;
    this.maxSpeed = 24;
    this.boostSpeed = 32;
    this.radius = 1.8;
    this.t = 0;
    this.occupied = false;
  }

  get position() {
    return this.root.position;
  }

  /**
   * Arcade driving. throttle in [-1, 1], steerInput in [-1, 1] (+1 = turn right).
   * Returns { hit } so the caller can play a bump sound.
   */
  drive(dt, throttle, steerInput, boost, collision) {
    const max = boost ? this.boostSpeed : this.maxSpeed;
    if (throttle > 0) {
      this.speed += (this.speed < 0 ? 30 : 13) * throttle * dt;
    } else if (throttle < 0) {
      this.speed += (this.speed > 0 ? -30 : -8) * -throttle * dt;
    } else {
      const drag = 6 * dt;
      this.speed = Math.abs(this.speed) < drag ? 0 : this.speed - Math.sign(this.speed) * drag;
    }
    this.speed = clamp(this.speed, -7, max);
    if (this.speed > this.maxSpeed && !boost) this.speed -= 10 * dt;

    this.steer += (steerInput - this.steer) * Math.min(1, dt * 8);
    const grip = clamp(Math.abs(this.speed) / 6, 0, 1) * (1 - clamp((Math.abs(this.speed) - 20) / 30, 0, 0.35));
    this.heading -= this.steer * 1.9 * grip * Math.sign(this.speed || 1) * dt;

    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    const p = this.root.position;
    const res = collision.move(p.x, p.z, dx, dz, this.radius);
    let hit = false;
    if (res.hit) {
      const moved = Math.hypot(res.x - p.x, res.z - p.z);
      const wanted = Math.hypot(dx, dz);
      if (wanted > 0.05 && moved < wanted * 0.5) {
        hit = Math.abs(this.speed) > 8;
        this.speed *= 0.35;
      }
    }
    p.x = res.x;
    p.z = res.z;
    this.root.rotation.y = this.heading;
    return { hit };
  }

  /** Visual life: wheel spin, body roll, idle shudder. */
  animate(dt) {
    this.t += dt;
    for (const w of this.wheels) w.rotation.x += (this.speed * dt) / (0.26 * this.root.scale.x);
    this.wheels[0].rotation.y = this.steer * 0.5;
    const roll = -this.steer * clamp(this.speed / this.maxSpeed, -1, 1) * 0.08;
    this.chassis.rotation.z += (roll - this.chassis.rotation.z) * Math.min(1, dt * 6);
    const shake = this.occupied ? (Math.abs(this.speed) < 1 ? 0.012 : 0.006) : 0;
    this.chassis.position.y = Math.sin(this.t * 55) * shake;
  }
}
