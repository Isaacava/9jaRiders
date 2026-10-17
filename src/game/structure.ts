// Flyovers, ramps and bridge decks. Wherever the route climbs off the ground the road used to hang in mid-air
// ("flying" bikes and cars). This builds what holds it up: solid retaining walls on the low ramps, a deck beam with
// piers on the high parts, parapets, an underside and a dark shade patch on the ground below.
import * as THREE from "three";
import type { Track, Frame } from "./track";
import { ribbon, strip, wall } from "./trackMesh";

/** deck sections higher than this stand on piers; lower ones are solid fill with retaining walls */
const OPEN_ABOVE = 3.4;
const BEAM = 1.25;        // deck beam depth
const GROUND = -0.12;     // matches the ground plane

export type Span = { a: number; b: number; open: [number, number][] };

/** Finds the stretches where the road is lifted off the ground (pure helper, also used by the tests). */
export function elevatedSpans(track: Track, d0: number, d1: number, minH = 0.35): Span[] {
  const spans: Span[] = [];
  let cur: Span | null = null, open: [number, number] | null = null;
  for (let d = d0; d <= d1; d += 2) {
    const h = track.height(d);
    if (h > minH) {
      if (!cur) cur = { a: d, b: d, open: [] };
      cur.b = d;
      if (h > OPEN_ABOVE) { if (!open) open = [d, d]; else open[1] = d; }
      else if (open) { cur.open.push(open); open = null; }
    } else if (cur) {
      if (open) { cur.open.push(open); open = null; }
      if (cur.b - cur.a >= 16) spans.push(cur);
      cur = null;
    }
  }
  if (cur) { if (open) cur.open.push(open); if (cur.b - cur.a >= 16) spans.push(cur); }
  return spans;
}

export function buildElevated(group: THREE.Group, track: Track, L: number, roadHalf: number) {
  const spans = elevatedSpans(track, -40, L);
  if (!spans.length) return;
  const W = roadHalf + 2.8; // outer edge of the sidewalk / kerb
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb4afa3, roughness: 0.95, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6f6c66, roughness: 1, side: THREE.DoubleSide });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.7, side: THREE.DoubleSide });
  const shade = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const fascia = (d: number) => { const h = track.height(d); return h <= OPEN_ABOVE ? h - GROUND : BEAM; };
  const f: Frame = { px: 0, py: 0, pz: 0, th: 0 };

  const pierCenters: number[] = [];
  for (const sp of spans) {
    const a = sp.a - 2, b = sp.b + 2;
    let maxH = 0;
    for (let d = sp.a; d <= sp.b; d += 2) maxH = Math.max(maxH, track.height(d));
    for (const sx of [-1, 1] as const) {
      // deck edge: retaining wall on the ramps, a beam on the open stretches
      const wl = wall(track, sx * W, (d) => -fascia(d), GROUND, a, b, concrete, sx);
      wl.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
      group.add(wl);
      // parapet (jersey barrier with a yellow cap) once the deck is clearly above ground
      if (maxH > 0.9) {
        group.add(wall(track, sx * (W - 0.08), 0.2, 0.92, a, b, concrete, -sx as 1 | -1));
        group.add(wall(track, sx * (W - 0.25), 0.2, 0.92, a, b, dark, sx));
        group.add(ribbon(track, sx * (W - 0.3), sx * (W - 0.02) , 0.93, a, b, stripe, 6));
      }
    }
    // underside of the deck + a dark patch on the ground for every open stretch
    for (const [o0, o1] of sp.open) {
      if (o1 - o0 < 8) continue;
      const s0 = o0 - 6, s1 = o1 + 6;
      group.add(strip(track, s0, s1, dark, (d, side, p, n) => {
        track.frame(d, f, true);
        const x = side ? W : -W;
        p.set(f.px + Math.cos(f.th) * x, f.py - BEAM, f.pz + Math.sin(f.th) * x); n.set(0, -1, 0);
      }, 8, false));
      group.add(ribbon(track, -W - 1.5, W + 1.5, GROUND + 0.04, s0 + 4, s1 - 4, shade, 12, false));
      for (let d = Math.ceil(o0 / 15) * 15; d <= o1; d += 15) pierCenters.push(d);
    }
  }
  if (!pierCenters.length) return;

  // piers: two columns + a cap beam, instanced and placed in world space (so they are flagged noBend)
  const colGeo = new THREE.BoxGeometry(1.5, 1, 1.5);
  const capGeo = new THREE.BoxGeometry(W * 2 - 1.2, BEAM * 0.7, 1.7);
  const cols = new THREE.InstancedMesh(colGeo, concrete, pierCenters.length * 2);
  const caps = new THREE.InstancedMesh(capGeo, concrete, pierCenters.length);
  cols.userData.noBend = true; caps.userData.noBend = true;
  cols.castShadow = caps.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  pierCenters.forEach((d, i) => {
    track.frame(d, f, true);
    q.setFromAxisAngle(up, -f.th);
    const top = f.py - BEAM * 0.85;           // underside of the cap beam
    const h = Math.max(0.5, top - GROUND);
    for (const [k, sx] of [-1, 1].entries()) {
      const x = sx * (roadHalf - 1.4);
      pos.set(f.px + Math.cos(f.th) * x, GROUND + h / 2, f.pz + Math.sin(f.th) * x);
      cols.setMatrixAt(i * 2 + k, m.compose(pos, q, sc.set(1, h, 1)));
    }
    pos.set(f.px, f.py - BEAM * 0.5, f.pz);
    caps.setMatrixAt(i, m.compose(pos, q, sc.set(1, 1, 1)));
  });
  cols.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true;
  cols.frustumCulled = false; caps.frustumCulled = false;
  group.add(cols, caps);
}
