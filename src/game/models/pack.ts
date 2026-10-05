// Pre-baked model pack: the smooth rider / bike / car meshes are generated once at build time (scripts/bake-models.ts)
// and shipped as a compact binary file. The browser just decodes it (a few ms) instead of running the SDF mesher
// (0.3-3 s per mesh on low-end phones). Pure code, no three.js.
import type { MeshData } from "./sdf";
import { primeBikeParts, type BikeParts, type BikeStyle } from "./bikeShape";
import { primeRiderShape } from "./riderShape";
import { primeCarShape, type CarShape, type TrafficKind } from "./trafficShape";

export type PackMesh = { name: string; nv: number; nt: number; bbox: number[]; idx32: boolean; pos: number; idx: number; col?: number; si?: number; sw?: number };
export type PackEntry = { key: string; meshes: PackMesh[]; tintable?: boolean };
export type PackManifest = { version: 1; file: string; bytes: number; entries: PackEntry[] };

export type BakeMesh = { name: string; mesh: MeshData; colors?: Float32Array; skinIndex?: Uint16Array; skinWeight?: Float32Array };

const toS = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const toL = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const pad4 = (n: number) => (n + 3) & ~3;

/** Smooth vertex normals from an indexed triangle mesh. */
export function computeNormals(pos: Float32Array, idx: Uint32Array): Float32Array {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // area-weighted
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

export function encodePack(entries: Array<{ key: string; tintable?: boolean; meshes: BakeMesh[] }>): { entries: PackEntry[]; bin: Uint8Array } {
  const chunks: Uint8Array[] = [];
  let off = 0;
  const push = (u: Uint8Array) => { const o = off; const padded = new Uint8Array(pad4(u.byteLength)); padded.set(u); chunks.push(padded); off += padded.byteLength; return o; };
  const out: PackEntry[] = [];
  for (const e of entries) {
    const meshes: PackMesh[] = [];
    for (const bm of e.meshes) {
      const p = bm.mesh.pos, nv = p.length / 3, nt = bm.mesh.idx.length / 3;
      const bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { bbox[k] = Math.min(bbox[k], p[i + k]); bbox[k + 3] = Math.max(bbox[k + 3], p[i + k]); }
      const q = new Int16Array(p.length);
      for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) {
        const span = bbox[k + 3] - bbox[k] || 1;
        q[i + k] = Math.round(((p[i + k] - bbox[k]) / span) * 65535 - 32768);
      }
      const idx32 = nv >= 65536;
      const pm: PackMesh = { name: bm.name, nv, nt, bbox, idx32, pos: push(new Uint8Array(q.buffer)), idx: 0 };
      pm.idx = push(new Uint8Array((idx32 ? bm.mesh.idx : Uint16Array.from(bm.mesh.idx)).buffer));
      if (bm.colors) { const c = new Uint8Array(bm.colors.length); for (let i = 0; i < c.length; i++) c[i] = Math.round(255 * toS(Math.min(1, Math.max(0, bm.colors[i])))); pm.col = push(c); }
      if (bm.skinIndex) { const s = new Uint8Array(bm.skinIndex.length); s.set(bm.skinIndex); pm.si = push(s); }
      if (bm.skinWeight) { const w = new Uint8Array(bm.skinWeight.length); for (let i = 0; i < w.length; i++) w[i] = Math.round(bm.skinWeight[i] * 255); pm.sw = push(w); }
      meshes.push(pm);
    }
    out.push({ key: e.key, meshes, tintable: e.tintable });
  }
  const bin = new Uint8Array(off);
  let o = 0; for (const c of chunks) { bin.set(c, o); o += c.byteLength; }
  return { entries: out, bin };
}

export type Decoded = { mesh: MeshData; colors?: Float32Array; skinIndex?: Uint16Array; skinWeight?: Float32Array };
export function decodeMesh(buf: ArrayBuffer, m: PackMesh): Decoded {
  const q = new Int16Array(buf, m.pos, m.nv * 3);
  const pos = new Float32Array(m.nv * 3);
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = m.bbox[k] + ((q[i + k] + 32768) / 65535) * (m.bbox[k + 3] - m.bbox[k]);
  const idx = m.idx32 ? new Uint32Array(buf.slice(m.idx, m.idx + m.nt * 12)) : Uint32Array.from(new Uint16Array(buf, m.idx, m.nt * 3));
  const d: Decoded = { mesh: { pos, nrm: computeNormals(pos, idx), idx } };
  if (m.col !== undefined) { const c = new Uint8Array(buf, m.col, m.nv * 3); d.colors = new Float32Array(c.length); for (let i = 0; i < c.length; i++) d.colors[i] = toL(c[i] / 255); }
  if (m.si !== undefined) d.skinIndex = Uint16Array.from(new Uint8Array(buf, m.si, m.nv * 4));
  if (m.sw !== undefined) {
    const w = new Uint8Array(buf, m.sw, m.nv * 4); d.skinWeight = new Float32Array(w.length);
    for (let v = 0; v < m.nv; v++) { let s = 0; for (let k = 0; k < 4; k++) s += w[v * 4 + k]; s = s || 1; for (let k = 0; k < 4; k++) d.skinWeight[v * 4 + k] = w[v * 4 + k] / s; }
  }
  return d;
}

/** Decode the whole pack and register every mesh with the matching shape cache. */
export function installPack(man: PackManifest, buf: ArrayBuffer) {
  for (const e of man.entries) {
    const [kind, a, b] = e.key.split(":");
    if (kind === "rider") {
      const d = decodeMesh(buf, e.meshes[0]);
      primeRiderShape(a === "true", b as never, d.mesh, d.skinIndex!, d.skinWeight!);
    } else if (kind === "bike") {
      const parts = {} as Record<string, MeshData>;
      for (const m of e.meshes) parts[m.name] = decodeMesh(buf, m).mesh;
      primeBikeParts(a as BikeStyle, parts as unknown as BikeParts);
    } else if (kind === "car") {
      const d = decodeMesh(buf, e.meshes[0]);
      primeCarShape(a as TrafficKind, { mesh: d.mesh, colors: d.colors!, tintable: !!e.tintable } as CarShape);
    }
  }
}
