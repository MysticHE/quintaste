/**
 * Rush Hour sound (GAME_PLAN §13), made with Web Audio inside the game page: no audio files to download or license.
 * Nothing is created until sound or music is switched on and the player taps (browsers need a gesture), nothing plays
 * while a switch is off, and pausing suspends everything. Every effect has a caption (GAME_PLAN §12.4).
 */
export type Sfx = "place" | "sizzle" | "plate" | "coin" | "serve" | "returned" | "ticket" | "scorch" | "ready" | "fill" | "star" | "slam" | "reward" | "click" | "perfect" | "take";
export const CAPTIONS: Record<Sfx, string> = {
  place: "Plop", sizzle: "Sizzle", plate: "Plate clinks", coin: "Coins chime", serve: "Serve chime", returned: "Plate comes back", ticket: "New order bell", scorch: "Smoke hisses",
  ready: "Ready ding", fill: "Takings count up", star: "Star chime", slam: "Fanfare", reward: "Reward pops", click: "Knob clicks", perfect: "Perfect chime", take: "Off the heat",
};
/** Semitones up from a base pitch: each coin, combo serve, takings tick and star climbs, capped so it never squeals. */
const up = (f: number, n: number, cap: number) => f * Math.pow(2, Math.min(n, cap) / 12);

type Tone = { type?: OscillatorType; f: number; to?: number; at?: number; dur: number; gain: number };
type Noise = { at?: number; dur: number; gain: number; freq: number; filter?: BiquadFilterType; q?: number };

export class GameAudio {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private sizzle: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private music: { stop(): void } | null = null;
  private sound = false; private musicOn = false; private paused = false;
  /** Effects actually played since the game opened, for local tests. */
  played = 0;

