import {
  CAMERA_TYPES,
  COMPONENT_KINDS,
  ENVIRONMENT_PRESETS,
  GEOMETRY_KINDS,
  type CameraSpec,
  type ComponentKind,
  type EntitySpec,
  type MaterialSpec,
  type MeshEntitySpec,
  type ModelEntitySpec,
  type SceneIssue,
  type SceneMeta,
  type SceneSpec,
  type Vec3,
} from './types.ts';

export type SceneValidationResult =
  | { ok: true; spec: SceneSpec }
  | { ok: false; errors: SceneIssue[] };

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseVec3(value: unknown, path: string, errors: SceneIssue[]): Vec3 | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(isFiniteNumber)) {
    errors.push({ path, message: 'expected [x, y, z] with three finite numbers' });
    return undefined;
  }
  return [value[0], value[1], value[2]];
}

function parseMaterial(value: unknown, path: string, errors: SceneIssue[]): MaterialSpec | undefined {
  if (!isRecord(value)) {
    errors.push({ path, message: 'expected material object' });
    return undefined;
  }
  let failed = false;
  if (value.type !== 'standard') {
    errors.push({ path: `${path}.type`, message: 'material.type must be "standard"' });
    failed = true;
  }
  if (typeof value.color !== 'string' || !HEX_COLOR.test(value.color)) {
    errors.push({ path: `${path}.color`, message: 'color must be #RRGGBB' });
    failed = true;
  }
  if (value.emissive !== undefined) {
    if (typeof value.emissive !== 'string' || !HEX_COLOR.test(value.emissive)) {
      errors.push({ path: `${path}.emissive`, message: 'emissive must be #RRGGBB' });
      failed = true;
    }
  }
  for (const key of ['roughness', 'metalness', 'emissiveIntensity'] as const) {
    if (value[key] === undefined) continue;
    if (!isFiniteNumber(value[key])) {
      errors.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
      failed = true;
      continue;
    }
    if ((key === 'roughness' || key === 'metalness') && (value[key] < 0 || value[key] > 1)) {
      errors.push({ path: `${path}.${key}`, message: `${key} must be between 0 and 1` });
      failed = true;
    }
  }
  if (failed) return undefined;
  return {
    type: 'standard',
    color: value.color as string,
    roughness: value.roughness as number | undefined,
    metalness: value.metalness as number | undefined,
    emissive: value.emissive as string | undefined,
    emissiveIntensity: value.emissiveIntensity as number | undefined,
  };
}

function parseComponents(
  value: unknown,
  path: string,
  errors: SceneIssue[],
): ComponentKind[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'components must be an array' });
    return undefined;
  }
  const components: ComponentKind[] = [];
  let failed = false;
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (typeof entry !== 'string' || !(COMPONENT_KINDS as readonly string[]).includes(entry)) {
      errors.push({
        path: `${path}[${index}]`,
        message: `unknown component; allowed: ${COMPONENT_KINDS.join(', ')}`,
      });
      failed = true;
      continue;
    }
    components.push(entry as ComponentKind);
  }
  return failed ? undefined : components;
}

function parseEntity(value: unknown, path: string, errors: SceneIssue[]): EntitySpec | undefined {
  if (!isRecord(value)) {
    errors.push({ path, message: 'expected entity object' });
    return undefined;
  }
  let failed = false;
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    errors.push({ path: `${path}.id`, message: 'id must be a non-empty string' });
    failed = true;
  }
  if (value.type !== 'mesh' && value.type !== 'model') {
    errors.push({ path: `${path}.type`, message: 'entity.type must be "mesh" or "model"' });
    failed = true;
  }

  const position = value.position === undefined
    ? ([0, 0, 0] as Vec3)
    : parseVec3(value.position, `${path}.position`, errors);
  const rotation = value.rotation === undefined
    ? ([0, 0, 0] as Vec3)
    : parseVec3(value.rotation, `${path}.rotation`, errors);
  const scale = value.scale === undefined
    ? ([1, 1, 1] as Vec3)
    : parseVec3(value.scale, `${path}.scale`, errors);
  const components = parseComponents(value.components, `${path}.components`, errors);

  if (value.type === 'model') {
    if (!isRecord(value.model) || typeof value.model.asset !== 'string' || value.model.asset.trim().length === 0) {
      errors.push({ path: `${path}.model.asset`, message: 'model.asset must be a non-empty asset id' });
      failed = true;
    }
    if (failed || !position || !rotation || !scale || !components) return undefined;
    const entity: ModelEntitySpec = {
      id: value.id as string,
      type: 'model',
      model: { asset: (value.model as { asset: string }).asset },
      position,
      rotation,
      scale,
      components,
    };
    return entity;
  }

  if (typeof value.geometry !== 'string' || !(GEOMETRY_KINDS as readonly string[]).includes(value.geometry)) {
    errors.push({
      path: `${path}.geometry`,
      message: `geometry must be one of: ${GEOMETRY_KINDS.join(', ')}`,
    });
    failed = true;
  }
  const material = parseMaterial(value.material, `${path}.material`, errors);

  if (failed || !material || !position || !rotation || !scale || !components) return undefined;

  const entity: MeshEntitySpec = {
    id: value.id as string,
    type: 'mesh',
    geometry: value.geometry as MeshEntitySpec['geometry'],
    material,
    position,
    rotation,
    scale,
    components,
  };
  return entity;
}

