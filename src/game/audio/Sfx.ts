// Minimal SFX (§18). Short synthesized blips via the Web Audio API only — no
// external audio files. Every call is guarded so audio issues never crash
// the game, and volume follows save.settings.volume (0 = silent).

import { save } from "../economy/SaveData";

class Sfx {
  private ctx: AudioContext | null = null;
  private inited = false;

  private getCtx(): AudioContext | null {
    if (this.inited) return this.ctx;
    this.inited = true;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = Ctor ? new Ctor() : null;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Resume the context on a user gesture — required by browser autoplay rules. */
  resume(): void {
    try {
      const ctx = this.getCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    } catch {
      /* ignore */
    }
  }

  /** A single short oscillator blip with a quick attack/decay gain envelope. */
  private blip(
    freq: number,
    durationMs: number,
    type: OscillatorType = "square",
    gainMult = 1,
    endFreq?: number,
    startDelayMs = 0
  ): void {
    const vol = save.settings.volume;
    if (vol <= 0) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + startDelayMs / 1000;
      const dur = durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq !== undefined) osc.frequency.linearRampToValueAtTime(endFreq, t0 + dur);
      const peak = Math.max(0.0005, Math.min(0.35, 0.35 * vol * gainMult));
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      /* ignore — SFX must never crash gameplay */
    }
  }

  shoot(): void {
    this.blip(880, 40, "square", 0.45);
  }

  hit(): void {
    this.blip(320, 55, "square", 0.6);
  }

  coin(): void {
    this.blip(660, 90, "sine", 0.7, 1100);
  }

  weapon(): void {
    // two-note pickup chime
    this.blip(520, 45, "triangle", 0.8);
    this.blip(780, 60, "triangle", 0.8, undefined, 50);
  }

  boss(): void {
    this.blip(140, 90, "sawtooth", 0.9);
  }

  death(): void {
    this.blip(500, 90, "sawtooth", 0.9, 120);
  }
}

// Single shared instance for the whole app.
export const sfx = new Sfx();
