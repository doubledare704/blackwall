export class AudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private ambient?: OscillatorNode;
  enabled = false;
  async enable(value: boolean) {
    this.enabled = value;
    if (!value) { this.master?.gain.setTargetAtTime(0, this.context!.currentTime, .1); return; }
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      if (!this.master) {
        this.master = this.context.createGain(); this.master.gain.value = .16; this.master.connect(this.context.destination);
        const low = this.context.createOscillator(); low.type = 'sine'; low.frequency.value = 55;
        const volume = this.context.createGain(); volume.gain.value = .035; low.connect(volume); volume.connect(this.master); low.start(); this.ambient = low;
      }
      this.master.gain.setTargetAtTime(.16, this.context.currentTime, .1);
      this.play('story');
    } catch { this.enabled = false; }
  }
  play(kind: string) {
    const ctx = this.context; if (!this.enabled || !ctx || ctx.state !== 'running' || !this.master) return;
    const spec: Record<string, [number, number, number, OscillatorType]> = {
      pulse: [520, 180, .055, 'sine'], phantom: [90, 45, .07, 'triangle'],
      critical: [880, 1320, .16, 'triangle'], buy: [440, 880, .18, 'sine'],
      vent: [1200, 80, .45, 'triangle'], story: [330, 660, .45, 'sine'], alarm: [160, 80, .65, 'sawtooth'], tab: [700, 800, .035, 'sine'],
    };
    const [start, end, duration, type] = spec[kind] ?? spec.tab;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const t = ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(start, t); osc.frequency.exponentialRampToValueAtTime(end, t + duration);
    gain.gain.setValueAtTime(.001, t); gain.gain.exponentialRampToValueAtTime(kind === 'alarm' ? .18 : .32, t + .008); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + duration + .03);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  suspend() { void this.context?.suspend(); }
  resume() { if (this.enabled) void this.context?.resume(); }
  destroy() { this.ambient?.stop(); void this.context?.close(); }
}
export const audio = new AudioEngine();
