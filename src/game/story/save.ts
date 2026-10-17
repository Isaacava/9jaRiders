// Story progress, stored on the device (works offline).
// seq 2 = the story with the Oshodi / Ajegunle / Makoko / Ikeja / Ikorodu chapters. Older saves are re-pointed at the
// chapter of their first unfinished mission so no progress is lost.
export type StorySave = { v: 1; seq: number; step: number; unlocked: number; cash: number; attempts: Record<string, number>; done: string[]; seen: string[] };
const KEY = "aboki:story:v1";
export const SEQ_VERSION = 2;
/** missions added in seq 2: an old save never played them, so they must not decide where an old save resumes */
const NEW_MISSIONS = new Set(["m_oshodi", "m_ajegunle", "m_makoko", "m_ikeja", "m_ikorodu"]);
const fresh = (): StorySave => ({ v: 1, seq: SEQ_VERSION, step: 0, unlocked: 0, cash: 0, attempts: {}, done: [], seen: [] });

type NodeLike = { type: "chapter" | "cutscene" | "mission"; id?: string };

/** pure: bring an old save in line with the current sequence */
export function migrateSave(s: StorySave, seq: NodeLike[]): StorySave {
  const out: StorySave = { ...fresh(), ...s, done: s.done ?? [], seen: s.seen ?? [] };
  if ((s.seq ?? 1) < SEQ_VERSION) {
    let target = -1;
    for (let i = 0; i < seq.length; i++) if (seq[i].type === "mission" && !NEW_MISSIONS.has(seq[i].id ?? "") && !out.done.includes(seq[i].id ?? "")) { target = i; break; }
    if (target < 0) target = seq.length;
    let chapter = 0;
    for (let i = Math.min(target, seq.length - 1); i >= 0; i--) if (seq[i].type === "chapter") { chapter = i; break; }
    if (s.unlocked > 0 || s.step > 0) out.step = Math.min(chapter, seq.length);
    out.unlocked = Math.min(target, seq.length);
    out.seen = seq.slice(0, Math.min(target, seq.length)).filter((n) => n.type === "cutscene").map((n) => n.id ?? "");
    out.seq = SEQ_VERSION;
  }
  return out;
}

export function loadStory(seq?: NodeLike[]): StorySave {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as StorySave;
    if (!s || s.v !== 1) return fresh();
    return seq ? migrateSave(s, seq) : { ...fresh(), ...s };
  } catch { return fresh(); }
}
export function saveStory(s: StorySave) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full / private mode */ } }
export function resetStory() { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } return fresh(); }
