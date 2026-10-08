// Builds every landmark model from the places list and registers its colliders,
// walkable decks and "keep clear" zones before the filler city is generated.
import * as THREE from 'three';
import { n, ROADS } from '../layout.js';
import { mulberry32 } from '../../utils/math.js';
import { shadowAll } from './helpers.js';
import * as heritage from './heritage.js';
import * as faith from './faith.js';
import * as modern from './modern.js';
import * as coast from './coast.js';
import * as streets from './streets.js';

const BUILDERS = { ...heritage, ...faith, ...modern, ...coast, ...streets };

// Builders that decorate a specific road.
const ROAD_FOR = { billboards: 'shahrah-e-faisal', burnsRoad: 'burns', tariqRoad: 'tariq', zamzama: 'zamzama' };

export function buildLandmarks(scene, collision, terrain, places) {
  const results = [];
  const reserve = [];
  const walkable = [];
  const animated = { bob: [], flags: [] };

  places.forEach((place, idx) => {
    const [px, pz] = n(place.pos);
    const [mx, mz] = place.modelPos ? n(place.modelPos) : [px, pz];
    const entry = { place, pos: new THREE.Vector3(px, 0, pz), anchor: new THREE.Vector3(mx, 6, mz), group: null };
    const builder = place.model && BUILDERS[place.model];
    if (builder) {
      const road = ROAD_FOR[place.model] ? ROADS.find((r) => r.id === ROAD_FOR[place.model]) : null;
      const rand = mulberry32(1000 + idx * 17);
      const roadLocal = road ? { ...road } : null;
      const built = builder({ x: mx, z: mz, place, rand, road: roadLocal });
      const rot = built.rot || 0;
      const g = shadowAll(built.group);
      g.position.set(mx, 0, mz);
      g.rotation.y = rot;
      scene.add(g);
      entry.group = g;
      entry.anchor.y = built.iconY ?? 6;

      const c = Math.cos(rot), s = Math.sin(rot);
      // three.js rotation.y maps local (x, z) → (x·cos + z·sin, −x·sin + z·cos)
      const toWorld = (lx, lz) => [mx + lx * c + lz * s, mz - lx * s + lz * c];
      for (const col of built.colliders || []) {
        const [wx, wz] = toWorld(col.x, col.z);
        if (col.type === 'circle') collision.addCircle(wx, wz, col.r, place.id);
        else collision.addBox(wx, wz, col.hw, col.hd, (col.angle || 0) - rot, place.id);
      }
      for (const poly of built.walkable || []) walkable.push(poly.map(([lx, lz]) => toWorld(lx, lz)));
      if (built.reserve) reserve.push({ x: mx, z: mz, r: built.reserve });

      g.traverse((o) => {
        if (o.userData.bob !== undefined) animated.bob.push(o);
        if (o.userData.flag) animated.flags.push(o.userData.flag);
      });
    }
    results.push(entry);
  });

  if (walkable.length) terrain.addLand(walkable);
  terrain.reserveMany(reserve);

  return {
    list: results,
    update(t) {
      for (const b of animated.bob) {
        b.position.y = -0.6 + Math.sin(t * 1.4 + b.userData.bob) * 0.12;
        b.rotation.z = Math.sin(t * 1.1 + b.userData.bob) * 0.04;
      }
      for (const f of animated.flags) f.rotation.y = Math.sin(t * 2 + f.id) * 0.25;
    },
  };
}
