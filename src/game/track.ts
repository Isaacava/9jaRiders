// Pure maths (no three.js): a winding route with elevation, mapped from "track space" (lateral x, distance d)
// to world space. All gameplay stays in straight track space; only rendering uses this mapping.
//
// Conventions: forward at heading th is (sin th, 0, -cos th); lateral +x is (cos th, 0, sin th);
// an object that should face forward gets rotation.y = -th.   k > 0 turns LEFT (th decreases).

export type Seg = { len: number; k?: number; rise?: number };
export const S = (len: number, k = 0, rise = 0): Seg => ({ len, k, rise });

export type Frame = { px: number; py: number; pz: number; th: number };

export class Track {
  readonly step = 2;
  readonly length: number; // routed length incl. tail
  private n: number;
  private px: Float32Array; private pz: Float32Array; private th: Float32Array; private py: Float32Array; private kk: Float32Array;

  constructor(segs: Seg[], tail = 600) {
    const all = [...segs, S(tail)];
    const total = all.reduce((a, s) => a + s.len, 0);
    this.length = total;
    const n = (this.n = Math.ceil(total / this.step) + 1);
    // raw curvature + target elevation per sample
    let kRaw = new Float32Array(n), yTarget = new Float32Array(n);
    let d0 = 0, yBase = 0;
    for (const sg of all) {
      const i0 = Math.round(d0 / this.step), i1 = Math.min(n - 1, Math.round((d0 + sg.len) / this.step));
      for (let i = i0; i <= i1; i++) {
        kRaw[i] = sg.k ?? 0;
        const t = i1 === i0 ? 1 : (i - i0) / (i1 - i0);
        yTarget[i] = yBase + (sg.rise ?? 0) * (t * t * (3 - 2 * t));
      }
      yBase += sg.rise ?? 0;
      d0 += sg.len;
    }
    for (let i = Math.round(d0 / this.step) + 1; i < n; i++) yTarget[i] = yBase;
    // smooth curvature so corners ease in and out (3 box-blur passes, ~40 m)
    const blur = (a: Float32Array, w: number) => {
      const out = new Float32Array(a.length), acc = new Float64Array(a.length + 1);
      for (let i = 0; i < a.length; i++) acc[i + 1] = acc[i] + a[i];
      for (let i = 0; i < a.length; i++) { const lo = Math.max(0, i - w), hi = Math.min(a.length - 1, i + w); out[i] = (acc[hi + 1] - acc[lo]) / (hi - lo + 1); }
      return out;
    };
    for (let p = 0; p < 3; p++) kRaw = blur(kRaw, 10);
    this.kk = kRaw;
    this.py = blur(blur(yTarget, 4), 4);
    this.px = new Float32Array(n); this.pz = new Float32Array(n); this.th = new Float32Array(n);
    let th = 0, x = 0, z = 0;
    for (let i = 0; i < n; i++) {
      this.px[i] = x; this.pz[i] = z; this.th[i] = th;
      const thMid = th - kRaw[i] * this.step * 0.5;
      x += Math.sin(thMid) * this.step; z -= Math.cos(thMid) * this.step;
      th -= kRaw[i] * this.step;
    }
  }

  /** Frame (position of the centre line, heading, height) at distance d. Extrapolates straight outside the route. */
  frame(d: number, out: Frame = { px: 0, py: 0, pz: 0, th: 0 }, elev = true): Frame {
    const last = this.n - 1;
    if (d <= 0) {
      const th = this.th[0];
      out.px = this.px[0] + Math.sin(th) * d; out.pz = this.pz[0] - Math.cos(th) * d; out.py = elev ? this.py[0] : 0; out.th = th;
      return out;
    }
    const f = d / this.step;
    if (f >= last) {
      const th = this.th[last], r = d - last * this.step;
      out.px = this.px[last] + Math.sin(th) * r; out.pz = this.pz[last] - Math.cos(th) * r; out.py = elev ? this.py[last] : 0; out.th = th;
      return out;
    }
    const i = Math.floor(f), t = f - i;
    out.px = this.px[i] + (this.px[i + 1] - this.px[i]) * t;
    out.pz = this.pz[i] + (this.pz[i + 1] - this.pz[i]) * t;
    out.th = this.th[i] + (this.th[i + 1] - this.th[i]) * t;
    out.py = elev ? this.py[i] + (this.py[i + 1] - this.py[i]) * t : 0;
    return out;
  }

  curvature(d: number) { return this.kk[Math.max(0, Math.min(this.n - 1, Math.round(d / this.step)))]; }
  /** road height at d (linearly interpolated, so pitch never jumps between samples) */
  height(d: number) {
    const f = Math.max(0, Math.min(this.n - 1, d / this.step)), i = Math.min(this.n - 2, Math.floor(f)), t = f - i;
    return this.py[i] + (this.py[i + 1] - this.py[i]) * t;
  }
  /** road pitch (rad) at d, measured over `span` metres (use the wheelbase for vehicles) */
  pitch(d: number, span = 6) { const a = this.height(d - span / 2), b = this.height(d + span / 2); return Math.atan2(b - a, span); }

  /** world position of track coordinates (x lateral, d distance) with extra height y */
  at(d: number, x: number, y: number, out: { x: number; y: number; z: number }, f: Frame = { px: 0, py: 0, pz: 0, th: 0 }) {
    this.frame(d, f);
    out.x = f.px + Math.cos(f.th) * x; out.z = f.pz + Math.sin(f.th) * x; out.y = f.py + y;
    return out;
  }
}
