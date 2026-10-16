// Story progress, stored on the device (works offline).
export type StorySave = { v: 1; step: number; unlocked: number; cash: number; attempts: Record<string, number>; done: string[] };
const KEY = "aboki:story:v1";
const fresh = (): StorySave => ({ v: 1, step: 0, unlocked: 0, cash: 0, attempts: {}, done: [] });

export function loadStory(): StorySave {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as StorySave;
    return s && s.v === 1 ? { ...fresh(), ...s } : fresh();
  } catch { return fresh(); }
}
export function saveStory(s: StorySave) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full / private mode */ } }
export function resetStory() { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } return fresh(); }
