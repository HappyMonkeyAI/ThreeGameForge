import { generateChunk, type ChunkCoord, type ChunkGenerator, type ChunkPayload } from './index.ts';

export type ChunkWorkerRequest = { id: number; coord: ChunkCoord; revision: number };
export type ChunkWorkerResponse = { id: number; payload: ChunkPayload };

export function handleChunkWorkerRequest(
  request: ChunkWorkerRequest,
  generator: ChunkGenerator,
): ChunkWorkerResponse {
  return { id: request.id, payload: generateChunk(request.coord, request.revision, generator) };
}
