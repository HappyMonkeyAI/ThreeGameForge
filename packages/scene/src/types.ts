/** Closed vocabulary for AI / human scene intent. Versioned independently of game domain rules. */

export type Vec3 = [number, number, number];

export type EnvironmentPreset = 'studio' | 'sunset' | 'night';

export type CameraType = 'orbit' | 'fixed';

export type GeometryKind = 'box' | 'sphere' | 'cylinder' | 'icosahedron' | 'plane';

export type ComponentKind = 'rotatable' | 'orbit-target';

export type MaterialSpec = {
  type: 'standard';
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export type CameraSpec = {
  type: CameraType;
  target?: string;
  radius?: number;
  elevation?: number;
};

export type ModelRef = {
  /** Host-resolved asset id (manifest key). Binary loading stays outside SceneSpec. */
  asset: string;
};

export type MeshEntitySpec = {
  id: string;
  type: 'mesh';
  geometry: GeometryKind;
  material: MaterialSpec;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  components?: ComponentKind[];
};

export type ModelEntitySpec = {
  id: string;
  type: 'model';
  model: ModelRef;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  components?: ComponentKind[];
};

export type EntitySpec = MeshEntitySpec | ModelEntitySpec;

export type SceneMeta = {
  source?: string;
  ref?: string;
  note?: string;
};

export type SceneSpec = {
  version: 1;
  environment: EnvironmentPreset;
  camera: CameraSpec;
  entities: EntitySpec[];
  /** Provenance / consumer labels only; ignored by apply. */
  meta?: SceneMeta;
};

export type SceneIssue = {
  path: string;
  message: string;
};

export const ENVIRONMENT_PRESETS: readonly EnvironmentPreset[] = ['studio', 'sunset', 'night'];
export const CAMERA_TYPES: readonly CameraType[] = ['orbit', 'fixed'];
export const GEOMETRY_KINDS: readonly GeometryKind[] = [
  'box',
  'sphere',
  'cylinder',
  'icosahedron',
  'plane',
];
export const COMPONENT_KINDS: readonly ComponentKind[] = ['rotatable', 'orbit-target'];
export const ENTITY_TYPES = ['mesh', 'model'] as const;
