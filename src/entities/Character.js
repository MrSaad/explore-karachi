// Low-poly person in shalwar kameez. Used for the player and for passers-by.
import * as THREE from 'three';
import { mat } from '../world/materials.js';

export const OUTFITS = {
  male: {
    gender: 'male',
    kameez: 0xf2ede0,
    shalwar: 0xf2ede0,
    waistcoat: 0x6b2f2a,
    trim: 0xc9a227,
    shoes: 0x6b4226,
    skin: 0xc68e66,
    hair: 0x1e1a18,
  },
  female: {
    gender: 'female',
    kameez: 0x1f8a8a,
    shalwar: 0xf3e3c3,
    dupatta: 0xf2a541,
    trim: 0xe8c547,
    shoes: 0xb5543c,
    skin: 0xc99070,
    hair: 0x1e1a18,
  },
};

const SKINS = [0xb97f5a, 0xc68e66, 0xa8714f, 0xd1a07c, 0x8e5d3f];
const KAMEEZ = [0xf2ede0, 0x9fb8c9, 0x7a8b6f, 0xd9cbb0, 0x3f5a73, 0xbfa58a, 0xe6e1d6, 0x8c6d5a];
const FEMALE_KAMEEZ = [0xc2185b, 0x1f8a8a, 0x7b3fa0, 0xe07a5f, 0x2e7d32, 0xf2b134, 0x3949ab, 0xd81b60];
const DUPATTA = [0xf2a541, 0xf6e7c1, 0xe91e63, 0x80cbc4, 0xffd54f, 0xffffff, 0xb39ddb];

export function randomOutfit(rand) {
  const p = (arr) => arr[Math.floor(rand() * arr.length)];
  if (rand() < 0.5) {
    const k = p(KAMEEZ);
    return { gender: 'male', kameez: k, shalwar: k, waistcoat: rand() < 0.35 ? p([0x3b3b3b, 0x6b2f2a, 0x2f3f5c]) : null, shoes: p([0x3b2a1e, 0x6b4226, 0x222222]), skin: p(SKINS), hair: 0x1e1a18, cap: rand() < 0.2 ? 0xf5f5f5 : null };
  }
  return { gender: 'female', kameez: p(FEMALE_KAMEEZ), shalwar: p([0xf3e3c3, 0xffffff, 0x222222, 0xf2b134]), dupatta: p(DUPATTA), trim: 0xe8c547, shoes: p([0xb5543c, 0x6b4226, 0xc9a227]), skin: p(SKINS), hair: 0x1e1a18 };
}

