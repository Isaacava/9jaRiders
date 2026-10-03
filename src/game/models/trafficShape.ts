// Pure (no three.js): smooth blended car bodies with wheel arches and baked window/trim colours.
import { capsule, cylX, rbox, subtract, surfaceNets, union, type MeshData, type SDF, type V3 } from "./sdf";

export type TrafficKind = "danfo" | "sedan" | "keke" | "truck" | "suv";
export const TRAFFIC_SIZE: Record<TrafficKind, { w: number; l: number }> = {
  danfo: { w: 2.0, l: 5.4 },
  sedan: { w: 1.8, l: 4.4 },
  keke: { w: 1.45, l: 2.8 },
  truck: { w: 2.4, l: 7.2 },
  suv: { w: 1.95, l: 4.7 }
};

type RGB = [number, number, number];
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const rgb = (hex: number): RGB => [lin(((hex >> 16) & 255) / 255), lin(((hex >> 8) & 255) / 255), lin((hex & 255) / 255)];
const GLASS = rgb(0x0b1620), TRIM = rgb(0x121316), WHITE: RGB = [1, 1, 1];

export type CarShape = { mesh: MeshData; colors: Float32Array; tintable: boolean };
type Zone = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => RGB;
const CACHE = new Map<TrafficKind, CarShape>();

function wells(xs: number[], zs: number[], y: number, r: number, hw: number): SDF {
  const fs: SDF[] = [];
  for (const x of xs) for (const z of zs) fs.push(cylX(x, y, z, r, hw));
  return union(fs, 0);
}

export function buildCarShape(kind: TrafficKind): CarShape {
  const hit = CACHE.get(kind);
  if (hit) return hit;
  const { w, l } = TRAFFIC_SIZE[kind];
  const hw = w / 2, hl = l / 2;
  let sdf: SDF, zone: Zone, tintable = false, h = 0.05;
  let min: V3, max: V3;

  if (kind === "danfo") {
    const yellow = rgb(0xf2b705);
    const body = union([rbox([0, 0.98, 0], [hw, 0.52, hl], 0.22), rbox([0, 1.86, 0.12], [hw - 0.04, 0.5, hl - 0.28], 0.24)], 0.14);
    sdf = subtract(body, wells([-hw, hw], [-hl + 1.0, hl - 1.0], 0.4, 0.5, 0.3));
    zone = (x, y, z, nx, ny, nz) => {
      if (y < 0.56) return TRIM;
      if (y > 0.9 && y < 1.08 && Math.abs(ny) < 0.6) return TRIM;
      if (y > 1.5 && y < 2.22 && Math.abs(ny) < 0.55 && ((Math.abs(nx) > 0.6 && z > -hl + 0.5 && z < hl - 0.5 && Math.sin(z * 2.4) > -0.82) || (Math.abs(nz) > 0.6 && Math.abs(x) < hw - 0.25))) return GLASS;
      return yellow;
    };
    min = [-hw - 0.2, 0.2, -hl - 0.2]; max = [hw + 0.2, 2.5, hl + 0.2];
  } else if (kind === "sedan" || kind === "suv") {
    const tall = kind === "suv";
    const hull = rbox([0, tall ? 0.98 : 0.7, 0], [hw, tall ? 0.45 : 0.3, hl], 0.26);
    const cab = rbox([0, tall ? 1.65 : 1.18, tall ? 0.38 : 0.3], [hw - (tall ? 0.11 : 0.14), tall ? 0.34 : 0.27, tall ? 1.55 : 1.02], 0.3);
    const wr = tall ? 0.5 : 0.46;
    sdf = subtract(union([hull, cab], 0.42), wells([-hw, hw], [-hl + 0.95, hl - 0.95], tall ? 0.42 : 0.36, wr, 0.26));
    const lo = tall ? 1.36 : 0.96, hi = tall ? 1.98 : 1.4;
    zone = (x, y, z, nx, ny, nz) => {
      if (y < (tall ? 0.56 : 0.44)) return TRIM;
      if (y > lo && y < hi && Math.abs(ny) < 0.7 && Math.abs(z) < (tall ? 1.95 : 1.4)) return GLASS;
      return WHITE;
    };
    tintable = true;
    min = [-hw - 0.2, 0.15, -hl - 0.2]; max = [hw + 0.2, tall ? 2.2 : 1.6, hl + 0.2];
    h = 0.045;
  } else if (kind === "keke") {
    const sun = rgb(0xf5b800), green = rgb(0x1f7a3a);
    const parts: SDF[] = [
      rbox([0, 0.85, 0.25], [hw - 0.08, 0.38, 1.1], 0.22),
      rbox([0, 0.82, -1.05], [0.34, 0.33, 0.4], 0.2),
      rbox([0, 1.76, 0.2], [hw - 0.05, 0.05, 1.15], 0.05),
      rbox([0, 1.58, -1.02], [0.4, 0.04, 0.46], 0.04)
    ];
    for (const sx of [-1, 1]) for (const z of [0.95, -0.6]) parts.push(capsule([sx * 0.62, 1.2, z], [sx * 0.62, 1.74, z], 0.028));
    parts.push(capsule([-0.3, 1.2, -0.78], [-0.34, 1.58, -0.85], 0.025), capsule([0.3, 1.2, -0.78], [0.34, 1.58, -0.85], 0.025));
    sdf = union(parts, 0.04);
    zone = (x, y) => {
      if (y > 1.68) return green;
      if (y > 1.17 && y < 1.62) return TRIM;
      if (y < 0.5) return TRIM;
      return sun;
    };
    min = [-hw - 0.1, 0.2, -hl - 0.1]; max = [hw + 0.1, 1.95, hl + 0.1];
    h = 0.035;
  } else {
    const blue = rgb(0x2756a8), cream = rgb(0xe9e6df);
    const cab = rbox([0, 1.5, -hl + 1.0], [hw, 0.75, 0.95], 0.2);
    const box = rbox([0, 2.0, 1.2], [hw - 0.05, 1.0, (l - 2.5) / 2], 0.1);
    const chassis = rbox([0, 0.78, 1.05], [hw, 0.18, (l - 2.1) / 2], 0.05);
    sdf = subtract(union([cab, box, chassis], 0.05), wells([-hw, hw], [-hl + 1.2, hl - 1.8, hl - 0.8], 0.48, 0.58, 0.3));
    zone = (x, y, z, nx, ny, nz) => {
      if (y < 0.98) return TRIM;
      if (z < -hl + 2.0) {
        if (y > 1.55 && y < 2.05 && ((nz < -0.6 && Math.abs(x) < hw - 0.2) || (Math.abs(nx) > 0.6 && z > -hl + 0.35))) return GLASS;
        return blue;
      }
      return cream;
    };
    min = [-hw - 0.2, 0.2, -hl - 0.2]; max = [hw + 0.2, 3.1, hl + 0.2];
  }

  const mesh = surfaceNets(sdf, min, max, h);
  const colors = new Float32Array(mesh.pos.length);
  for (let v = 0; v < mesh.pos.length / 3; v++) {
    const c = zone(mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2], mesh.nrm[v * 3], mesh.nrm[v * 3 + 1], mesh.nrm[v * 3 + 2]);
    colors[v * 3] = c[0]; colors[v * 3 + 1] = c[1]; colors[v * 3 + 2] = c[2];
  }
  const shape = { mesh, colors, tintable };
  CACHE.set(kind, shape);
  return shape;
}
