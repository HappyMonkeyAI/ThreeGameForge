/**
 * Deterministic sfc32 generator (128-bit state). Replaced a 32-bit LCG in 0.2.0, whose
 * low bits cycled with short periods; the same seed now yields a different sequence.
 */
export class SeededRandom {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number | string) {
    // Expand the 32-bit seed into four well-mixed state words with splitmix32.
    let mix = typeof seed === 'number' ? seed >>> 0 : SeededRandom.hash(seed);
    const splitmix = (): number => {
      mix = (mix + 0x9e3779b9) >>> 0;
      let z = mix;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = splitmix();
    this.b = splitmix();
    this.c = splitmix();
    this.d = splitmix();
    for (let round = 0; round < 12; round += 1) this.nextUint32();
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.nextUint32() / 0x100000000;
  }

  /** Uniform integer in [min, max], both inclusive. */
  integer(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) throw new RangeError('Random bounds must be integers');
    if (max < min) throw new RangeError('Random maximum must be >= minimum');
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Reference sfc32 step (Chris Doty-Humphrey, PractRand), kept in 32-bit unsigned arithmetic.
  private nextUint32(): number {
    let t = (this.a + this.b) >>> 0;
    this.a = (this.b ^ (this.b >>> 9)) >>> 0;
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.d = (this.d + 1) >>> 0;
    t = (t + this.d) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
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
    return () => {
      listeners.delete(handler as EventHandler<unknown>);
      if (listeners.size === 0 && this.handlers.get(event) === listeners) this.handlers.delete(event);
    };
  }

  /** Calls every handler even if some throw; failures are rethrown together afterwards. */
  emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    const listeners = this.handlers.get(event);
    if (!listeners) return;
    const errors: unknown[] = [];
    // Snapshot so handlers subscribed during this emit start with the next one.
    for (const handler of [...listeners]) {
      try {
        handler(payload);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `${errors.length} handlers failed for ${String(event)}`);
  }
}