const cyl = (rt, rb, h, seg = 8, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

export class Character {
  constructor(outfit = OUTFITS.male, { shadows = true } = {}) {
    this.outfit = outfit;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // bobs up and down while walking
    this.root.add(this.body);
    this.phase = 0;
    this.sitting = false;
    this.build(outfit);
    if (shadows) this.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  build(o) {
    const skin = mat(o.skin);
    const kameez = mat(o.kameez);
    const shalwar = mat(o.shalwar);
    const shoes = mat(o.shoes);
    const female = o.gender === 'female';

    // Legs — baggy shalwar narrowing at the ankle
    this.legs = [-1, 1].map((side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1, 0.92, 0);
      const leg = new THREE.Mesh(cyl(0.12, 0.075, 0.8), shalwar);
      leg.position.y = -0.4;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoes);
      foot.position.set(0, -0.82, 0.05);
      hip.add(leg, foot);
      this.body.add(hip);
      return hip;
    });

    // Kameez: torso + flared skirt down to the knee
    const torso = new THREE.Mesh(cyl(female ? 0.17 : 0.2, 0.19, 0.52), kameez);
    torso.position.y = 1.2;
    const skirt = new THREE.Mesh(cyl(0.2, female ? 0.31 : 0.28, 0.5, 10, true), mat(o.kameez, { side: THREE.DoubleSide }));
    skirt.position.y = 0.72;
    this.body.add(torso, skirt);

    if (o.trim) {
      const hem = new THREE.Mesh(cyl(female ? 0.315 : 0.285, female ? 0.315 : 0.285, 0.06, 10, true), mat(o.trim, { side: THREE.DoubleSide }));
      hem.position.y = 0.49;
      this.body.add(hem);
    }

    if (o.waistcoat) {
      const wc = new THREE.Mesh(cyl(0.215, 0.205, 0.5, 8), mat(o.waistcoat));
      wc.position.y = 1.2;
      wc.scale.z = 0.95;
      // little V of kameez showing at the front
      const v = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 3), kameez);
      v.rotation.x = Math.PI;
      v.position.set(0, 1.36, 0.2);
      this.body.add(wc, v);
    }

    // Arms
    this.arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * (female ? 0.22 : 0.26), 1.42, 0);
      const sleeve = new THREE.Mesh(cyl(0.07, 0.065, 0.5), kameez);
      sleeve.position.y = -0.25;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skin);
      hand.position.y = -0.55;
      shoulder.add(sleeve, hand);
      this.body.add(shoulder);
      return shoulder;
    });

    // Head
    const neck = new THREE.Mesh(cyl(0.06, 0.07, 0.12, 6), skin);
    neck.position.y = 1.51;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
    head.position.y = 1.68;
    head.scale.set(0.95, 1.05, 1);
    this.body.add(neck, head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.168, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(o.hair));
    hair.position.set(0, 1.7, -0.01);
    hair.rotation.x = -0.25;
    this.body.add(hair);

    if (female) {
      // braid down the back
      const braid = new THREE.Mesh(cyl(0.045, 0.03, 0.45, 5), mat(o.hair));
      braid.position.set(0, 1.42, -0.15);
      braid.rotation.x = 0.12;
      this.body.add(braid);
    } else {
      const beardish = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3), mat(o.hair));
      beardish.position.set(0, 1.66, 0.025);
      beardish.scale.set(1, 1, 0.9);
      beardish.visible = !!o.beard;
      this.body.add(beardish);
    }

    if (o.cap) {
      const cap = new THREE.Mesh(cyl(0.15, 0.16, 0.1, 10), mat(o.cap));
      cap.position.y = 1.8;
      this.body.add(cap);
    }

    if (o.dupatta) {
      const dmat = mat(o.dupatta, { side: THREE.DoubleSide });
      // draped loosely over the head…
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 6, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.62), dmat);
      hood.position.set(0, 1.69, -0.02);
      hood.rotation.y = Math.PI;
      // …and falling over the shoulders and down the back
      const back = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.95, 1, 3), dmat);
      back.position.set(0, 1.18, -0.23);
      back.rotation.x = 0.12;
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.02), dmat);
      sash.position.set(0.12, 1.2, 0.2);
      sash.rotation.z = 0.45;
      this.body.add(hood, back, sash);
    }
  }

  setSitting(on) {
    this.sitting = on;
    this.body.position.y = on ? -0.42 : 0;
    for (const leg of this.legs) leg.rotation.x = on ? -1.45 : 0;
    for (const arm of this.arms) {
      arm.rotation.x = on ? -1.1 : 0;
      arm.rotation.z = 0;
    }
  }

  /** speed in units/sec drives the walk cycle. */
  update(dt, speed = 0) {
    if (this.sitting) return;
    const moving = speed > 0.2;
    if (moving) {
      this.phase += dt * (3.5 + speed * 0.9);
      const swing = Math.min(0.75, 0.25 + speed * 0.06);
      const s = Math.sin(this.phase);
      this.legs[0].rotation.x = s * swing;
      this.legs[1].rotation.x = -s * swing;
      this.arms[0].rotation.x = -s * swing * 0.8;
      this.arms[1].rotation.x = s * swing * 0.8;
      this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.05;
    } else {
      this.phase += dt * 1.5;
      for (const l of this.legs) l.rotation.x *= 0.8;
      for (const a of this.arms) a.rotation.x *= 0.8;
      this.body.position.y = Math.sin(this.phase) * 0.008;
    }
    this.arms[0].rotation.z = -0.08;
    this.arms[1].rotation.z = 0.08;
  }
}
