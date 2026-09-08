export const DEFAULT_FIXED_STEP = 1 / 60;
export const DEFAULT_MAX_FRAME_DELTA = 0.1;

export type RuntimeStats = {
  simulationSteps: number;
  elapsed: number;
};

export type RuntimeOptions = {
  fixedStep?: number;
  maxFrameDelta?: number;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
};

export type RuntimeLifecycleState = 'created' | 'running' | 'paused' | 'stopped';

export class RuntimeClock {
  private accumulator = 0;
  private previousTime: number;
  elapsed = 0;
  steps = 0;
  readonly fixedStep: number;
  readonly maxFrameDelta: number;

  constructor(
    fixedStep = DEFAULT_FIXED_STEP,
    maxFrameDelta = DEFAULT_MAX_FRAME_DELTA,
    now = performance.now(),
  ) {
    this.fixedStep = fixedStep;
    this.maxFrameDelta = maxFrameDelta;
    this.previousTime = now;
  }

  advance(time: number, update: (dt: number) => void): number {
    const frameDelta = Math.min(Math.max((time - this.previousTime) / 1000, 0), this.maxFrameDelta);
    this.previousTime = time;
    this.accumulator += frameDelta;
    this.elapsed += frameDelta;
    while (this.accumulator >= this.fixedStep) {
      update(this.fixedStep);
      this.accumulator -= this.fixedStep;
      this.steps += 1;
    }
    return this.accumulator / this.fixedStep;
  }
}

export class RuntimeLifecycle {
  state: RuntimeLifecycleState = 'created';

  start(): void {
    if (this.state === 'stopped') throw new Error('Stopped runtime cannot be restarted');
    this.state = 'running';
  }

  pause(): void { if (this.state === 'running') this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') this.state = 'running'; }
  stop(): void { this.state = 'stopped'; }
}

export type DiagnosticsSnapshot = {
  frameDeltaMs: number;
  frames: number;
  simulationSteps: number;
};

export class RuntimeDiagnostics {
  private lastFrameTime?: number;
  private frameCount = 0;
  private simulationSteps = 0;

  recordFrame(time: number, simulationSteps: number): void {
    this.lastFrameTime = time;
    this.frameCount += 1;
    this.simulationSteps = simulationSteps;
  }

  snapshot(now = performance.now()): DiagnosticsSnapshot {
    return {
      frameDeltaMs: this.lastFrameTime === undefined ? 0 : Math.max(now - this.lastFrameTime, 0),
      frames: this.frameCount,
      simulationSteps: this.simulationSteps,
    };
  }
}

/** Runs deterministic simulation steps while allowing presentation to render freely. */
export class FixedStepRuntime {
  private readonly clock: RuntimeClock;
  private readonly update: (dt: number) => void;
  private readonly render: (alpha: number) => void;
  private paused = false;
  readonly fixedStep: number;
  readonly maxFrameDelta: number;
  readonly stats: RuntimeStats = { simulationSteps: 0, elapsed: 0 };

  constructor(
    update: (dt: number) => void,
    render: (alpha: number) => void,
    options: RuntimeOptions = {},
  ) {
    this.update = update;
    this.render = render;
    this.fixedStep = options.fixedStep ?? DEFAULT_FIXED_STEP;
    this.maxFrameDelta = options.maxFrameDelta ?? DEFAULT_MAX_FRAME_DELTA;
    this.clock = new RuntimeClock(this.fixedStep, this.maxFrameDelta, options.now?.() ?? performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  }

  private readonly requestFrame: (callback: FrameRequestCallback) => number;

  start(): void {
    this.requestFrame((time) => this.frame(time));
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** Exposed for deterministic tests and hosts with their own animation scheduler. */
  frame(time: number): void {
    if (this.paused) {
      this.render(0);
      this.requestFrame((nextTime) => this.frame(nextTime));
      return;
    }
    const alpha = this.clock.advance(time, this.update);
    this.stats.elapsed = this.clock.elapsed;
    this.stats.simulationSteps = this.clock.steps;
    this.render(alpha);
    this.requestFrame((nextTime) => this.frame(nextTime));
  }
}
