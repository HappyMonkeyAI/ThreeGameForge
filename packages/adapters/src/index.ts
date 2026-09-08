import type { NetworkCommand, NetworkSnapshot } from '../../networking/src/index.ts';

export type GameAdapter<State> = {
  id: string;
  initialState: State;
  update(state: State, dt: number): State;
  submitCommand?(state: State, command: NetworkCommand): State;
  projectSnapshot?(state: State, tick: number): NetworkSnapshot<State>;
};

/** Validates and exposes consumer adapters without coupling the runtime to game rules. */
export class AdapterRegistry<State> {
  private readonly adapters = new Map<string, GameAdapter<State>>();

  register(adapter: GameAdapter<State>): void {
    if (this.adapters.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): GameAdapter<State> {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Unknown game adapter: ${id}`);
    return adapter;
  }

  list(): string[] { return [...this.adapters.keys()]; }
}

/**
 * Small host seam for consumers. It owns adapter lifecycle state only; domain
 * authority remains in the consumer that supplies the adapter.
 */
export class AdapterHost<State> {
  private state: State;
  private tick = 0;
  private readonly adapter: GameAdapter<State>;

  constructor(adapter: GameAdapter<State>) {
    this.adapter = adapter;
    this.state = adapter.initialState;
  }

  get currentState(): State { return this.state; }
  get currentTick(): number { return this.tick; }

  step(dt: number): State {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Adapter step dt must be finite and non-negative');
    this.state = this.adapter.update(this.state, dt);
    this.tick += 1;
    return this.state;
  }

  submit(command: NetworkCommand): State {
    if (!this.adapter.submitCommand) throw new Error(`Adapter does not accept commands: ${this.adapter.id}`);
    this.state = this.adapter.submitCommand(this.state, command);
    return this.state;
  }

  snapshot(): NetworkSnapshot<State> {
    if (!this.adapter.projectSnapshot) throw new Error(`Adapter does not project snapshots: ${this.adapter.id}`);
    return this.adapter.projectSnapshot(this.state, this.tick);
  }
}
