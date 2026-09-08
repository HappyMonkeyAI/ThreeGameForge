export type AssetManifestEntry = {
  id: string;
  source: string;
  license: string;
  checksum?: string;
};

export class AssetManifest {
  private readonly entries = new Map<string, AssetManifestEntry>();

  register(entry: AssetManifestEntry): void {
    if (this.entries.has(entry.id)) throw new Error(`Asset already registered: ${entry.id}`);
    this.entries.set(entry.id, entry);
  }

  get(id: string): AssetManifestEntry {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown asset: ${id}`);
    return entry;
  }

  list(): AssetManifestEntry[] { return [...this.entries.values()]; }
}

export type AssetLoader<T> = (entry: AssetManifestEntry) => Promise<T>;
export type AssetDisposer<T> = (asset: T) => void;

/** Caches loaded assets and disposes them exactly once when released. */
export class AssetRegistry<T> {
  private readonly cache = new Map<string, Promise<T>>();
  private readonly disposed = new Set<string>();
  private readonly manifest: AssetManifest;
  private readonly load: AssetLoader<T>;
  private readonly dispose: AssetDisposer<T>;

  constructor(
    manifest: AssetManifest,
    load: AssetLoader<T>,
    dispose: AssetDisposer<T>,
  ) {
    this.manifest = manifest;
    this.load = load;
    this.dispose = dispose;
  }

  loadAsset(id: string): Promise<T> {
    if (this.disposed.has(id)) throw new Error(`Asset has been disposed: ${id}`);
    const existing = this.cache.get(id);
    if (existing) return existing;
    const pending = this.load(this.manifest.get(id));
    this.cache.set(id, pending);
    return pending;
  }

  async release(id: string): Promise<void> {
    if (this.disposed.has(id)) return;
    const asset = this.cache.get(id);
    if (asset) this.dispose(await asset);
    this.cache.delete(id);
    this.disposed.add(id);
  }
}
