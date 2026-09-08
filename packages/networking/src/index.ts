export type NetworkCommand<T = unknown> = {
  sequence: number;
  type: string;
  payload: T;
};

export type NetworkSnapshot<T = unknown> = {
  tick: number;
  state: T;
};

export type PredictionOptions<T> = {
  clone: (state: T) => T;
  apply: (state: T, command: NetworkCommand) => T;
  measureCorrection?: (before: T, after: T) => number;
};

export type ReconciliationResult<T> = {
  state: T;
  acknowledged: number;
  correction: number;
};

/** Maintains an authoritative baseline and replays only unacknowledged commands. */
export class PredictionClient<T> {
  private authoritative: T;
  private predicted: T;
  private readonly pending = new Map<number, NetworkCommand>();
  private readonly clone: (state: T) => T;
  private readonly apply: (state: T, command: NetworkCommand) => T;
  private readonly measureCorrection: (before: T, after: T) => number;

  constructor(initial: T, options: PredictionOptions<T>) {
    this.clone = options.clone;
    this.apply = options.apply;
    this.measureCorrection = options.measureCorrection ?? (() => 0);
    this.authoritative = this.clone(initial);
    this.predicted = this.clone(initial);
  }

  queue(command: NetworkCommand): T {
    this.pending.set(command.sequence, command);
    this.predicted = this.apply(this.predicted, command);
    return this.clone(this.predicted);
  }

  reconcile(snapshot: NetworkSnapshot<T>, lastAcknowledgedSequence: number): ReconciliationResult<T> {
    const before = this.predicted;
    this.authoritative = this.clone(snapshot.state);
    for (const sequence of this.pending.keys()) {
      if (sequence <= lastAcknowledgedSequence) this.pending.delete(sequence);
    }
    this.predicted = this.clone(this.authoritative);
    for (const command of [...this.pending.values()].sort((a, b) => a.sequence - b.sequence)) {
      this.predicted = this.apply(this.predicted, command);
    }
    return {
      state: this.clone(this.predicted),
      acknowledged: lastAcknowledgedSequence,
      correction: this.measureCorrection(before, this.predicted),
    };
  }

  pendingCount(): number { return this.pending.size; }
  get predictedState(): T { return this.clone(this.predicted); }
}

/** Retains a bounded ordered snapshot window for render interpolation. */
export class SnapshotBuffer<T> {
  private readonly snapshots: NetworkSnapshot<T>[] = [];
  private readonly capacity: number;

  constructor(capacity = 32) { this.capacity = capacity; }

  push(snapshot: NetworkSnapshot<T>): void {
    const existing = this.snapshots.findIndex((item) => item.tick === snapshot.tick);
    if (existing >= 0) this.snapshots[existing] = snapshot;
    else this.snapshots.push(snapshot);
    this.snapshots.sort((a, b) => a.tick - b.tick);
    while (this.snapshots.length > this.capacity) this.snapshots.shift();
  }

  sample(tick: number, interpolate: (a: T, b: T, alpha: number) => T): T | undefined {
    if (this.snapshots.length === 0) return undefined;
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    if (tick <= first.tick) return first.state;
    if (tick >= last.tick) return last.state;
    for (let index = 1; index < this.snapshots.length; index += 1) {
      const next = this.snapshots[index];
      const previous = this.snapshots[index - 1];
      if (tick <= next.tick) {
        const alpha = (tick - previous.tick) / (next.tick - previous.tick);
        return interpolate(previous.state, next.state, alpha);
      }
    }
    return last.state;
  }

  size(): number { return this.snapshots.length; }
}
