export type AudioBusName = 'master' | 'music' | 'effects' | 'voice';

/** Owns browser audio lifecycle and volume policy; games provide the actual sounds. */
export class AudioBus {
  private readonly volumes = new Map<AudioBusName, number>([
    ['master', 1], ['music', 1], ['effects', 1], ['voice', 1],
  ]);
  private readonly muted = new Set<AudioBusName>();
  private context?: AudioContext;

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setVolume(bus: AudioBusName, volume: number): void {
    this.volumes.set(bus, Math.min(Math.max(volume, 0), 1));
  }

  volume(bus: AudioBusName): number { return this.muted.has(bus) ? 0 : (this.volumes.get(bus) ?? 1) * this.volume('master'); }
  setMuted(bus: AudioBusName, muted: boolean): void { muted ? this.muted.add(bus) : this.muted.delete(bus); }
  isMuted(bus: AudioBusName): boolean { return this.muted.has(bus); }

  dispose(): void { void this.context?.close(); this.context = undefined; }
}
