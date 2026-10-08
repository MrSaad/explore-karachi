// Orthographic isometric camera that follows a target.
// Q / E rotate in 90° steps (smoothly), mouse wheel zooms.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../utils/math.js';

const PITCH = Math.atan(1 / Math.sqrt(2)); // classic isometric ~35.26°
const DIST = 400;

export class IsoCamera {
  constructor(aspect) {
    this.viewHeight = 46; // world units visible vertically at zoom 1
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
    this.yaw = Math.PI / 4; // looking from the south-east toward the north-west
    this.targetYaw = this.yaw;
    this.zoom = 1;
    this.targetZoom = 1;
    this.extraZoom = 1; // e.g. pull back while driving
    this.extraZoomCurrent = 1;
    this.target = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.setAspect(aspect);
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this._applyFrustum();
  }

  _applyFrustum() {
    const h = (this.viewHeight * this.extraZoomCurrent) / 2;
    const half = h / this.zoom;
    this.camera.left = -half * this.aspect;
    this.camera.right = half * this.aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  }

  rotate(dir) {
    this.targetYaw += (dir * Math.PI) / 2;
  }

  zoomBy(factor) {
    this.targetZoom = clamp(this.targetZoom * factor, 0.35, 2.6);
  }

  snapTo(pos) {
    this.focus.copy(pos);
    this.target.copy(pos);
  }

  /** Unit vectors for "screen up" and "screen right" on the ground plane. */
  groundBasis() {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    return { forward: [fx, fz], right: [-fz, fx] };
  }

  update(dt) {
    this.yaw = dampAngle(this.yaw, this.targetYaw, 10, dt);
    this.zoom = damp(this.zoom, this.targetZoom, 8, dt);
    this.extraZoomCurrent = damp(this.extraZoomCurrent, this.extraZoom, 2.5, dt);
    this.focus.x = damp(this.focus.x, this.target.x, 6, dt);
    this.focus.y = damp(this.focus.y, this.target.y, 6, dt);
    this.focus.z = damp(this.focus.z, this.target.z, 6, dt);

    const horiz = Math.cos(PITCH) * DIST;
    this.camera.position.set(
      this.focus.x + Math.sin(this.yaw) * horiz,
      this.focus.y + Math.sin(PITCH) * DIST,
      this.focus.z + Math.cos(this.yaw) * horiz,
    );
    this.camera.lookAt(this.focus);
    this._applyFrustum();
  }
}
