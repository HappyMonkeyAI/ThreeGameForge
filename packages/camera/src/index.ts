import * as THREE from 'three';

export type OrbitCameraOptions = {
  radius?: number;
  azimuth?: number;
  elevation?: number;
  minElevation?: number;
  maxElevation?: number;
};

/** A small deterministic orbit rig suitable for tactical and inspection views. */
export class OrbitCameraRig {
  readonly target = new THREE.Vector3();
  radius: number;
  azimuth: number;
  elevation: number;
  readonly minElevation: number;
  readonly maxElevation: number;

  constructor(options: OrbitCameraOptions = {}) {
    this.radius = options.radius ?? 6;
    this.azimuth = options.azimuth ?? 0;
    this.elevation = options.elevation ?? 0.35;
    this.minElevation = options.minElevation ?? -Math.PI / 2 + 0.05;
    this.maxElevation = options.maxElevation ?? Math.PI / 2 - 0.05;
    this.elevation = THREE.MathUtils.clamp(this.elevation, this.minElevation, this.maxElevation);
  }

  rotate(deltaAzimuth: number, deltaElevation: number): void {
    this.azimuth += deltaAzimuth;
    this.elevation = THREE.MathUtils.clamp(
      this.elevation + deltaElevation,
      this.minElevation,
      this.maxElevation,
    );
  }

  zoom(deltaRadius: number, minRadius = 1, maxRadius = 50): void {
    this.radius = THREE.MathUtils.clamp(this.radius + deltaRadius, minRadius, maxRadius);
  }

  applyTo(camera: THREE.Camera): void {
    const horizontalRadius = this.radius * Math.cos(this.elevation);
    camera.position.set(
      this.target.x + horizontalRadius * Math.sin(this.azimuth),
      this.target.y + this.radius * Math.sin(this.elevation),
      this.target.z + horizontalRadius * Math.cos(this.azimuth),
    );
    camera.lookAt(this.target);
  }
}
