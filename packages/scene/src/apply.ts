import * as THREE from 'three';
import type { EnvironmentPreset, GeometryKind, MaterialSpec, SceneSpec, Vec3 } from './types.ts';
import { validateSceneSpec } from './validate.ts';

export type ApplySceneResult = {
  entities: ReadonlyMap<string, THREE.Object3D>;
  rotatableIds: readonly string[];
  cameraTarget: THREE.Vector3;
  cameraRadius: number;
  cameraElevation: number;
  dispose: () => void;
};

export type ApplySceneOptions = {
  /** Resolves `model.asset` ids to Object3D roots. Required when the spec contains model entities. */
  loadModel?: (assetId: string) => Promise<THREE.Object3D>;
};

type EnvironmentSetup = {
  background: number;
  hemisphere: { sky: number; ground: number; intensity: number };
  key: { color: number; intensity: number; position: Vec3 };
};

const ENVIRONMENTS: Record<EnvironmentPreset, EnvironmentSetup> = {
  studio: {
    background: 0xd8dde6,
    hemisphere: { sky: 0xffffff, ground: 0x8a93a3, intensity: 1.4 },
    key: { color: 0xffffff, intensity: 2.2, position: [4, 6, 3] },
  },
  sunset: {
    background: 0x1a1020,
    hemisphere: { sky: 0xffb38a, ground: 0x2a1830, intensity: 1.1 },
    key: { color: 0xff8a4c, intensity: 2.4, position: [5, 3, -2] },
  },
  night: {
    background: 0x07111f,
    hemisphere: { sky: 0xa8c7ff, ground: 0x182033, intensity: 0.9 },
    key: { color: 0xcfe3ff, intensity: 1.6, position: [3, 5, 4] },
  },
};

function createGeometry(kind: GeometryKind): THREE.BufferGeometry {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 16);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.75, 1);
    case 'plane':
      return new THREE.PlaneGeometry(2, 2);
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unsupported geometry: ${exhaustive}`);
    }
  }
}

function createMaterial(spec: MaterialSpec): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color),
    roughness: spec.roughness ?? 0.5,
    metalness: spec.metalness ?? 0.1,
    emissive: new THREE.Color(spec.emissive ?? '#000000'),
    emissiveIntensity: spec.emissiveIntensity ?? 0,
  });
}

function clearOwned(scene: THREE.Scene, owned: THREE.Object3D[]): void {
  for (const object of owned) {
    scene.remove(object);
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material?.dispose();
      }
    });
  }
}

function placeObject(
  object: THREE.Object3D,
  position: Vec3,
  rotation: Vec3,
  scale: Vec3,
): void {
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
}

/** Applies a validated SceneSpec into a Three.js scene. Re-validates so bad intent never hits the GPU. */
export async function applySceneSpec(
  scene: THREE.Scene,
  input: unknown,
  options: ApplySceneOptions = {},
): Promise<ApplySceneResult> {
  const validated = validateSceneSpec(input);
  if (!validated.ok) {
    const detail = validated.errors.map((issue) => `${issue.path || '/'}: ${issue.message}`).join('; ');
    throw new Error(`Invalid SceneSpec: ${detail}`);
  }
  const spec: SceneSpec = validated.spec;
  const needsModels = spec.entities.some((entity) => entity.type === 'model');
  if (needsModels && !options.loadModel) {
    throw new Error('SceneSpec contains model entities but no loadModel was provided');
  }

  const owned: THREE.Object3D[] = [];
  const entities = new Map<string, THREE.Object3D>();
  const rotatableIds: string[] = [];

  const environment = ENVIRONMENTS[spec.environment];
  scene.background = new THREE.Color(environment.background);

  const hemisphere = new THREE.HemisphereLight(
    environment.hemisphere.sky,
    environment.hemisphere.ground,
    environment.hemisphere.intensity,
  );
  scene.add(hemisphere);
  owned.push(hemisphere);

  const key = new THREE.DirectionalLight(environment.key.color, environment.key.intensity);
  key.position.set(...environment.key.position);
  scene.add(key);
  owned.push(key);

  let orbitTargetId: string | undefined;
  for (const entity of spec.entities) {
    const position = entity.position ?? [0, 0, 0];
    const rotation = entity.rotation ?? [0, 0, 0];
    const scale = entity.scale ?? [1, 1, 1];
    let object: THREE.Object3D;

    if (entity.type === 'model') {
      const loaded = await options.loadModel!(entity.model.asset);
      object = loaded;
      object.name = entity.id;
      placeObject(object, position, rotation, scale);
    } else {
      const geometry = createGeometry(entity.geometry);
      const material = createMaterial(entity.material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = entity.id;
      placeObject(mesh, position, rotation, scale);
      object = mesh;
    }

    scene.add(object);
    owned.push(object);
    entities.set(entity.id, object);
    if (entity.components?.includes('rotatable')) rotatableIds.push(entity.id);
    if (entity.components?.includes('orbit-target')) orbitTargetId = entity.id;
  }

  const cameraTarget = new THREE.Vector3();
  const targetId = spec.camera.target ?? orbitTargetId;
  if (targetId) {
    const targetObject = entities.get(targetId);
    if (targetObject) cameraTarget.copy(targetObject.position);
  }

  return {
    entities,
    rotatableIds,
    cameraTarget,
    cameraRadius: spec.camera.radius ?? 6,
    cameraElevation: spec.camera.elevation ?? 0.35,
    dispose: () => {
      clearOwned(scene, owned);
      owned.length = 0;
      entities.clear();
      rotatableIds.length = 0;
    },
  };
}
