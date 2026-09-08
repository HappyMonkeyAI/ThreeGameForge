export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'number' ? seed >>> 0 : SeededRandom.hash(seed);
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  integer(min: number, max: number): number {
    if (max < min) throw new Error('Random maximum must be >= minimum');
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  private static hash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}

export type EventHandler<T> = (event: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();

  on<Key extends keyof Events>(event: Key, handler: EventHandler<Events[Key]>): () => void {
    const listeners = this.handlers.get(event) ?? new Set<EventHandler<unknown>>();
    listeners.add(handler as EventHandler<unknown>);
    this.handlers.set(event, listeners);
    return () => listeners.delete(handler as EventHandler<unknown>);
  }

  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
}
