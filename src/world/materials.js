import * as THREE from 'three';

// Shared, cached flat-shaded materials so hundreds of meshes reuse a handful of programs.
const cache = new Map();

export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.9,
        metalness: opts.metalness ?? 0,
        flatShading: opts.flat ?? true,
        transparent: opts.opacity !== undefined && opts.opacity < 1,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 1,
        side: opts.side ?? THREE.FrontSide,
        map: opts.map ?? null,
      }),
    );
  }
  return cache.get(key);
}

export const PALETTE = {
  sand: 0xe8d5a9,
  land: 0xd9c49a,
  earth: 0x9c8462,
  grass: 0x8fb86a,
  darkGrass: 0x6f9a52,
  asphalt: 0x404248,
  pavement: 0xb9b2a4,
  marble: 0xf4f1ea,
  white: 0xfaf8f2,
  sandstone: 0xd8b77c,
  pinkStone: 0xd9978a,
  glass: 0x7fb2cf,
  wood: 0x8a5a3b,
  water: 0x2f8fb3,
  green: 0x1f8a55,
  copper: 0x5fa38d,
  trunk: 0x7a5636,
  leaf: 0x5e9a46,
  palm: 0x4f9442,
  dark: 0x2c2d33,
};

/**
 * Building material with procedural windows/floors drawn in the shader using
 * world-space coordinates, so every box in an InstancedMesh gets façades for free.
 */
export function makeFacadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWorldPos = wp.xyz;
        mat3 nm = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          nm = nm * mat3(instanceMatrix);
        #endif
        vWorldNormal = normalize(nm * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 wn = normalize(vWorldNormal);
        if (abs(wn.y) < 0.5 && vWorldPos.y > 1.4) {
          float u = abs(wn.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
          float col = step(0.38, fract(u / 2.4 + 0.1));
          float row = step(0.42, fract(vWorldPos.y / 3.2));
          float win = col * row;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.27, 0.34), win * 0.75);
          // a thin ledge line at each floor
          float ledge = 1.0 - step(0.06, fract(vWorldPos.y / 3.2));
          diffuseColor.rgb *= 1.0 - ledge * 0.18;
        }`,
      );
  };
  return m;
}
