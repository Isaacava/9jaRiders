// Pure (no three.js): builds ONE continuous smooth body mesh per body type from a skeleton,
// computes skin weights for a 17-bone rig, and colours clothing zones.
// Same pipeline as the Blender script (skeleton -> skin -> subdivision -> zones -> auto weights).
import { capsule, ellipsoid, surfaceNets, union, type MeshData, type SDF, type V3 } from "./sdf";

export type RiderLook = {
  outfit: "dashiki" | "crop" | "jacket" | "ankara";
  build: "std" | "tall" | "stocky" | "slim";
  skin: number; hair: number; hairStyle: "afro" | "fade" | "braids" | "cap" | "gele" | "headscarf" | "locs";
  jacket: number; trim: number; pants: number; boots: number;
  shorts: boolean; female: boolean; beard: boolean; hoops: boolean; glasses: boolean; lens: number; tee: boolean;
};

// "main" = the dashiki/afro/beard man and "ada" = the purple-afro/yellow-jacket woman from the character art.
export const RIDER_LOOKS: Record<string, RiderLook> = {
  main: { outfit: "dashiki", build: "std", skin: 0x6b4226, hair: 0x0a0a0a, hairStyle: "afro", jacket: 0x1f3566, trim: 0xd9a21b, pants: 0x27384a, boots: 0x8a5428, shorts: false, female: false, beard: true, hoops: false, glasses: true, lens: 0x3a2a10, tee: true },
  ada: { outfit: "crop", build: "std", skin: 0x8a5a33, hair: 0x5a1f8c, hairStyle: "afro", jacket: 0xf2e03a, trim: 0xffffff, pants: 0xeaeaea, boots: 0x7a2a9a, shorts: true, female: true, beard: false, hoops: true, glasses: true, lens: 0x7a5a30, tee: false },
  kobby: { outfit: "jacket", build: "stocky", skin: 0x3e261c, hair: 0x120d0b, hairStyle: "braids", jacket: 0xd8392f, trim: 0x15161a, pants: 0x1c1d22, boots: 0x2b2b2b, shorts: false, female: false, beard: false, hoops: false, glasses: false, lens: 0x111111, tee: false },
  tobi: { outfit: "jacket", build: "slim", skin: 0x7a5236, hair: 0x15110f, hairStyle: "cap", jacket: 0xf08a38, trim: 0x15161a, pants: 0x2d3a2f, boots: 0x3b2a1c, shorts: false, female: false, beard: false, hoops: false, glasses: true, lens: 0x15110f, tee: false },
  // Ankara-print jacket, orange gele headwrap, slim build
  ngozi: { outfit: "ankara", build: "slim", skin: 0x5a3522, hair: 0xe8731a, hairStyle: "gele", jacket: 0x0e7c86, trim: 0xf2c230, pants: 0x2b4a73, boots: 0xf2f2f2, shorts: false, female: true, beard: false, hoops: true, glasses: false, lens: 0x111111, tee: false },
  // Super-Eagles green and white, tall, close beard
  emeka: { outfit: "jacket", build: "tall", skin: 0x2f1c14, hair: 0x0a0a0a, hairStyle: "fade", jacket: 0x008751, trim: 0xffffff, pants: 0x101214, boots: 0xf2f2f2, shorts: false, female: false, beard: true, hoops: false, glasses: false, lens: 0x111111, tee: false },
  // teal jacket with gold trim, headscarf
  zainab: { outfit: "jacket", build: "std", skin: 0x6e4630, hair: 0xf3efe6, hairStyle: "headscarf", jacket: 0x0e8f8f, trim: 0xd9a21b, pants: 0x1f2a44, boots: 0x3a2a1c, shorts: false, female: true, beard: false, hoops: false, glasses: false, lens: 0x111111, tee: false },
  // locs in a bun, leather jacket, aviator-dark lenses, tall
  chidi: { outfit: "jacket", build: "tall", skin: 0x5b3a24, hair: 0x1a120d, hairStyle: "locs", jacket: 0x6b3f1e, trim: 0xe0a526, pants: 0x20242b, boots: 0x14100c, shorts: false, female: false, beard: true, hoops: false, glasses: true, lens: 0x0d0d0d, tee: false }
};

