export type {
  CameraSpec,
  CameraType,
  ComponentKind,
  EntitySpec,
  EnvironmentPreset,
  GeometryKind,
  MaterialSpec,
  MeshEntitySpec,
  ModelEntitySpec,
  ModelRef,
  SceneIssue,
  SceneMeta,
  SceneSpec,
  Vec3,
} from './types.ts';
export {
  CAMERA_TYPES,
  COMPONENT_KINDS,
  ENTITY_TYPES,
  ENVIRONMENT_PRESETS,
  GEOMETRY_KINDS,
} from './types.ts';
export { validateSceneSpec, type SceneValidationResult } from './validate.ts';
export { applySceneSpec, type ApplySceneOptions, type ApplySceneResult } from './apply.ts';
export {
  repairSceneSpec,
  type RepairSceneOptions,
  type RepairSceneResult,
  type SceneRepairProposal,
  type SceneRepairer,
} from './repair.ts';
export { createScriptedSceneRepairer } from './scriptedRepairer.ts';
export {
  createLlmSceneRepairer,
  extractJsonObject,
  formatSceneRepairPrompt,
  type LlmSceneRepairerOptions,
} from './llmRepairer.ts';
export {
  createOpenAiCompatibleComplete,
  selectCompletionText,
  type OpenAiCompatibleCompleteOptions,
} from './openaiComplete.ts';



