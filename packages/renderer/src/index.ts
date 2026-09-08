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

/** Chooses a bounded quality tier from measured frame time, not assumptions about hardware. */
export class QualityController {
  tier: QualityTier;
  private slowFrames = 0;
  private fastFrames = 0;

  constructor(initial: QualityTier = 'high') { this.tier = initial; }

  observe(frameTimeMs: number): QualityTier {
    if (frameTimeMs > QUALITY_BUDGETS[this.tier]) {
      this.slowFrames += 1;
      this.fastFrames = 0;
    } else if (frameTimeMs < QUALITY_BUDGETS[this.tier] * 0.7) {
      this.fastFrames += 1;
      this.slowFrames = 0;
    } else {
      this.slowFrames = 0;
      this.fastFrames = 0;
    }
    if (this.slowFrames >= 3) this.stepDown();
    if (this.fastFrames >= 30) this.stepUp();
    return this.tier;
  }

  private stepDown(): void {
    this.slowFrames = 0;
    this.tier = this.tier === 'high' ? 'medium' : 'low';
  }

  private stepUp(): void {
    this.fastFrames = 0;
    this.tier = this.tier === 'low' ? 'medium' : 'high';
  }
}
