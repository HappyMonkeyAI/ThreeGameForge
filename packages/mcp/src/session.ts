import * as THREE from 'three';
import {
  applySceneSpec,
  createLlmSceneRepairer,
  createOpenAiCompatibleComplete,
  createScriptedSceneRepairer,
  repairSceneSpec,
  validateSceneSpec,
  type ApplySceneResult,
  type SceneIssue,
  type SceneSpec,
  CAMERA_TYPES,
  COMPONENT_KINDS,
  ENTITY_TYPES,
  ENVIRONMENT_PRESETS,
  GEOMETRY_KINDS,
} from '../../scene/src/index.ts';

export type RepairMode = 'scripted' | 'llm';

export type GameForgeSessionOptions = {
  /** Required for repair mode=llm. Host-owned; do not hardcode into published scene package. */
  llm?: { baseUrl: string; model: string };
};

export type SessionDiagnostics = {
  hasAppliedScene: boolean;
  entityCount: number;
  environment?: string;
  cameraType?: string;
  lastRepairAttempts?: number;
  lastRepairMode?: RepairMode;
  lastErrors?: SceneIssue[];
};

export type SceneReadback = {
  spec: SceneSpec | null;
  entityIds: string[];
  rotatableIds: string[];
  camera: {
    target: [number, number, number];
    radius: number;
    elevation: number;
  } | null;
  objectCount: number;
};

function boxFallback(assetId: string): THREE.Object3D {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.75 }),
  );
  mesh.name = assetId;
  return mesh;
}

/** In-memory SceneSpec session for MCP v0 (headless Three.js graph, no WebGL screenshot). */
export class GameForgeSession {
  private readonly scene = new THREE.Scene();
  private readonly options: GameForgeSessionOptions;
  private applied: ApplySceneResult | undefined;
  private spec: SceneSpec | undefined;
  private lastErrors: SceneIssue[] | undefined;
  private lastRepairAttempts: number | undefined;
  private lastRepairMode: RepairMode | undefined;

  constructor(options: GameForgeSessionOptions = {}) {
    this.options = options;
  }

  vocabulary(): Record<string, readonly string[]> {
    return {
      environments: ENVIRONMENT_PRESETS,
      cameraTypes: CAMERA_TYPES,
      entityTypes: [...ENTITY_TYPES],
      geometries: GEOMETRY_KINDS,
      components: COMPONENT_KINDS,
    };
  }

  validate(input: unknown): { ok: true; spec: SceneSpec } | { ok: false; errors: SceneIssue[] } {
    const result = validateSceneSpec(input);
    if (!result.ok) this.lastErrors = result.errors;
    else this.lastErrors = undefined;
    return result;
  }

  async repair(
    input: unknown,
    options: { mode?: RepairMode; maxAttempts?: number } = {},
  ): Promise<
    | { ok: true; spec: SceneSpec; attempts: number; mode: RepairMode }
    | { ok: false; errors: SceneIssue[]; attempts: number; mode: RepairMode }
  > {
    const mode: RepairMode = options.mode ?? 'scripted';
    this.lastRepairMode = mode;
    if (mode === 'llm' && !this.options.llm) {
      throw new Error('LLM repair requested but session was constructed without llm baseUrl/model');
    }
    const repairer = mode === 'llm'
      ? createLlmSceneRepairer({
        complete: createOpenAiCompatibleComplete({
          baseUrl: this.options.llm!.baseUrl,
          model: this.options.llm!.model,
          temperature: 0.1,
          maxTokens: 4096,
        }),
      })
      : createScriptedSceneRepairer();

    const result = await repairSceneSpec(input, {
      repairer,
      maxAttempts: options.maxAttempts ?? 4,
    });
    this.lastRepairAttempts = result.attempts;
    if (!result.ok) {
      this.lastErrors = [...result.errors];
      return { ok: false, errors: [...result.errors], attempts: result.attempts, mode };
    }
    this.lastErrors = undefined;
    return { ok: true, spec: result.spec, attempts: result.attempts, mode };
  }

  async apply(input: unknown): Promise<SceneReadback> {
    const validated = validateSceneSpec(input);
    if (!validated.ok) {
      this.lastErrors = validated.errors;
      throw new Error(
        `Invalid SceneSpec: ${validated.errors.map((issue) => `${issue.path || '/'}: ${issue.message}`).join('; ')}`,
      );
    }
    this.applied?.dispose();
    this.applied = await applySceneSpec(this.scene, validated.spec, {
      loadModel: async (assetId) => boxFallback(assetId),
    });
    this.spec = validated.spec;
    this.lastErrors = undefined;
    return this.readback();
  }

  readback(): SceneReadback {
    if (!this.applied || !this.spec) {
      return {
        spec: null,
        entityIds: [],
        rotatableIds: [],
        camera: null,
        objectCount: this.scene.children.length,
      };
    }
    return {
      spec: this.spec,
      entityIds: [...this.applied.entities.keys()],
      rotatableIds: [...this.applied.rotatableIds],
      camera: {
        target: [
          this.applied.cameraTarget.x,
          this.applied.cameraTarget.y,
          this.applied.cameraTarget.z,
        ],
        radius: this.applied.cameraRadius,
        elevation: this.applied.cameraElevation,
      },
      objectCount: this.scene.children.length,
    };
  }

  diagnostics(): SessionDiagnostics {
    return {
      hasAppliedScene: Boolean(this.applied && this.spec),
      entityCount: this.applied?.entities.size ?? 0,
      environment: this.spec?.environment,
      cameraType: this.spec?.camera.type,
      lastRepairAttempts: this.lastRepairAttempts,
      lastRepairMode: this.lastRepairMode,
      lastErrors: this.lastErrors,
    };
  }

  clear(): void {
    this.applied?.dispose();
    this.applied = undefined;
    this.spec = undefined;
    this.lastErrors = undefined;
  }
}