type R2 = readonly [number, number]; // [half-width x, half-depth z]
type Profile = { s: number; sw: number; hw: number; r: Record<string, R2> };
const MALE_BASE: Profile = {
  s: 1, sw: 0.2, hw: 0.09,
  r: { pelvis: [.175, .115], spine: [.155, .105], chest: [.185, .115], neck: [.052, .052], head: [.092, .1], top: [.03, .03], sh: [.062, .062], el: [.048, .048], wr: [.035, .033], hn: [.032, .013], hp: [.088, .088], kn: [.065, .065], an: [.047, .052], to: [.052, .042] }
};
const FEMALE_BASE: Profile = {
  s: 0.94, sw: 0.17, hw: 0.1,
  r: { pelvis: [.18, .115], spine: [.125, .09], chest: [.148, .1], neck: [.043, .043], head: [.088, .096], top: [.03, .03], sh: [.052, .052], el: [.042, .042], wr: [.03, .028], hn: [.028, .012], hp: [.095, .095], kn: [.06, .06], an: [.042, .047], to: [.047, .037] }
};

const BUILDS = { std: { h: 1, w: 1 }, tall: { h: 1.07, w: 0.96 }, stocky: { h: 0.97, w: 1.16 }, slim: { h: 1.0, w: 0.88 } } as const;
type Build = keyof typeof BUILDS;
export function profile(female: boolean, build: Build): Profile {
  const base = female ? FEMALE_BASE : MALE_BASE, b = BUILDS[build];
  const r: Record<string, R2> = {};
  for (const k of Object.keys(base.r)) {
    const keep = k === "head" || k === "neck" || k === "top"; // heads stay the same size
    r[k] = keep ? base.r[k] : [base.r[k][0] * b.w, base.r[k][1] * (0.5 + 0.5 * b.w)];
  }
  return { s: base.s * b.h, sw: base.sw * (0.4 + 0.6 * b.w), hw: base.hw * (0.5 + 0.5 * b.w), r };
}

// Game space: x right, y up, character faces -z (like the bikes).
export function restJoints(female: boolean, build: Build = "std"): Record<string, V3> {
  const P = profile(female, build);
  const { s, sw, hw } = P;
  const j: Record<string, V3> = { pelvis: [0, .95, 0], spine: [0, 1.18, 0], chest: [0, 1.38, 0], neck: [0, 1.53, 0], head: [0, 1.66, 0], top: [0, 1.79, 0] };
  for (const [k, sx] of [["L", 1], ["R", -1]] as const) {
    const sh: V3 = [sx * sw, 1.45, 0];
    const el: V3 = [sh[0] + sx * .205, sh[1] - .205, 0];
    const wr: V3 = [el[0] + sx * .19, el[1] - .19, 0];
    const hn: V3 = [wr[0] + sx * .075, wr[1] - .075, 0];
    j["sh" + k] = sh; j["el" + k] = el; j["wr" + k] = wr; j["hn" + k] = hn;
    j["hp" + k] = [sx * hw, .92, 0]; j["kn" + k] = [sx * (hw + .01), .49, .01];
    j["an" + k] = [sx * (hw + .01), .085, 0]; j["to" + k] = [sx * (hw + .01), .04, -.16];
  }
  const out: Record<string, V3> = {};
  for (const k of Object.keys(j)) out[k] = [j[k][0] * s, j[k][1] * s, j[k][2] * s];
  return out;
}

export type BoneDef = { name: string; joint: string; child: string; parent: number };
export const BONE_DEFS: BoneDef[] = [
  { name: "pelvis", joint: "pelvis", child: "spine", parent: -1 },
  { name: "spine", joint: "spine", child: "chest", parent: 0 },
  { name: "chest", joint: "chest", child: "neck", parent: 1 },
  { name: "neck", joint: "neck", child: "head", parent: 2 },
  { name: "head", joint: "head", child: "top", parent: 3 },
  { name: "upperArmL", joint: "shL", child: "elL", parent: 2 },
  { name: "foreArmL", joint: "elL", child: "wrL", parent: 5 },
  { name: "handL", joint: "wrL", child: "hnL", parent: 6 },
  { name: "upperArmR", joint: "shR", child: "elR", parent: 2 },
  { name: "foreArmR", joint: "elR", child: "wrR", parent: 8 },
  { name: "handR", joint: "wrR", child: "hnR", parent: 9 },
  { name: "thighL", joint: "hpL", child: "knL", parent: 0 },
  { name: "shinL", joint: "knL", child: "anL", parent: 11 },
  { name: "footL", joint: "anL", child: "toL", parent: 12 },
  { name: "thighR", joint: "hpR", child: "knR", parent: 0 },
  { name: "shinR", joint: "knR", child: "anR", parent: 14 },
  { name: "footR", joint: "anR", child: "toR", parent: 15 }
];
export const B = Object.fromEntries(BONE_DEFS.map((b, i) => [b.name, i])) as Record<string, number>;

