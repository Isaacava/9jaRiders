// Procedural game audio (WebAudio only, no samples, no copyrighted music):
//  - original Afrobeats groove (kick / clap / shakers / congas / log-drum bass / pentatonic lead) that opens up with nitro
//  - bike engine with gear shifts, wind, turbo whistle and boost whoosh
//  - Lagos street ambience: danfo / keke / truck horns, distant traffic, conductor shouts (speech synthesis, optional)

export type HornKind = "danfo" | "sedan" | "keke" | "truck" | "suv";

const m2f = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const BPM = 106;
const STEP = 60 / BPM / 4; // 16th note

// 4-bar progression: Am7 | Fmaj7 | C | G   (roots in MIDI, chord tones, lead pool)
const ROOTS = [33, 29, 36, 31];
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 67]];
const LEAD = [69, 72, 74, 76, 79, 81, 76, 72];

const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0.35, 0];
const CONGA = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0];
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private eng!: { o1: OscillatorNode; o2: OscillatorNode; o3: OscillatorNode; lp: BiquadFilterNode; g: GainNode };
  private turbo!: { o: OscillatorNode; g: GainNode };
  private wind!: { g: GainNode; bp: BiquadFilterNode };
  private timer: number | null = null;
  private nextT = 0;
  private step = 0;
  private bar = 0;
  private intensity = 0;
  private intensityT = 0;
  private nextHorn = 0;
  private lastVoice = -99;
  private wasBoosting = false;
  private muted = false;
  private racing = false;

  constructor() {
    try { this.muted = window.localStorage.getItem("aboki:muted") === "1"; } catch { /* ignore */ }
  }

  isMuted() { return this.muted; }
  setMuted(m: boolean) {
    this.muted = m;
    try { window.localStorage.setItem("aboki:muted", m ? "1" : "0"); } catch { /* ignore */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  start() {
    if (this.ctx) { if (this.ctx.state === "suspended") void this.ctx.resume(); return; }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.55; this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);

      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;

      // engine
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = 0;
      const o1 = ctx.createOscillator(); o1.type = "sawtooth";
      const o2 = ctx.createOscillator(); o2.type = "square";
      const o3 = ctx.createOscillator(); o3.type = "sine";
      const g2 = ctx.createGain(); g2.gain.value = 0.5; const g3 = ctx.createGain(); g3.gain.value = 0.9;
      o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
      lp.connect(g); g.connect(this.sfxBus);
      o1.start(); o2.start(); o3.start();
      this.eng = { o1, o2, o3, lp, g };

      // turbo whistle
      const to = ctx.createOscillator(); to.type = "sine"; to.frequency.value = 1400;
      const tg = ctx.createGain(); tg.gain.value = 0; to.connect(tg); tg.connect(this.sfxBus); to.start();
      this.turbo = { o: to, g: tg };

      // wind + city beds
      const mkLoop = (type: BiquadFilterType, f: number) => {
        const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
        const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f;
        const gg = ctx.createGain(); gg.gain.value = 0;
        s.connect(bq); bq.connect(gg); gg.connect(this.sfxBus); s.start();
        return { g: gg, bp: bq };
      };
      this.wind = mkLoop("bandpass", 900);
      const city = mkLoop("lowpass", 380); city.g.gain.value = 0.035;

      // echo for the lead
      this.nextT = ctx.currentTime + 0.15;
      this.nextHorn = ctx.currentTime + 4;
      this.timer = window.setInterval(() => this.schedule(), 25);
    } catch { this.ctx = null; }
  }

  // ------------------------------------------------------------------ per-frame
  update(speed01: number, boosting: boolean, racing: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.racing = racing;
    const t = ctx.currentTime;
    const sp = Math.max(0, Math.min(1, speed01));
    // engine: 5 "gears" so the pitch climbs and drops like a real bike
    const gear = Math.min(4, Math.floor(sp * 5));
    const inGear = sp * 5 - gear;
    const f = 52 + gear * 12 + inGear * (70 + gear * 10) + (boosting ? 26 : 0);
    this.eng.o1.frequency.setTargetAtTime(f, t, 0.04);
    this.eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.04);
    this.eng.o3.frequency.setTargetAtTime(f * 0.25, t, 0.04);
    this.eng.lp.frequency.setTargetAtTime(520 + sp * 1500 + (boosting ? 900 : 0), t, 0.08);
    this.eng.g.gain.setTargetAtTime(racing ? 0.05 + sp * 0.06 + (boosting ? 0.03 : 0) : 0.012, t, 0.1);
    this.turbo.o.frequency.setTargetAtTime(1300 + sp * 900, t, 0.1);
    this.turbo.g.gain.setTargetAtTime(boosting ? 0.018 : 0, t, 0.08);
    this.wind.g.gain.setTargetAtTime(racing ? sp * sp * 0.09 + (boosting ? 0.04 : 0) : 0, t, 0.15);
    this.wind.bp.frequency.setTargetAtTime(600 + sp * 1600, t, 0.2);
    if (boosting && !this.wasBoosting) this.whoosh();
    this.wasBoosting = boosting;
    this.intensityT = boosting ? 1 : racing ? 0.35 : 0;
    this.intensity += (this.intensityT - this.intensity) * 0.04;
  }

  // ------------------------------------------------------------------ music sequencer
  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextT < ctx.currentTime + 0.14) {
      if (this.racing || this.step % 4 === 0) this.playStep(this.step, this.nextT);
      this.nextT += STEP;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
    if (this.racing && ctx.currentTime > this.nextHorn) {
      const kinds: HornKind[] = ["danfo", "sedan", "keke", "truck", "suv"];
      this.horn(kinds[Math.floor(Math.random() * kinds.length)], (Math.random() * 2 - 1) * 0.8, 0.22);
      this.nextHorn = ctx.currentTime + 3 + Math.random() * 6;
    }
  }

  private playStep(s: number, t: number) {
    const inten = this.intensity;
    const bar = this.bar;
    const chord = CHORDS[bar], root = ROOTS[bar];
    if (!this.racing) { // pre-race: just a soft pulse and pad so the garage/countdown isn't silent
      if (s === 0) this.pluck(t, chord[0] + 12, 0.05, 1.2);
      return;
    }
    if (KICK[s]) this.kick(t, 0.85);
    if (CLAP[s]) this.clap(t, CLAP[s] * 0.55);
    if (s % 2 === 0) this.hat(t, s === 14, 0.1 + inten * 0.05);
    else if (inten > 0.25 || s % 4 === 3) this.hat(t, false, 0.04 + inten * 0.05);
    this.shaker(t, s % 4 === 2 ? 0.07 : 0.035);
    if (CONGA[s]) this.conga(t, s % 3 === 0 ? 260 : 190, 0.22);
    if (BASS[s]) {
      const up = s === 6 ? 7 : s === 12 ? 12 : 0;
      this.logDrum(t, root + up, 0.55);
    }
    if ([2, 5, 10, 13].includes(s)) for (const n of chord) this.pluck(t, n, 0.028 + inten * 0.012, 0.28);
    if (s === 0 && bar % 2 === 1 || (inten > 0.6 && s === 8)) {
      let at = t;
      for (let i = 0; i < 3; i++) { this.lead(at, LEAD[Math.floor(Math.random() * LEAD.length)], 0.05 + inten * 0.02); at += STEP * (2 + Math.floor(Math.random() * 2)); }
    }
  }

  // ------------------------------------------------------------------ instruments
  private env(g: GainNode, t: number, peak: number, dur: number, atk = 0.004) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, bus: GainNode, dest?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * 0.5);
    const g = ctx.createGain(); this.env(g, t, peak, dur);
    o.connect(g); g.connect(dest ?? bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private burst(t: number, dur: number, peak: number, type: BiquadFilterType, f: number, q: number, bus: GainNode) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q;
    const g = ctx.createGain(); this.env(g, t, peak, dur, 0.002);
    s.connect(bq); bq.connect(g); g.connect(bus);
    s.start(t, Math.random() * 1.5, dur + 0.05);
  }
  private kick(t: number, v: number) { this.tone("sine", 165, 42, t, 0.28, v, this.musicBus); this.burst(t, 0.02, 0.12, "highpass", 2500, 1, this.musicBus); }
  private clap(t: number, v: number) { for (let i = 0; i < 3; i++) this.burst(t + i * 0.011, 0.07, v, "bandpass", 1700, 1.1, this.musicBus); }
  private hat(t: number, open: boolean, v: number) { this.burst(t, open ? 0.16 : 0.035, v, "highpass", 7500, 0.7, this.musicBus); }
  private shaker(t: number, v: number) { this.burst(t, 0.045, v, "bandpass", 5200, 1.4, this.musicBus); }
  private conga(t: number, f: number, v: number) { this.tone("sine", f * 1.25, f * 0.8, t, 0.18, v, this.musicBus); this.burst(t, 0.02, 0.05, "bandpass", 1800, 2, this.musicBus); }
  private logDrum(t: number, midi: number, v: number) {
    const f = m2f(midi);
    this.tone("sine", f * 1.45, f, t, 0.34, v, this.musicBus);
    this.tone("triangle", f * 2, f * 2, t, 0.16, v * 0.22, this.musicBus);
  }
  private pluck(t: number, midi: number, v: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = m2f(midi);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain(); this.env(g, t, v, dur, 0.006);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private lead(t: number, midi: number, v: number) {
    const ctx = this.ctx!;
    const f = m2f(midi);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = det;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 4;
      lfo.connect(lg); lg.connect(o.detune);
      const g = ctx.createGain(); this.env(g, t, v, 0.5, 0.01);
      const dl = ctx.createDelay(1); dl.delayTime.value = STEP * 3; const fb = ctx.createGain(); fb.gain.value = 0.32;
      o.connect(g); g.connect(this.musicBus); g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.musicBus);
      o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    }
  }

  // ------------------------------------------------------------------ one-shot sfx
  private pan(p: number): AudioNode {
    const ctx = this.ctx!;
    if (!ctx.createStereoPanner) return this.sfxBus;
    const sp = ctx.createStereoPanner(); sp.pan.value = p; sp.connect(this.sfxBus);
    return sp;
  }

  horn(kind: HornKind, pan = 0, vol = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = this.pan(pan);
    const blast = (f1: number, f2: number, at: number, dur: number, type: OscillatorType, lpF: number, v: number) => {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpF;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.14 * v * vol, at + 0.02); g.gain.setValueAtTime(0.14 * v * vol, at + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      lp.connect(g); g.connect(out);
      for (const f of [f1, f2]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(lp); o.start(at); o.stop(at + dur + 0.05); }
    };
    if (kind === "danfo") { blast(372, 466, t, 0.5, "sawtooth", 1500, 1); blast(372, 466, t + 0.62, 0.35, "sawtooth", 1500, 0.9); }
    else if (kind === "keke") { blast(1020, 1280, t, 0.1, "square", 3200, 0.5); blast(1020, 1280, t + 0.17, 0.12, "square", 3200, 0.5); }
    else if (kind === "truck") blast(158, 200, t, 0.95, "sawtooth", 900, 1.2);
    else blast(420, 525, t, 0.32, "sawtooth", 1800, 0.8);
  }

  private whoosh() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.3; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(5200, t + 0.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    s.connect(bp); bp.connect(g); g.connect(this.sfxBus); s.start(t, 0, 1);
    this.tone("sawtooth", 120, 520, t, 0.5, 0.12, this.sfxBus);
  }

  pickup() { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("sine", 880, 880, t, 0.14, 0.2, this.sfxBus); this.tone("sine", 1318, 1318, t + 0.08, 0.22, 0.2, this.sfxBus); }
  pad() { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("sawtooth", 180, 900, t, 0.45, 0.15, this.sfxBus); this.tone("sine", 600, 1800, t + 0.05, 0.4, 0.18, this.sfxBus); this.whoosh(); }
  closeCall() { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("square", 700, 1500, t, 0.1, 0.06, this.sfxBus); this.tone("square", 1100, 1900, t + 0.07, 0.12, 0.06, this.sfxBus); }
  overtake() { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("triangle", 520, 780, t, 0.18, 0.12, this.sfxBus); }
  crash() {
    const t = this.ctx?.currentTime; if (t === undefined) return;
    this.burst(t, 0.35, 0.7, "lowpass", 900, 0.7, this.sfxBus);
    this.tone("sine", 140, 40, t, 0.4, 0.9, this.sfxBus);
    this.burst(t + 0.02, 0.12, 0.3, "highpass", 3000, 1, this.sfxBus);
  }
  beep(n: number) { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("square", 440, 440, t, 0.2, 0.12, this.sfxBus); void n; }
  go() { const t = this.ctx?.currentTime; if (t === undefined) return; this.tone("square", 880, 880, t, 0.45, 0.14, this.sfxBus); this.whoosh(); }
  finish() { const t = this.ctx?.currentTime; if (t === undefined) return; [523, 659, 784, 1046].forEach((f, i) => this.tone("triangle", f, f, t + i * 0.1, 0.4, 0.14, this.sfxBus)); }

  /** Danfo-conductor style shout ("Oshodi! Oshodi!") using the browser's speech synthesis, rate limited. */
  voice() {
    if (this.muted || !this.ctx || typeof speechSynthesis === "undefined") return;
    if (this.ctx.currentTime - this.lastVoice < 28) return;
    this.lastVoice = this.ctx.currentTime;
    try {
      const lines = ["Oshodi! Oshodi! Oshodi!", "Yaba! Yaba! Enter with your change!", "Ojuelegba! Ojuelegba!", "Lekki Ajah! One more person!", "Mile Two! Mile Two! Apapa!"];
      const u = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
      const vs = speechSynthesis.getVoices();
      const v = vs.find((x) => x.lang.toLowerCase().startsWith("en-ng")) ?? vs.find((x) => x.lang.toLowerCase().startsWith("en"));
      if (v) u.voice = v;
      u.rate = 1.15; u.pitch = 1.15; u.volume = 0.55;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer);
    try { this.eng?.o1.stop(); this.eng?.o2.stop(); this.eng?.o3.stop(); this.turbo?.o.stop(); void this.ctx?.close(); } catch { /* ignore */ }
    if (typeof speechSynthesis !== "undefined") try { speechSynthesis.cancel(); } catch { /* ignore */ }
    this.ctx = null;
  }
}
