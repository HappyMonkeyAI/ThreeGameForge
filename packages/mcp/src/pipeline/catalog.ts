/** Closed MCP v1 recipe catalog. Workflow JSON lives in sibling threejs-pipeline — not imported at runtime. */

export type PipelineRecipeStage = 'concept-image' | 'image-to-3d';

export type PipelineRecipe = {
  id: string;
  stage: PipelineRecipeStage;
  title: string;
  /** Relative path under TGF_PIPELINE_REF_ROOT when set. */
  refPath: string;
  notes: string;
};

export const PIPELINE_RECIPES: readonly PipelineRecipe[] = [
  {
    id: 'concept-flux2-klein',
    stage: 'concept-image',
    title: 'Flux 2 Klein text-to-image',
    refPath: 'image_flux2_klein_text_to_image.json',
    notes: 'Prior drone concept success at 1024²; preferred first concept recipe.',
  },
  {
    id: 'concept-z-image-turbo',
    stage: 'concept-image',
    title: 'Z-Image Turbo text-to-image',
    refPath: 'image_z_image_turbo.json',
    notes: 'Catalogued; prompt patch map not wired yet — use concept-flux2-klein for queue_concept_image.',
  },
  {
    id: 'i2_3d-pixal3d',
    stage: 'image-to-3d',
    title: 'Pixal3D image-to-GLB',
    refPath: 'reference/workflows/comfyui/drone_pixal3d.json',
    notes: 'Node 316 false selects Pixal3D in combined graphs; bounded ~15k faces target.',
  },
  {
    id: 'i2_3d-trellis2',
    stage: 'image-to-3d',
    title: 'TRELLIS.2 image-to-GLB',
    refPath: 'reference/workflows/comfyui/drone_trellis2.json',
    notes: 'Alternate i2_3d path; keep raw GLB immutable before cleanup.',
  },
] as const;

export function listPipelineRecipes(refRoot?: string): {
  recipes: PipelineRecipe[];
  refRoot: string | null;
  queueTools: 'planned';
} {
  return {
    recipes: [...PIPELINE_RECIPES],
    refRoot: refRoot && refRoot.trim().length > 0 ? refRoot : null,
    queueTools: 'planned',
  };
}