const SKEL_EDGES: Array<[string, string]> = [["pelvis", "spine"], ["spine", "chest"], ["chest", "neck"], ["neck", "head"]];
for (const k of "LR") SKEL_EDGES.push(["chest", "sh" + k], ["sh" + k, "el" + k], ["el" + k, "wr" + k], ["wr" + k, "hn" + k], ["pelvis", "hp" + k], ["hp" + k, "kn" + k], ["kn" + k, "an" + k], ["an" + k, "to" + k]);

const key = (n: string) => (/[LR]$/.test(n) ? n.slice(0, -1) : n);

export type RiderShape = {
  female: boolean; build: Build; s: number; sw: number;
  mesh: MeshData; joints: Record<string, V3>;
  skinIndex: Uint16Array; skinWeight: Float32Array;
};

function weightSegments(): Array<{ bone: number; a: string; b: string }> {
  const seg: Array<{ bone: number; a: string; b: string }> = [];
  for (const [i, d] of BONE_DEFS.entries()) seg.push({ bone: i, a: d.joint, b: d.child });
  seg.push({ bone: B.pelvis, a: "pelvis", b: "hpL" }, { bone: B.pelvis, a: "pelvis", b: "hpR" });
  seg.push({ bone: B.chest, a: "chest", b: "shL" }, { bone: B.chest, a: "chest", b: "shR" });
  return seg;
}

function segDist(px: number, py: number, pz: number, a: V3, b: V3) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L2 = dx * dx + dy * dy + dz * dz || 1e-9;
  let t = ((px - a[0]) * dx + (py - a[1]) * dy + (pz - a[2]) * dz) / L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = px - a[0] - dx * t, qy = py - a[1] - dy * t, qz = pz - a[2] - dz * t;
  return Math.sqrt(qx * qx + qy * qy + qz * qz);
}

const CACHE = new Map<string, RiderShape>();

/** Install a pre-baked shape (see pack.ts) so the browser never has to run the slow SDF mesher. */
export function primeRiderShape(female: boolean, build: Build, mesh: MeshData, skinIndex: Uint16Array, skinWeight: Float32Array) {
  const P = profile(female, build);
  CACHE.set(`${female}-${build}`, { female, build, s: P.s, sw: P.sw, mesh, joints: restJoints(female, build), skinIndex, skinWeight });
}

export function buildRiderShape(female: boolean, build: Build = "std"): RiderShape {
  const ck = `${female}-${build}`;
  const hit = CACHE.get(ck);
  if (hit) return hit;
  const P = profile(female, build);
  const J = restJoints(female, build);
  const fs: SDF[] = [];
  for (const [a, b] of SKEL_EDGES) {
    const ra = P.r[key(a)], rb = P.r[key(b)];
    const kz = (ra[1] / ra[0] + rb[1] / rb[0]) / 2;
    fs.push(capsule(J[a], J[b], ra[0] * P.s, rb[0] * P.s, 1, 1, kz));
  }
  // skull: a proper egg-shaped ellipsoid (not a tapered capsule), with a slight jaw
  const hc = J.head;
  fs.push(ellipsoid([hc[0], hc[1] + 0.055 * P.s, hc[2]], 0.088 * P.s, 1, 1.22, 1.1));
  fs.push(capsule([hc[0], hc[1] + 0.0, hc[2] - 0.012 * P.s], [hc[0], hc[1] + 0.03 * P.s, hc[2] - 0.012 * P.s], 0.07 * P.s, 0.08 * P.s, 1, 1, 1.05));
  const body = union(fs, 0.035);
  const mesh = surfaceNets(body, [-0.86, -0.02, -0.3], [0.86, 1.9, 0.3], 0.021);

  const segs = weightSegments();
  const vc = mesh.pos.length / 3;
  const skinIndex = new Uint16Array(vc * 4);
  const skinWeight = new Float32Array(vc * 4);
  const dist = new Float32Array(BONE_DEFS.length);
  const sigma = 0.016;
  for (let v = 0; v < vc; v++) {
    const x = mesh.pos[v * 3], y = mesh.pos[v * 3 + 1], z = mesh.pos[v * 3 + 2];
    dist.fill(9);
    for (const sg of segs) {
      const d = segDist(x, y, z, J[sg.a], J[sg.b]);
      if (d < dist[sg.bone]) dist[sg.bone] = d;
    }
    const order = Array.from(dist.keys()).sort((p, q) => dist[p] - dist[q]).slice(0, 4);
    let sum = 0;
    const w = order.map((bi) => { const e = Math.exp(-(dist[bi] - dist[order[0]]) / sigma); sum += e; return e; });
    for (let k = 0; k < 4; k++) { skinIndex[v * 4 + k] = order[k]; skinWeight[v * 4 + k] = w[k] / sum; }
  }
  const shape: RiderShape = { female, build, s: P.s, sw: P.sw, mesh, joints: J, skinIndex, skinWeight };
  CACHE.set(ck, shape);
  return shape;
}

