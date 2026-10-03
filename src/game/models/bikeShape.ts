// Pure (no three.js): sculpted, smooth bike bodywork built from blended SDF shapes.
import { capsule, chain, surfaceNets, union, type MeshData, type SDF, type V3 } from "./sdf";

export type BikeStyle = "sport" | "street" | "dirt" | "cafe" | "tourer" | "track";

export type Spec = {
  r: number; wb: number; seatY: number; barY: number; barZ: number; barW: number;
  lean: number; fairing?: boolean; bigFairing?: boolean; highFender?: boolean; roundLamp?: boolean;
};

export const SPEC: Record<BikeStyle, Spec> = {
  sport: { r: 0.33, wb: 1.42, seatY: 0.8, barY: 0.98, barZ: -0.46, barW: 0.6, lean: 0.46, fairing: true },
  street: { r: 0.37, wb: 1.45, seatY: 0.9, barY: 1.12, barZ: -0.4, barW: 0.78, lean: 0.14 },
  dirt: { r: 0.42, wb: 1.52, seatY: 0.98, barY: 1.22, barZ: -0.38, barW: 0.84, lean: 0.12, highFender: true },
  cafe: { r: 0.34, wb: 1.4, seatY: 0.82, barY: 0.98, barZ: -0.5, barW: 0.58, lean: 0.38, roundLamp: true },
  tourer: { r: 0.34, wb: 1.52, seatY: 0.85, barY: 1.06, barZ: -0.45, barW: 0.72, lean: 0.22, fairing: true, bigFairing: true },
  track: { r: 0.38, wb: 1.45, seatY: 0.88, barY: 1.05, barZ: -0.42, barW: 0.8, lean: 0.16 }
};

export type BikeParts = { body: MeshData; seat: MeshData; engine: MeshData };
const CACHE = new Map<BikeStyle, BikeParts>();

function arc(cx: number, cy: number, cz: number, R: number, a0: number, a1: number, dirZ: 1 | -1, n = 9): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    pts.push([cx, cy + R * Math.cos(a), cz + dirZ * R * Math.sin(a)]);
  }
  return pts;
}

export function buildBikeParts(style: BikeStyle): BikeParts {
  const hit = CACHE.get(style);
  if (hit) return hit;
  const s = SPEC[style];
  const r = s.r, zF = -s.wb / 2, zR = s.wb / 2, sy = s.seatY;
  const sporty = style === "sport" || style === "cafe";
  const tankLen = style === "cafe" || style === "dirt" ? 0.46 : 0.58;

  const body: SDF[] = [];
  // fuel tank: a swelling teardrop, wider than tall
  body.push(capsule([0, sy + 0.075, zF + 0.4], [0, sy + 0.055, zF + 0.4 + tankLen * 0.58], 0.115, 0.14, 1.2, 1, 1));
  // tail / rear cowl
  if (style === "dirt") body.push(capsule([0, sy + 0.09, zR - 0.55], [0, sy + 0.13, zR + 0.12], 0.085, 0.045, 1.1, 1, 1));
  else body.push(capsule([0, sy + 0.06, zR - 0.5], [0, sy + (sporty ? 0.19 : 0.11), zR + 0.04], 0.105, 0.055, 1.0, 1, 1));
  if (sporty) body.push(capsule([0, sy + 0.09, zR - 0.36], [0, sy + 0.15, zR - 0.1], 0.1, 0.085, 1.0, 0.8, 1)); // seat hump
  // side panels
  if (style !== "dirt") for (const sx of [-1, 1]) body.push(capsule([sx * 0.12, sy - 0.05, zF + 0.95], [sx * 0.1, sy + 0.02, zR - 0.36], 0.055, 0.05));
  else for (const sx of [-1, 1]) body.push(capsule([sx * 0.13, sy - 0.02, zF + 0.9], [sx * 0.1, sy + 0.04, zR - 0.45], 0.05, 0.04));
  // fairing + belly pan
  if (s.fairing) {
    const big = !!s.bigFairing;
    body.push(capsule([0, sy - 0.03, zF + 0.14], [0, sy + 0.05, zF + (big ? 0.72 : 0.64)], big ? 0.17 : 0.14, big ? 0.24 : 0.2, 1.05, 1, 1));
    for (const sx of [-1, 1]) body.push(capsule([sx * 0.16, sy - 0.1, zF + 0.2], [sx * 0.2, sy - 0.03, zF + 0.7], 0.07, 0.1));
    body.push(capsule([0, r + 0.15, -0.34], [0, r + 0.17, 0.18], 0.1, 0.095, 1.5, 1, 1));
  }
  // fenders (smooth arcs over each wheel)
  const hf = s.highFender ? 0.1 : 0;
  body.push(chain(arc(0, r + hf, zF, r + 0.045, -0.2, s.highFender ? 1.15 : 1.3, -1), 0.03, 0.03, 2.2, 1, 1));
  body.push(chain(arc(0, r, zR, r + 0.04, -0.1, 1.1, 1), 0.028, 0.028, 2.0, 1, 1));
  const bodySDF = union(body, 0.05);

  const seatSDF = union([
    capsule([0, sy + 0.0, zR - 0.82], [0, sy + 0.01, zR - 0.34], 0.07, 0.068, 2.1, 0.55, 1),
    capsule([0, sy + 0.012, zR - 0.34], [0, sy + 0.03, zR - 0.12], 0.068, 0.05, 1.7, 0.55, 1)
  ], 0.03);

  const engineSDF = union([
    capsule([0, r + 0.17, 0.0], [0, r + 0.4, -0.12], 0.115, 0.1, 1.25, 1, 1),
    capsule([-0.1, r + 0.17, 0.14], [0.1, r + 0.17, 0.14], 0.09),
    capsule([0, r + 0.15, 0.26], [0, r + 0.2, 0.36], 0.08, 0.07, 1.2, 1, 1)
  ], 0.04);

  const min: V3 = [-0.5, 0.05, zF - 0.05], max: V3 = [0.5, sy + 0.5, zR + 0.2];
  const parts: BikeParts = {
    body: surfaceNets(bodySDF, min, max, 0.02),
    seat: surfaceNets(seatSDF, min, max, 0.016),
    engine: surfaceNets(engineSDF, [-0.3, r, -0.3], [0.3, r + 0.6, 0.5], 0.018)
  };
  CACHE.set(style, parts);
  return parts;
}