function parseCamera(value: unknown, path: string, errors: SceneIssue[]): CameraSpec | undefined {
  if (!isRecord(value)) {
    errors.push({ path, message: 'expected camera object' });
    return undefined;
  }
  let failed = false;
  if (typeof value.type !== 'string' || !(CAMERA_TYPES as readonly string[]).includes(value.type)) {
    errors.push({ path: `${path}.type`, message: `camera.type must be one of: ${CAMERA_TYPES.join(', ')}` });
    failed = true;
  }
  if (value.target !== undefined && (typeof value.target !== 'string' || value.target.trim().length === 0)) {
    errors.push({ path: `${path}.target`, message: 'camera.target must be a non-empty entity id' });
    failed = true;
  }
  if (value.radius !== undefined && (!isFiniteNumber(value.radius) || value.radius <= 0)) {
    errors.push({ path: `${path}.radius`, message: 'camera.radius must be a positive finite number' });
    failed = true;
  }
  if (value.elevation !== undefined && !isFiniteNumber(value.elevation)) {
    errors.push({ path: `${path}.elevation`, message: 'camera.elevation must be a finite number' });
    failed = true;
  }
  if (failed) return undefined;
  return {
    type: value.type as CameraSpec['type'],
    target: value.target as string | undefined,
    radius: value.radius as number | undefined,
    elevation: value.elevation as number | undefined,
  };
}

/** Validates unknown AI/human intent into a closed SceneSpec, or returns structured errors for repair. */
export function validateSceneSpec(input: unknown): SceneValidationResult {
  const errors: SceneIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: '', message: 'scene spec must be an object' }] };
  }
  if (input.version !== 1) {
    errors.push({ path: 'version', message: 'version must be 1' });
  }
  if (
    typeof input.environment !== 'string'
    || !(ENVIRONMENT_PRESETS as readonly string[]).includes(input.environment)
  ) {
    errors.push({
      path: 'environment',
      message: `environment must be one of: ${ENVIRONMENT_PRESETS.join(', ')}`,
    });
  }
  const camera = parseCamera(input.camera, 'camera', errors);
  if (!Array.isArray(input.entities)) {
    errors.push({ path: 'entities', message: 'entities must be an array' });
  }

  const entities: EntitySpec[] = [];
  const seenIds = new Set<string>();
  if (Array.isArray(input.entities)) {
    for (let index = 0; index < input.entities.length; index += 1) {
      const entity = parseEntity(input.entities[index], `entities[${index}]`, errors);
      if (!entity) continue;
      if (seenIds.has(entity.id)) {
        errors.push({ path: `entities[${index}].id`, message: `duplicate entity id: ${entity.id}` });
        continue;
      }
      seenIds.add(entity.id);
      entities.push(entity);
    }
  }

  if (camera?.target && !seenIds.has(camera.target)) {
    errors.push({ path: 'camera.target', message: `camera.target references unknown entity: ${camera.target}` });
  }

  const orbitTargets = entities.filter((entity) => entity.components?.includes('orbit-target'));
  if (orbitTargets.length > 1) {
    errors.push({
      path: 'entities',
      message: 'at most one entity may include the orbit-target component',
    });
  }

  let meta: SceneMeta | undefined;
  if (input.meta !== undefined) {
    if (!isRecord(input.meta)) {
      errors.push({ path: 'meta', message: 'meta must be an object' });
    } else {
      meta = {};
      for (const key of ['source', 'ref', 'note'] as const) {
        if (input.meta[key] === undefined) continue;
        if (typeof input.meta[key] !== 'string') {
          errors.push({ path: `meta.${key}`, message: `${key} must be a string` });
          continue;
        }
        meta[key] = input.meta[key];
      }
    }
  }

  if (errors.length > 0 || !camera) return { ok: false, errors };

  return {
    ok: true,
    spec: {
      version: 1,
      environment: input.environment as SceneSpec['environment'],
      camera,
      entities,
      ...(meta ? { meta } : {}),
    },
  };
}
