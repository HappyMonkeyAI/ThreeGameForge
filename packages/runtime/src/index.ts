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
  cancelFrame?: (handle: number) => void;
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
    if (!Number.isFinite(fixedStep) || fixedStep <= 0) throw new RangeError('Fixed step must be finite and positive');
    if (!Number.isFinite(maxFrameDelta) || maxFrameDelta < 0) throw new RangeError('Max frame delta must be finite and non-negative');
    this.fixedStep = fixedStep;
    this.maxFrameDelta = maxFrameDelta;
    this.previousTime = now;
  }

  /** Re-anchors frame timing without simulating the skipped interval, e.g. after a pause. */
  resetTime(time: number): void {
    this.previousTime = time;
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
  private lastFrameDeltaMs = 0;
  private frameCount = 0;
  private simulationSteps = 0;

  /** Record once per presented frame, using the frame timestamp (e.g. the rAF time). */
  recordFrame(time: number, simulationSteps: number): void {
    if (this.lastFrameTime !== undefined) this.lastFrameDeltaMs = Math.max(time - this.lastFrameTime, 0);
    this.lastFrameTime = time;
    this.frameCount += 1;
    this.simulationSteps = simulationSteps;
  }

  /** `frameDeltaMs` is the interval between the two most recent recorded frames (0 until two exist). */
  snapshot(): DiagnosticsSnapshot {
    return {
      frameDeltaMs: this.lastFrameDeltaMs,
      frames: this.frameCount,
      simulationSteps: this.simulationSteps,
    };
  }
}

/** Runs deterministic simulation steps while allowing presentation to render freely. */
export class FixedStepRuntime {
  private readonly clock: RuntimeClock;
  private readonly update: (dt: number) => void;
  private readonly render: (alpha: number, time: number) => void;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly onFrame = (time: number): void => {
    this.frameHandle = undefined;
    this.frame(time);
    if (this.active) this.frameHandle = this.requestFrame(this.onFrame);
  };
  private frameHandle?: number;
  private active = false;
  private paused = false;
  private resyncClock = false;
  readonly fixedStep: number;
  readonly maxFrameDelta: number;
  readonly stats: RuntimeStats = { simulationSteps: 0, elapsed: 0 };

  constructor(
    update: (dt: number) => void,
    render: (alpha: number, time: number) => void,
    options: RuntimeOptions = {},
  ) {
    this.update = update;
    this.render = render;
    this.fixedStep = options.fixedStep ?? DEFAULT_FIXED_STEP;
    this.maxFrameDelta = options.maxFrameDelta ?? DEFAULT_MAX_FRAME_DELTA;
    this.clock = new RuntimeClock(this.fixedStep, this.maxFrameDelta, options.now?.() ?? performance.now());
    this.requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    this.cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
  }

  get running(): boolean { return this.active; }

  /** Starts the frame loop; calling it while already running is a no-op. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.resyncClock = true;
    this.frameHandle = this.requestFrame(this.onFrame);
  }

  /** Cancels the pending frame so no further update or render callbacks run. */
  stop(): void {
    this.active = false;
    if (this.frameHandle !== undefined) this.cancelFrame(this.frameHandle);
    this.frameHandle = undefined;
  }

  setPaused(paused: boolean): void {
    // Time spent paused must not be simulated as catch-up steps on resume.
    if (this.paused && !paused) this.resyncClock = true;
    this.paused = paused;
  }

  /**
   * Runs one frame without scheduling another. Exposed for deterministic tests and
   * hosts with their own animation scheduler; `start()` drives it from rAF otherwise.
   */
  frame(time: number): void {
    if (this.paused) {
      this.render(0, time);
    } else {
      if (this.resyncClock) {
        this.clock.resetTime(time);
        this.resyncClock = false;
      }
      const alpha = this.clock.advance(time, this.update);
      this.stats.elapsed = this.clock.elapsed;
      this.stats.simulationSteps = this.clock.steps;
      this.render(alpha, time);
    }
  }
}
