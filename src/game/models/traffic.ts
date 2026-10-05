import * as THREE from "three";
import { std } from "./util";
import { buildCarShape, TRAFFIC_SIZE, type TrafficKind } from "./trafficShape";
import { toGeometry } from "./geo";
import { mergeStatic } from "./merge";

const BODY_GEO = new Map<TrafficKind, THREE.BufferGeometry>(); // one shared body geometry per kind

export { TRAFFIC_SIZE };
export type { TrafficKind };

const tail = () => new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1a12, emissiveIntensity: 1.2 });

// rounded tyre + alloy rim (lathe profile, axis along X)
function wheel(r: number, w: number) {
  const g = new THREE.Group();
  const prof: THREE.Vector2[] = [];
  const rc = r - w * 0.35; // tyre cross-section: rounded, slightly squared sidewalls
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    prof.push(new THREE.Vector2(rc + w * 0.35 * Math.cos(a), (w / 2) * Math.sin(a)));
  }
  const tireGeo = new THREE.LatheGeometry(prof, 28).rotateZ(Math.PI / 2);
  const t = new THREE.Mesh(tireGeo, std(0x111214, 0.9));
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 18).rotateZ(Math.PI / 2), std(0xaeb3b8, 0.3, 0.9));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.05, 12).rotateZ(Math.PI / 2), std(0x55595e, 0.4, 0.8));
  g.add(t, h, cap);
  return g;
}

export function buildTraffic(kind: TrafficKind, variant = 0): THREE.Group {
  const g = new THREE.Group();
  const { w, l } = TRAFFIC_SIZE[kind];
  const lights = tail();
  const shape = buildCarShape(kind);
  const colors = [0xd9d9d9, 0x1d2b4a, 0x9a1f1f, 0x2b2f33, 0x1d6a46];
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: shape.tintable ? colors[variant % colors.length] : 0xffffff,
    metalness: 0.2, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.12
  });
  let bg = BODY_GEO.get(kind);
  if (!bg) { bg = toGeometry(shape.mesh, shape.colors); BODY_GEO.set(kind, bg); }
  const body = new THREE.Mesh(bg, mat);
  body.castShadow = true;
  g.add(body);

  const box = (bw: number, bh: number, bd: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  const plate = std(0xf5f0d0, 0.6);
  const wheelsAt = (r: number, ww: number, xs: number[], zs: number[]) =>
    xs.forEach((x) => zs.forEach((z) => { const wh = wheel(r, ww); wh.position.set(x, r, z); g.add(wh); }));

  if (kind === "danfo") {
    for (const sx of [-1, 1]) box(0.28, 0.12, 0.05, lights, sx * (w / 2 - 0.25), 0.95, l / 2 + 0.01);
    box(0.6, 0.15, 0.03, plate, 0, 0.7, l / 2 + 0.02);
    wheelsAt(0.4, 0.26, [-w / 2 + 0.1, w / 2 - 0.1], [-l / 2 + 1.0, l / 2 - 1.0]);
  } else if (kind === "sedan" || kind === "suv") {
    const tall = kind === "suv";
    for (const sx of [-1, 1]) box(0.34, 0.1, 0.05, lights, sx * (w / 2 - 0.3), tall ? 1.0 : 0.82, l / 2 + 0.01);
    box(0.5, 0.12, 0.03, plate, 0, tall ? 0.7 : 0.6, l / 2 + 0.02);
    wheelsAt(tall ? 0.42 : 0.36, 0.24, [-w / 2 + 0.08, w / 2 - 0.08], [-l / 2 + 0.95, l / 2 - 0.95]);
  } else if (kind === "keke") {
    box(w - 0.3, 0.1, 0.03, lights, 0, 0.85, l / 2 - 0.03);
    box(0.7, 0.3, 0.02, new THREE.MeshPhysicalMaterial({ color: 0x0f1a22, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6 }), 0, 1.32, -l / 2 + 0.45);
    wheelsAt(0.3, 0.16, [-w / 2 + 0.1, w / 2 - 0.1], [l / 2 - 0.5]);
    const fw = wheel(0.3, 0.16); fw.position.set(0, 0.3, -l / 2 + 0.3); g.add(fw);
  } else {
    for (const sx of [-1, 1]) box(0.3, 0.14, 0.05, lights, sx * (w / 2 - 0.25), 0.85, l / 2 + 0.01);
    wheelsAt(0.48, 0.3, [-w / 2 + 0.1, w / 2 - 0.1], [-l / 2 + 1.2, l / 2 - 1.8, l / 2 - 0.8]);
  }
  mergeStatic(g, (o) => o === body); // wheels + lights: ~20 meshes -> a few
  return g;
}