// ---------------------------------------------------------------- clothing colours
type RGB = [number, number, number];
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const rgb = (hex: number): RGB => [lin(((hex >> 16) & 255) / 255), lin(((hex >> 8) & 255) / 255), lin((hex & 255) / 255)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function riderVertexColors(shape: RiderShape, look: RiderLook): Float32Array {
  const { s, sw } = shape;
  const skin = rgb(look.skin), boot = rgb(look.boots), jacket = rgb(look.jacket), trim = rgb(look.trim), pants = rgb(look.pants);
  const sole = rgb(0x24160d), gold = rgb(0xd9a21b), red = rgb(0xa3212b), white = rgb(0xf2f2f2), belt = rgb(0x1a1a1a);
  const cuffJean = mix(pants, rgb(0x7a95b0), 0.55);
  const out = new Float32Array(shape.mesh.pos.length);
  const hand = sw + 0.38, cuff = sw + 0.31;
  for (let v = 0; v < out.length / 3; v++) {
    const x = shape.mesh.pos[v * 3], y = shape.mesh.pos[v * 3 + 1], nz = shape.mesh.nrm[v * 3 + 2];
    const ax = Math.abs(x) / s, h = y / s;
    let c: RGB;
    if (h < 0.2) c = h < 0.035 ? sole : boot;
    else if (look.outfit === "crop") {
      if (h < 0.7) c = skin;
      else if (h < 0.95) c = pants;
      else if (h < 1.0) c = belt;
      else if (h < 1.14) c = skin;
      else if (h > 1.52 || ax > hand) c = skin;
      else c = jacket;
    } else if (h < 0.97) c = h < 0.26 ? cuffJean : pants;
    else if (h > 1.52 || ax > hand) c = skin;
    else if (look.outfit === "dashiki") {
      if (ax > cuff || h < 1.02) c = gold;
      else if (Math.abs(nz) > 0.4 && h < 1.5 && ax < 0.065 && look.tee) c = white;
      else if (Math.abs(nz) > 0.4 && h < 1.5 && ax < 0.15) c = h > 1.27 && h < 1.4 && ax > 0.075 && ax < 0.125 ? red : gold;
      else {
        const u = (x / s) / 0.055 + (y / s) / 0.11, w = (y / s) / 0.055;
        const fu = u - Math.floor(u) - 0.5, fw = w - Math.floor(w) - 0.5;
        c = Math.abs(fu) + Math.abs(fw) < 0.2 ? gold : jacket;
      }
    } else if (look.outfit === "ankara") {
      if (ax > cuff || h < 1.02) c = trim;
      else {
        const u = (x / s) / 0.1, w = (y / s) / 0.1;
        const dx = u - Math.floor(u) - 0.5, dw = w - Math.floor(w) - 0.5, d = Math.sqrt(dx * dx + dw * dw);
        const u2 = u + 0.5, w2 = w + 0.5, ex = u2 - Math.floor(u2) - 0.5, ew = w2 - Math.floor(w2) - 0.5;
        c = d < 0.2 ? trim : d < 0.3 ? rgb(0xd8392f) : Math.abs(ex) + Math.abs(ew) < 0.16 ? rgb(0xf2f2f2) : jacket;
      }
    } else {
      c = ax > cuff || h < 1.02 || (h > 1.34 && h < 1.39) ? trim : jacket;
    }
    out[v * 3] = c[0]; out[v * 3 + 1] = c[1]; out[v * 3 + 2] = c[2];
  }
  return out;
}
