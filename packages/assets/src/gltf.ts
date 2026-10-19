import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type ModelSourceResolver = (assetId: string) => string;

/**
 * Host helper: resolve SceneSpec `model.asset` ids to URLs and load via GLTFLoader.
 * Does not register licenses; callers must only point at admitted local/sandbox sources.
 */
export function createGltfLoadModel(
  resolveSource: ModelSourceResolver,
): (assetId: string) => Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  return async (assetId) => {
    const source = resolveSource(assetId);
    if (!source.trim()) throw new Error(`Empty model source for asset: ${assetId}`);
    return new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        source,
        (gltf) => {
          const root = gltf.scene;
          root.name = assetId;
          resolve(root);
        },
        undefined,
        (error) => {
          const message = error instanceof Error ? error.message : String(error);
          reject(new Error(`Failed to load model "${assetId}" from ${source}: ${message}`));
        },
      );
    });
  };
}