  /** Applies the Sound and Music switches. Turning both off closes the audio context. */
  set(sound: boolean, music: boolean) {
    this.sound = sound; this.musicOn = music;
    if (!sound) this.stopSizzle();
    if (!music) { this.music?.stop(); this.music = null; }
    if (!sound && !music) { void this.ctx?.close().catch(() => {}); this.ctx = null; this.out = null; this.noiseBuf = null; return; }
    this.startMusic();
  }
  /** From a tap: creates or resumes the context when a switch is on. */
  unlock() {
    if (!this.sound && !this.musicOn) return;
    if (!this.ctx) {
      const AC = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = 0.8; this.out.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended" && !this.paused) void this.ctx.resume().catch(() => {});
    this.startMusic();
  }
  pause(on: boolean) {
    this.paused = on;
    if (on) this.setSizzle(0);
    if (this.ctx) void (on ? this.ctx.suspend() : this.ctx.resume()).catch(() => {});
  }
  dispose() { this.set(false, false); }

  /** One effect; `n` climbs the pitch (coins, combo serves, takings ticks, stars). Returns false when nothing was played. */
  play(kind: Sfx, n = 0) {
    const c = this.live(); if (!c || !this.sound) return false;
    const t = c.currentTime + 0.01;
    if (kind === "place") { this.tone({ f: 260, to: 120, dur: 0.13, gain: 0.3, at: t }); this.noise({ at: t, dur: 0.05, gain: 0.08, freq: 1200 }); }
    if (kind === "sizzle") this.noise({ at: t, dur: 0.38, gain: 0.16, freq: 3200, filter: "highpass" });
    if (kind === "plate") { this.tone({ f: 1760, dur: 0.22, gain: 0.1, at: t }); this.tone({ f: 2640, dur: 0.16, gain: 0.06, at: t }); this.noise({ at: t, dur: 0.03, gain: 0.05, freq: 4000 }); }
    if (kind === "coin") { const f = up(1320, n, 14); this.tone({ type: "triangle", f, dur: 0.24, gain: 0.1, at: t }); this.tone({ f: f * 2, dur: 0.14, gain: 0.04, at: t }); }
    if (kind === "serve") { this.tone({ f: up(784, n, 7), dur: 0.25, gain: 0.14, at: t }); this.tone({ f: up(1047, n, 7), dur: 0.38, gain: 0.14, at: t + 0.12 }); }
    if (kind === "ready") { this.tone({ type: "triangle", f: 1568, dur: 0.14, gain: 0.09, at: t }); this.tone({ type: "triangle", f: 2093, dur: 0.24, gain: 0.09, at: t + 0.09 }); }
    if (kind === "fill") this.tone({ f: up(660, n, 16), dur: 0.05, gain: 0.05, at: t });
    if (kind === "star") { const f = up(880, [0, 4, 7][Math.min(n, 2)], 7); this.tone({ type: "triangle", f, dur: 0.5, gain: 0.12, at: t }); this.tone({ f: f * 2, dur: 0.3, gain: 0.05, at: t + 0.02 }); this.noise({ at: t, dur: 0.12, gain: 0.05, freq: 6000, filter: "highpass" }); }
    if (kind === "slam") { this.tone({ f: 150, to: 55, dur: 0.28, gain: 0.32, at: t }); this.noise({ at: t, dur: 0.14, gain: 0.12, freq: 420, filter: "lowpass" }); [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone({ type: "triangle", f, dur: 0.7, gain: 0.05, at: t + 0.06 + i * 0.03 })); }
    if (kind === "reward") this.tone({ f: 520, to: 1040, dur: 0.12, gain: 0.1, at: t });
    if (kind === "click") { this.noise({ at: t, dur: 0.03, gain: 0.12, freq: 2500, filter: "highpass" }); this.tone({ type: "triangle", f: 900, dur: 0.04, gain: 0.05, at: t }); }
    if (kind === "perfect") { [1760, 2349, 3136].forEach((f, i) => this.tone({ type: "triangle", f, dur: 0.22, gain: 0.08, at: t + i * 0.06 })); this.noise({ at: t, dur: 0.1, gain: 0.05, freq: 7000, filter: "highpass" }); }
    if (kind === "take") this.tone({ f: 330, to: 220, dur: 0.1, gain: 0.14, at: t });
    if (kind === "returned") { this.tone({ type: "triangle", f: 523, dur: 0.2, gain: 0.11, at: t }); this.tone({ type: "triangle", f: 392, dur: 0.32, gain: 0.11, at: t + 0.14 }); }
    if (kind === "ticket") { this.tone({ f: 1318, dur: 0.7, gain: 0.1, at: t }); this.tone({ f: 1318 * 2.76, dur: 0.3, gain: 0.025, at: t }); }
    if (kind === "scorch") this.noise({ at: t, dur: 0.6, gain: 0.14, freq: 900, filter: "lowpass" });
    this.played++;
    return true;
  }

  /** Continuous sizzle while a pan with food is hot (0–1). */
  setSizzle(level: number) {
    const c = this.live();
    if (!c || !this.sound || level <= 0) { if (this.sizzle && c) this.sizzle.gain.gain.setTargetAtTime(0, c.currentTime, 0.08); return; }
    if (!this.sizzle) {
      const src = c.createBufferSource(), hp = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = this.noiseBuffer(c); src.loop = true; hp.type = "highpass"; hp.frequency.value = 2600; gain.gain.value = 0;
      src.connect(hp).connect(gain).connect(this.out!); src.start(); this.sizzle = { src, gain };
    }
    this.sizzle.gain.gain.setTargetAtTime(Math.min(1, level) * 0.06, c.currentTime, 0.12);
  }

  private live() { const c = this.ctx; return c && this.out && c.state === "running" && !this.paused ? c : null; }
  private stopSizzle() { try { this.sizzle?.src.stop(); } catch { /* already stopped */ } this.sizzle?.gain.disconnect(); this.sizzle = null; }
  private noiseBuffer(c: AudioContext) {
    if (!this.noiseBuf) {
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }
  private env(c: AudioContext, at: number, dur: number, gain: number) {
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(this.out!); return g;
  }
  private tone({ type = "sine", f, to, at = 0, dur, gain }: Tone) {
    const c = this.ctx!, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    o.connect(this.env(c, at, dur, gain)); o.start(at); o.stop(at + dur + 0.02);
  }
  private noise({ at = 0, dur, gain, freq, filter = "bandpass", q = 0.8 }: Noise) {
    const c = this.ctx!, src = c.createBufferSource(), f = c.createBiquadFilter();
    src.buffer = this.noiseBuffer(c); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    src.connect(f).connect(this.env(c, at, dur, gain)); src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.02);
  }

  /** Quiet café ambience: soft chords every four seconds and an occasional pentatonic pluck. */
  private startMusic() {
    const c = this.ctx, out = this.out;
    if (!this.musicOn || !c || !out || this.music) return;
    const bus = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1500; bus.gain.value = 0; bus.gain.setTargetAtTime(0.5, c.currentTime, 1.5); lp.connect(bus).connect(out);
    const chords = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
    const notes = [523.3, 587.3, 659.3, 784, 880, 1046.5];
    let step = 0, next = c.currentTime + 0.2;
    const voice = (type: OscillatorType, f: number, at: number, attack: number, dur: number, peak: number) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(lp); o.start(at); o.stop(at + dur + 0.05);
    };
    const timer = setInterval(() => {
      // A suspended context stops its clock, so nothing piles up while paused.
      while (next < c.currentTime + 0.6) {
        if (step % 8 === 0) chords[(step / 8) % chords.length].forEach(f => { voice("triangle", f, next, 1.2, 4.2, 0.03); voice("sine", f / 2, next, 1.4, 4.2, 0.02); });
        if (step % 2 === 1 && Math.random() < 0.5) voice("sine", notes[Math.floor(Math.random() * notes.length)], next, 0.01, 0.9, 0.035);
        next += 0.5; step++;
      }
    }, 200);
    this.music = { stop: () => { clearInterval(timer); bus.gain.setTargetAtTime(0, c.currentTime, 0.15); setTimeout(() => bus.disconnect(), 700); } };
  }
}
