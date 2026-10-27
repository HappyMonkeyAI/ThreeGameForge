export type QualityTier = 'low' | 'medium' | 'high';

export type RendererMetrics = {
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
};

export const QUALITY_BUDGETS: Record<QualityTier, number> = {
  low: 33.3,
  medium: 20,
  high: 16.7,
};

export type QualityControllerOptions = {
  /** Frames averaged per decision. */
  window?: number;
  /** Multiplier on the tier budget that the average must exceed before stepping down. */
  tolerance?: number;
  /** Frames to wait after a downgrade before trying a higher tier again. */
  upgradeCooldown?: number;
};

const TIER_ORDER: QualityTier[] = ['low', 'medium', 'high'];
const MAX_COOLDOWN_SCALE = 8;

/**
 * Chooses a bounded quality tier from measured frame intervals, not assumptions about hardware.
 *
 * Decisions use a rolling mean so vsync jitter around a budget (e.g. 16.6-16.8ms at 60Hz)
 * does not trigger changes. A capped display cannot reveal headroom, so upgrades are
 * probes: each probe that is followed by an immediate downgrade doubles the cooldown.
 */
export class QualityController {
  tier: QualityTier;
  private readonly window: number;
  private readonly tolerance: number;
  private readonly baseCooldown: number;
  private readonly samples: number[] = [];
  private sampleIndex = 0;
  private sampleSum = 0;
  private cooldown = 0;
  private cooldownScale = 1;
  private framesSinceUpgrade = Number.POSITIVE_INFINITY;

  constructor(initial: QualityTier = 'high', options: QualityControllerOptions = {}) {
    this.tier = initial;
    this.window = Math.max(1, Math.floor(options.window ?? 30));
    this.tolerance = options.tolerance ?? 1.1;
    this.baseCooldown = Math.max(0, Math.floor(options.upgradeCooldown ?? 300));
  }

  observe(frameTimeMs: number): QualityTier {
    // The first recorded frame and paused or invalid samples carry no timing evidence.
    if (!Number.isFinite(frameTimeMs) || frameTimeMs <= 0) return this.tier;
    this.framesSinceUpgrade += 1;
    if (this.cooldown > 0) this.cooldown -= 1;
    if (this.samples.length < this.window) {
      this.samples.push(frameTimeMs);
    } else {
      this.sampleSum -= this.samples[this.sampleIndex];
      this.samples[this.sampleIndex] = frameTimeMs;
    }
    this.sampleSum += frameTimeMs;
    this.sampleIndex = (this.sampleIndex + 1) % this.window;
    if (this.samples.length < this.window) return this.tier;

    const mean = this.sampleSum / this.window;
    const index = TIER_ORDER.indexOf(this.tier);
    if (index > 0 && mean > QUALITY_BUDGETS[this.tier] * this.tolerance) {
      this.changeTier(TIER_ORDER[index - 1]);
      // A downgrade straight after an upgrade means the probe failed: back off further.
      const failedProbe = this.framesSinceUpgrade <= this.window * 2;
      this.cooldownScale = failedProbe ? Math.min(this.cooldownScale * 2, MAX_COOLDOWN_SCALE) : 1;
      this.cooldown = this.baseCooldown * this.cooldownScale;
    } else if (index < TIER_ORDER.length - 1 && this.cooldown === 0) {
      const higher = TIER_ORDER[index + 1];
      if (mean <= QUALITY_BUDGETS[higher]) {
        this.changeTier(higher);
        this.framesSinceUpgrade = 0;
      }
    }
    return this.tier;
  }

  private changeTier(tier: QualityTier): void {
    this.tier = tier;
    this.samples.length = 0;
    this.sampleIndex = 0;
    this.sampleSum = 0;
  }
}
