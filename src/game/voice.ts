// Character voices. Two engines, so everybody sounds different and it still works offline:
//  1. SPEECH: the device's own speech synthesis. Each character gets a voice of the right gender (chosen by name /
//     locale, deterministic per character so the same person always sounds the same) plus their own pitch and rate.
//  2. BLIPS: a synthesised "voice" (formant syllables at the character's own pitch) generated with WebAudio. No download,
//     no dependency on installed voices, and it can be filtered like a phone / radio.
import type { GameAudio } from "./audio";
import { voiceOf, type VoiceProfile } from "./story/cast";

export type VoiceMode = "speech" | "blips" | "off";
export const VOICE_KEY = "aboki:voice";

export const speechAvailable = () => typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
export function getVoiceMode(): VoiceMode {
  try { const v = window.localStorage.getItem(VOICE_KEY); if (v === "speech" || v === "blips" || v === "off") return v; } catch { /* ignore */ }
  return speechAvailable() ? "speech" : "blips";
}
export function setVoiceMode(m: VoiceMode) { try { window.localStorage.setItem(VOICE_KEY, m); } catch { /* ignore */ } }

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// names of installed voices that are known to be male / female (Android Google TTS puts it in the id, desktop uses first names)
const FEMALE = /female|woman|zira|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|serena|kate|allison|ava|joanna|salli|kendra|kimberly|ivy|emma|amy|libby|sonia|aria|jenny|natasha|clara|heera|veena|catherine|linda|sabina|ellen|nicky|siri|#female|-x-sfg|-x-iob|-x-iog|-x-tpc|-x-tpf|-x-gba|-x-gbc/i;
const MALE = /\bmale\b|#male|david|mark|daniel|george|james|alex\b|fred|ryan|guy\b|thomas|oliver|rishi|aaron|liam|connor|arthur|gordon|lee\b|ravi|richard|sean|mike|-x-iom|-x-ism|-x-tpd|-x-gbb|-x-gbd|-x-rjs|-x-iol/i;
const LOCALE_RANK = (l: string) => { const x = l.toLowerCase().replace("_", "-"); return x.startsWith("en-ng") ? 0 : x.startsWith("en-za") ? 1 : x.startsWith("en-gb") ? 2 : x.startsWith("en-ie") || x.startsWith("en-au") ? 3 : x.startsWith("en-in") ? 4 : x.startsWith("en") ? 5 : 99; };

type Gendered = { voice: SpeechSynthesisVoice; g: "m" | "f" | "?" };
let pool: Gendered[] | null = null;
function loadPool(): Gendered[] {
  if (!speechAvailable()) return [];
  if (pool && pool.length) return pool;
  const vs = speechSynthesis.getVoices().filter((v) => LOCALE_RANK(v.lang) < 99);
  pool = vs.sort((a, b) => LOCALE_RANK(a.lang) - LOCALE_RANK(b.lang)).map((v) => ({ voice: v, g: FEMALE.test(v.name + v.voiceURI) && !MALE.test(v.name + v.voiceURI) ? "f" : MALE.test(v.name + v.voiceURI) ? "m" : "?" }));
  return pool;
}
if (speechAvailable()) { try { speechSynthesis.addEventListener("voiceschanged", () => { pool = null; }); } catch { /* old browsers */ } }

/** Voice for a character: a voice of their gender if the device has one (spread over the available ones by name hash). */
export function pickVoice(who: string, gender: "m" | "f"): { voice: SpeechSynthesisVoice | null; exact: boolean } {
  const all = loadPool();
  if (!all.length) return { voice: null, exact: false };
  const same = all.filter((x) => x.g === gender);
  const best = same.length ? same.filter((x) => LOCALE_RANK(x.voice.lang) <= LOCALE_RANK(same[0].voice.lang) + 2) : [];
  if (best.length) return { voice: best[hash(who) % best.length].voice, exact: true };
  // no voice of that gender is known: use a neutral one and rely on pitch to separate the characters
  const unk = all.filter((x) => x.g === "?");
  const any = unk.length ? unk : all;
  return { voice: any[hash(who) % Math.min(any.length, 4)].voice, exact: false };
}

