export type ChunkCoord = { x: number; y: number; z: number };
export type FloatingOriginOptions = { threshold?: number };
export type ChunkPayload = { coord: ChunkCoord; revision: number; values: Uint8Array };
export type ChunkGenerator = (coord: ChunkCoord, revision: number) => ChunkPayload;

export function chunkKey(coord: ChunkCoord): string { return `${coord.x},${coord.y},${coord.z}`; }

export function worldToChunk(value: number, chunkSize: number): number { return Math.floor(value / chunkSize); }

export function chunkFromWorld(position: ChunkCoord, chunkSize: number): ChunkCoord {
  return { x: worldToChunk(position.x, chunkSize), y: worldToChunk(position.y, chunkSize), z: worldToChunk(position.z, chunkSize) };
}

export function chunkDistance(a: ChunkCoord, b: ChunkCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

/** Keeps render coordinates near zero while preserving authoritative world coordinates. */
export class FloatingOrigin {
  readonly offset: ChunkCoord = { x: 0, y: 0, z: 0 };
  readonly threshold: number;

  constructor(options: FloatingOriginOptions = {}) { this.threshold = options.threshold ?? 1000; }

  recenter(position: ChunkCoord): ChunkCoord {
    const shouldRecenter = Math.max(Math.abs(position.x), Math.abs(position.y), Math.abs(position.z)) >= this.threshold;
    if (shouldRecenter) {
      this.offset.x += position.x;
      this.offset.y += position.y;
      this.offset.z += position.z;
    }
    return { x: position.x - this.offset.x, y: position.y - this.offset.y, z: position.z - this.offset.z };
  }

  toRender(worldPosition: ChunkCoord): ChunkCoord {
    return { x: worldPosition.x - this.offset.x, y: worldPosition.y - this.offset.y, z: worldPosition.z - this.offset.z };
  }
}

/** Tracks bounded chunk residency without coupling generation to rendering. */
export class ChunkResidency {
  private readonly loaded = new Map<string, ChunkCoord>();
  readonly radius: number;

  constructor(radius: number) { this.radius = radius; }

  update(center: ChunkCoord): { load: ChunkCoord[]; unload: ChunkCoord[] } {
    const desired = new Map<string, ChunkCoord>();
    for (let x = center.x - this.radius; x <= center.x + this.radius; x += 1) {
      for (let y = center.y - this.radius; y <= center.y + this.radius; y += 1) {
        for (let z = center.z - this.radius; z <= center.z + this.radius; z += 1) {
          const coord = { x, y, z };
          desired.set(chunkKey(coord), coord);
        }
      }
    }
    const load = [...desired].filter(([key]) => !this.loaded.has(key)).map(([, coord]) => coord);
    const unload = [...this.loaded].filter(([key]) => !desired.has(key)).map(([, coord]) => coord);
    this.loaded.clear();
    for (const [key, coord] of desired) this.loaded.set(key, coord);
    return { load, unload };
  }

  has(coord: ChunkCoord): boolean { return this.loaded.has(chunkKey(coord)); }
  size(): number { return this.loaded.size; }
}

/** Pure generation seam: safe to call in a Worker because it has no scene/runtime dependencies. */
export function generateChunk(coord: ChunkCoord, revision: number, generator: ChunkGenerator): ChunkPayload {
  return generator(coord, revision);
}

type DirtyChunk = { coord: ChunkCoord; revision: number };

/** Builds dirty chunks off the committed map and swaps each result atomically. */
export class DirtyChunkQueue {
  private readonly pending = new Map<string, DirtyChunk>();
  private readonly committed = new Map<string, ChunkPayload>();

  markDirty(coord: ChunkCoord, revision: number): void {
    const key = chunkKey(coord);
    const current = this.pending.get(key);
    if (!current || revision >= current.revision) this.pending.set(key, { coord, revision });
  }

  process(maxChunks: number, generator: ChunkGenerator): ChunkPayload[] {
    const committed: ChunkPayload[] = [];
    const entries = [...this.pending.values()].slice(0, Math.max(0, maxChunks));
    for (const dirty of entries) {
      const payload = generateChunk(dirty.coord, dirty.revision, generator);
      this.committed.set(chunkKey(payload.coord), payload);
      this.pending.delete(chunkKey(dirty.coord));
      committed.push(payload);
    }
    return committed;
  }

  get(coord: ChunkCoord): ChunkPayload | undefined { return this.committed.get(chunkKey(coord)); }
  pendingCount(): number { return this.pending.size; }
}
