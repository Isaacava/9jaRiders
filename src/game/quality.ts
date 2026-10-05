// Automatic graphics tiers + a dynamic-resolution governor so low-end phones stay playable.

export type Tier = "low" | "medium" | "high";
export type GfxSetting = "auto" | Tier;

export type Quality = {
  tier: Tier;
  maxDpr: number;      // upper bound for the render pixel ratio
  startDpr: number;
  minDpr: number;
  shadows: boolean;
  shadowSize: number;
  msaa: boolean;
  fogFar: number;      // draw distance
  crowd: number;       // 0..1 density of scenery (pedestrians, kiosks, buildings)
  fpsCap: number;      // 0 = uncapped (display rate); 30 = steady 30 fps for weak GPUs
  detailedRiders: boolean;
  targetMs: number;    // frame-time target used by the resolution governor
};

const KEY = "aboki:gfx";

export function getGfxSetting(): GfxSetting {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "low" || v === "medium" || v === "high" ? v : "auto";
  } catch { return "auto"; }
}
export function setGfxSetting(v: GfxSetting) {
  try { window.localStorage.setItem(KEY, v); } catch { /* ignore */ }
}

let gpuCache: string | null = null;
function gpuName(): string {
  if (gpuCache !== null) return gpuCache;
  gpuCache = "";
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpuCache = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch { /* ignore */ }
  return gpuCache;
}

/** Heuristic device score: higher = weaker device. */
export function autoTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const mem = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const gpu = gpuName().toLowerCase();
  let score = 0;
  if (mem <= 2) score += 3; else if (mem <= 3) score += 2; else if (mem <= 4) score += 1;
  if (cores <= 4) score += 2; else if (cores <= 6) score += 1;
  if (/mali-4|mali-t|adreno \(tm\) ?(3|4|50|51|52|53)|adreno ?(3|4|50|51|52|53)\d|powervr|swiftshader|llvmpipe|mesa|intel\(r\) hd/.test(gpu)) score += 3;
  else if (/mali-g(3|5)\d|adreno \(tm\) ?6[0-2]\d|apple a(9|10|11)\b/.test(gpu)) score += 2;
  if (/android|iphone|ipad|mobile/i.test(navigator.userAgent)) score += 1;
  if (nav.connection?.saveData) score += 2;
  return score >= 5 ? "low" : score >= 3 ? "medium" : "high";
}

export function resolveTier(): { tier: Tier; setting: GfxSetting } {
  const setting = getGfxSetting();
  return { tier: setting === "auto" ? autoTier() : setting, setting };
}

export function qualityFor(tier: Tier, demo: boolean): Quality {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (demo) { // the home-screen preview must be cheap: it sits next to the menu
    return { tier: "low", maxDpr: 1, startDpr: Math.min(dpr, 1), minDpr: 0.6, shadows: false, shadowSize: 512, msaa: false, fogFar: 220, crowd: 0.25, fpsCap: 30, detailedRiders: false, targetMs: 33 };
  }
  if (tier === "low") return { tier, maxDpr: 1, startDpr: Math.min(dpr, 0.85), minDpr: 0.55, shadows: false, shadowSize: 512, msaa: false, fogFar: 240, crowd: 0.3, fpsCap: 30, detailedRiders: false, targetMs: 33 };
  if (tier === "medium") return { tier, maxDpr: 1.5, startDpr: Math.min(dpr, 1.15), minDpr: 0.65, shadows: true, shadowSize: 1024, msaa: false, fogFar: 320, crowd: 0.65, fpsCap: 0, detailedRiders: true, targetMs: 16.7 };
  return { tier, maxDpr: 2, startDpr: Math.min(dpr, 2), minDpr: 0.7, shadows: true, shadowSize: 2048, msaa: true, fogFar: 390, crowd: 1, fpsCap: 0, detailedRiders: true, targetMs: 16.7 };
}

/** Watches frame times and nudges the render resolution down (or back up) to hold the target frame rate. */
export class DynamicRes {
  dpr: number;
  private sum = 0; private n = 0; private t = 0; private cool = 0;
  constructor(private min: number, private max: number, start: number, private targetMs: number) {
    this.dpr = Math.min(max, Math.max(min, start));
  }
  /** dtSeconds = real time between rendered frames. Returns a new pixel ratio when it should change. */
  sample(dtSeconds: number): number | null {
    if (dtSeconds > 0.25) return null; // tab switch / stall, ignore
    this.sum += dtSeconds * 1000; this.n++; this.t += dtSeconds; this.cool -= dtSeconds;
    if (this.t < 1.2) return null;
    const avg = this.sum / this.n;
    this.sum = 0; this.n = 0; this.t = 0;
    if (this.cool > 0) return null;
    if (avg > this.targetMs * 1.25 && this.dpr > this.min) { this.dpr = Math.max(this.min, this.dpr * 0.88); this.cool = 2; return this.dpr; }
    if (avg < this.targetMs * 0.8 && this.dpr < this.max) { this.dpr = Math.min(this.max, this.dpr * 1.06); this.cool = 5; return this.dpr; }
    return null;
  }
}