/** Pitch / rate for speech: the character's own, nudged by mood, and widened when we could not find a matching voice. */
export function speechParams(p: VoiceProfile, exact: boolean, mood?: string) {
  let pitch = p.pitch, rate = p.rate;
  if (!exact) pitch = p.gender === "m" ? Math.min(pitch, 0.78) * 0.92 : Math.max(pitch, 1.08);
  if (mood === "angry") { rate *= 1.08; pitch *= 0.92; }
  else if (mood === "sad") { rate *= 0.86; pitch *= 0.9; }
  else if (mood === "laugh") { rate *= 1.1; pitch *= 1.08; }
  return { pitch: Math.max(0.2, Math.min(2, pitch)), rate: Math.max(0.6, Math.min(1.5, rate)) };
}

export class VoiceBox {
  mode: VoiceMode = getVoiceMode();
  private blipI = 0;
  /** true while a line is being spoken (cutscenes wait for it before auto-advancing) */
  busy = false;
  private busyTimer = 0;
  constructor(private audio: GameAudio) {}

  setMode(m: VoiceMode) { this.mode = m; setVoiceMode(m); this.stop(); }
  cycleMode(): VoiceMode {
    const order: VoiceMode[] = speechAvailable() ? ["speech", "blips", "off"] : ["blips", "off"];
    this.setMode(order[(order.indexOf(this.mode) + 1) % order.length]);
    return this.mode;
  }
  stop() { this.busy = false; window.clearTimeout(this.busyTimer); if (speechAvailable()) try { speechSynthesis.cancel(); } catch { /* ignore */ } }

  /** speak a whole line (cutscene dialogue, radio). `say` is the phonetic text for speech engines. */
  speak(who: string, say: string, opts: { mood?: string; radio?: boolean; shown?: string } = {}) {
    if (this.audio.isMuted() || this.mode === "off" || who === "narrator") return;
    const prof = voiceOf(who);
    const radio = opts.radio || prof.filtered;
    if (this.mode === "speech" && speechAvailable()) {
      if (!say.trim()) return; // stage direction only
      try {
        this.stop();
        const { voice, exact } = pickVoice(who, prof.gender);
        const u = new SpeechSynthesisUtterance(say);
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        const sp = speechParams(prof, exact, opts.mood);
        u.pitch = sp.pitch; u.rate = sp.rate; u.volume = radio ? 0.8 : 1;
        if (radio) this.audio.radioClick(true);
        this.busy = true;
        const free = () => { this.busy = false; window.clearTimeout(this.busyTimer); };
        u.onend = free; u.onerror = free;
        window.clearTimeout(this.busyTimer); this.busyTimer = window.setTimeout(free, 2500 + say.length * 110); // some engines never fire onend
        speechSynthesis.speak(u);
        return;
      } catch { /* fall through to blips */ }
    }
    this.babble(who, opts.shown ?? say, opts);
  }

  /** a short burst of synthesised syllables for a whole line (used for radio comms in BLIPS mode) */
  babble(who: string, text: string, opts: { mood?: string; radio?: boolean } = {}) {
    if (this.mode === "off") return;
    const prof = voiceOf(who);
    const letters = text.replace(/[^a-zA-ZẹọṣàáèéìíòóùúńǹĀ-ɏ]/g, "");
    const n = Math.max(3, Math.min(34, Math.round(letters.length / 2.4)));
    this.audio.babble(prof, letters, n, opts.mood, !!(opts.radio || prof.filtered));
  }

  /** typewriter hook: called for each character typed in BLIPS mode (every 2nd letter makes a syllable) */
  typed(who: string, ch: string, mood?: string) {
    if (this.mode !== "blips" || this.audio.isMuted() || who === "narrator") return;
    if (!/[a-zA-ZẹọṣàáèéìíòóùúńǹĀ-ɏ]/.test(ch)) return;
    this.blipI++;
    if (this.blipI % 2) return;
    const prof = voiceOf(who);
    this.audio.syllable(prof, ch, mood, false);
  }
}
