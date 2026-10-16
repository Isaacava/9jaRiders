import * as THREE from "three";
import { buildBike } from "../models/bike";
import type { Env } from "../weather";

// Cutscene sets: small procedural Lagos locations. Origin at the centre, default camera looks down -z.
export type StageId = "yard" | "street" | "workshop" | "foodspot" | "club" | "roof" | "oldgarage" | "skyline" | "port";
export type Stage = {
  group: THREE.Group;
  /** point lights that should flicker / glow (bulbs, neon) */
  lights: THREE.PointLight[];
  tick: (dt: number, t: number) => void;
  /** ground colour for the horizon blend */
  floor: number;
};

const M = (c: number, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const E = (c: number, i = 1.4) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: i });
const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; return m;
};
const cyl = (r0: number, r1: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 14) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m;
};
const plane = (w: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m;
};
const bulb = (g: THREE.Group, lights: THREE.PointLight[], x: number, y: number, z: number, color = 0xffd9a0, intensity = 8, dist = 12) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), E(color, 2.5)); b.position.set(x, y, z); g.add(b);
  const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y - 0.05, z); g.add(l); lights.push(l);
  g.add(box(0.02, 4 - y > 0 ? 0.6 : 0.3, 0.02, M(0x111111), x, y, z));
  return l;
};
const label = (text: string, bg: string, fg: string, w = 2.4, h = 0.9) => {
  const c = document.createElement("canvas"); c.width = 512; c.height = Math.round((512 * h) / w);
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 ${Math.round(c.height * 0.5)}px Impact, Arial Black, sans-serif`; g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  return m;
};
/** a row of far buildings as a backdrop */
function skylineBackdrop(g: THREE.Group, z: number, spread: number, seed: number, tall = 1, lit = true) {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const cols = [0xcfc6b4, 0xb9c4c8, 0xddc7a8, 0xa9b4c4, 0xe0b9a8];
  for (let i = 0; i < 26; i++) {
    const w = 5 + rnd() * 7, h = (5 + rnd() * 18) * tall, x = -spread + (i / 25) * spread * 2;
    const b = box(w, h, 6, M(cols[Math.floor(rnd() * cols.length)], 0.95), x, 0, z - rnd() * 6);
    g.add(b);
    if (lit) for (let k = 0; k < 6; k++) g.add(box(0.7, 0.9, 0.1, E(0xffd58a, 1.1 + rnd()), x - w / 2 + 0.8 + rnd() * (w - 1.6), 1.5 + rnd() * (h - 2.5), z + 3.05 - rnd() * 6));
  }
}
const palm = (g: THREE.Group, x: number, z: number) => {
  g.add(cyl(0.12, 0.2, 5, M(0x6b5a45), x, 0, z, 8));
  for (let k = 0; k < 6; k++) { const f = box(2.2, 0.06, 0.5, M(0x2f7a37), x, 5, z); f.rotation.y = (k / 6) * Math.PI * 2; f.rotation.z = 0.25; f.position.x += Math.cos(f.rotation.y) * 0.9; f.position.z -= Math.sin(f.rotation.y) * 0.9; g.add(f); }
};

export function buildStage(id: StageId, env: Env): Stage {
  const g = new THREE.Group();
  const lights: THREE.PointLight[] = [];
  const ticks: Array<(dt: number, t: number) => void> = [];
  let floor = 0x6d6a63;
  const night = env.time === "night" || env.time === "dusk";

  const ground = (color: number, size = 120) => g.add(plane(size, size, M(color, 0.95), 0, 0, 0));
  const kerbedRoad = (z: number, depth = 9) => {
    g.add(plane(80, depth, M(0x2a2b2e, 0.9), 0, 0.01, z));
    for (let x = -36; x < 36; x += 5) g.add(plane(2.4, 0.18, M(0xe9e4cf, 0.8), x, 0.02, z));
    g.add(box(80, 0.2, 0.5, M(0xf2b705), 0, 0, z + depth / 2));
    g.add(box(80, 0.2, 0.5, M(0xf2b705), 0, 0, z - depth / 2));
  };
  const movingVehicle = (z: number, color: number, speed: number, w = 2, h = 2.4, l = 5) => {
    const v = new THREE.Group();
    v.add(box(l, h * 0.55, w, M(color, 0.5, 0.2), 0, 0.5, 0), box(l * 0.7, h * 0.4, w * 0.95, M(color, 0.5, 0.2), 0, 0.5 + h * 0.5, 0), box(l * 0.7, 0.4, w * 0.96, M(0x0d1620, 0.1), 0, 0.5 + h * 0.62, 0));
    v.add(box(0.2, 0.18, w * 0.8, E(0xff2a1a, 1.4), -l / 2, 0.9, 0));
    v.position.set(-40, 0, z); g.add(v);
    ticks.push((dt) => { v.position.x += speed * dt; if (v.position.x > 40) v.position.x = -40; });
  };

  if (id === "yard") { // Aboki + Kelechi's compound: zinc-roof garage, a patched bike, tyres, drums
    floor = 0x7a6b55; ground(0x8a7a60);
    g.add(box(8, 0.12, 6, M(0x9a9387), 0, 0, -1)); // concrete pad
    for (const sx of [-1, 1]) g.add(box(0.2, 3.2, 5.6, M(0xd8cfba, 0.95), sx * 4.1, 0, -1));
    g.add(box(8.4, 0.12, 6.2, M(0x9aa0a6, 0.4, 0.7), 0, 3.2, -1.1)); // zinc roof
    g.add(box(8, 3.2, 0.2, M(0xcbb99a, 0.95), 0, 0, -4)); // back wall
    const wb = box(2.8, 0.9, 0.9, M(0x6b4a2b), -2.6, 0, -3.4); g.add(wb);
    for (let i = 0; i < 5; i++) g.add(box(0.12 + (i % 2) * 0.1, 0.1, 0.5, M(0x303338, 0.4, 0.8), -3.5 + i * 0.5, 0.9, -3.4));
    const bike = buildBike("street", 0x9a3b2f, 0x2b2b2b); bike.root.position.set(1.8, 0, -1.5); bike.root.rotation.y = -0.9; g.add(bike.root);
    for (let i = 0; i < 4; i++) g.add(cyl(0.34, 0.34, 0.22, M(0x151515, 0.95), 3.1, i * 0.22, 0.3, 16));
    g.add(cyl(0.4, 0.4, 0.95, M(0x2756a8, 0.5, 0.4), -3.4, 0, 0.8), cyl(0.4, 0.4, 0.95, M(0xc23a2f, 0.5, 0.4), -2.7, 0, 1.1));
    const sign = label("KELECHI AUTO CARE", "#2756a8", "#ffd24d", 3.4, 0.8); sign.position.set(0, 3.5, -3.85); g.add(sign);
    bulb(g, lights, 0, 2.9, -1.2, 0xffe2a8, night ? 14 : 5, 14);
    ground(0x8a7a60); kerbedRoad(9, 8);
    movingVehicle(9, 0xf2b705, 7);
    skylineBackdrop(g, -16, 40, 11);
    palm(g, 6.5, 2); palm(g, -7, 3);
  } else if (id === "street") { // roadside junction: lamp, kiosk, danfo parked
    floor = 0x3a3b3e; ground(0x9a9487);
    g.add(plane(70, 11, M(0x2a2b2e, 0.88), 0, 0.01, 2));
    for (let x = -30; x < 30; x += 5) g.add(plane(2.4, 0.18, M(0xe9e4cf, 0.8), x, 0.02, 2));
    g.add(box(70, 0.22, 3, M(0xb7b2a6), 0, 0, -5.2)); g.add(box(70, 0.22, 0.45, M(0xf2b705), 0, 0, -3.65));
    const lamp = cyl(0.07, 0.1, 7, M(0x2b2e33, 0.5, 0.6), -4.5, 0, -4.2); g.add(lamp); g.add(box(1.6, 0.14, 0.4, E(0xffe9b0, night ? 3 : 0.6), -3.8, 7, -4.2));
    if (night) { const l = new THREE.PointLight(0xffd9a0, 30, 16, 1.5); l.position.set(-3.8, 6.8, -4.1); g.add(l); lights.push(l); }
    g.add(box(2.6, 2.4, 2.4, M(0xe3c7a0, 0.9), 5, 0, -7), box(3, 0.16, 2.8, M(0x8c8f93, 0.4, 0.7), 5, 2.4, -7));
    const ks = label("POS · 24/7", "#1f7a3a", "#ffffff", 2.2, 0.9); ks.position.set(5, 1.6, -5.75); g.add(ks);
    const dan = new THREE.Group(); dan.add(box(5.4, 1.4, 2.1, M(0xf2b705, 0.5, 0.2), 0, 0.5, 0), box(4.8, 1, 2, M(0xf2b705, 0.5, 0.2), 0, 1.9, 0), box(5.45, 0.18, 2.12, M(0x15161a), 0, 1.3, 0), box(4.6, 0.6, 2.02, M(0x0d1620, 0.1), 0, 2.1, 0));
    dan.position.set(-10, 0, -1.2); g.add(dan);
    movingVehicle(4.5, 0x2756a8, -5);
    skylineBackdrop(g, -14, 45, 21);
    palm(g, 9, -6.5);
  } else if (id === "workshop") { // Boss's workshop: big hall with generators, bikes, shelves, hanging bulbs
    floor = 0x55544f;
    g.add(plane(40, 30, M(0x5d5b55, 0.7), 0, 0, -2));
    g.add(box(40, 7, 0.4, M(0xc9c2b2, 0.95), 0, 0, -16)); g.add(box(0.4, 7, 30, M(0xc9c2b2, 0.95), -20, 0, -2)); g.add(box(0.4, 7, 30, M(0xc9c2b2, 0.95), 20, 0, -2));
    g.add(box(40, 0.3, 30, M(0x7b7f84, 0.4, 0.6), 0, 7, -2));
    for (const x of [-12, -4, 4, 12]) { g.add(box(0.6, 7, 0.6, M(0x8a8a86, 0.9), x, 0, -6)); }
    for (const [x, z, c] of [[-15, -12, 0xd8392f], [15, -12, 0x2756a8]] as const) {
      g.add(box(2.6, 1.8, 1.4, M(c, 0.6, 0.3), x, 0, z)); g.add(cyl(0.12, 0.12, 2.4, M(0x333333, 0.5, 0.7), x + 0.9, 1.8, z, 8));
    }
    const styles = ["sport", "street", "cafe", "dirt", "tourer"] as const;
    styles.forEach((st, i) => { const b = buildBike(st, [0x2b6cb0, 0xc23a2f, 0x1f7a3a, 0xf08a38, 0x8d2fa0][i], 0x15161a); b.root.position.set(-14 + i * 5.5, 0.35, -9.5 - (i % 2) * 2.2); b.root.rotation.y = 0.5 + i * 0.6; g.add(b.root); g.add(box(1, 0.35, 2.2, M(0x3a3a3a, 0.6, 0.5), b.root.position.x, 0, b.root.position.z, b.root.rotation.y)); });
    for (let i = 0; i < 4; i++) { g.add(box(5, 0.1, 0.9, M(0x6b4a2b), -17 + i * 0.001, 1 + i * 0.9, -13)); }
    g.add(box(3.4, 1.1, 1.5, M(0x4a3020, 0.7), 11, 0, -4)); g.add(box(0.6, 0.5, 0.6, M(0x111111, 0.4), 11.5, 1.1, -4)); // desk
    const sign2 = label("BOSS GARAGE · LAGOS", "#15161a", "#f5b800", 6, 1.1); sign2.position.set(0, 5.4, -15.7); g.add(sign2);
    for (const x of [-12, -4, 4, 12]) bulb(g, lights, x, 5.8, -5, 0xffd9a0, 9, 14);
    const door = box(9, 5.4, 0.2, E(night ? 0x223355 : 0xfff2d0, 0.9), 0, 0, 14.2); door.position.z = 14; g.add(door);
    ticks.push((_, t) => { lights[1].intensity = 9 + Math.sin(t * 17) * 0.6 * (Math.sin(t * 0.7) > 0.8 ? 4 : 0.1); });
  } else if (id === "foodspot") { // Mama Put: umbrella, plastic chairs, pots on charcoal
    floor = 0x8a7f6a; ground(0x9a8f78);
    g.add(plane(70, 8, M(0x2a2b2e, 0.88), 0, 0.01, 8));
    const um = new THREE.Mesh(new THREE.ConeGeometry(2.6, 0.9, 12), M(0xd8392f, 0.8)); um.position.set(0, 3.1, -1); um.castShadow = true; g.add(um); g.add(cyl(0.05, 0.05, 3, M(0x2b2e33), 0, 0, -1, 8));
    g.add(box(3.4, 0.1, 1.2, M(0xe9e4d8, 0.7), 0, 0.82, -1.5), ...[-1.4, 1.4].map((x) => box(0.1, 0.82, 0.1, M(0x2b2e33), x, 0, -1.5)));
    for (const [x, z, r] of [[-2, 0.1, 0.1], [0, 0.4, 0], [2, 0.1, -0.1], [-1, -3, 0.3], [1.4, -3, -0.3]] as const) { g.add(box(0.5, 0.05, 0.5, M(0xf2f2f2, 0.6), x, 0.45, z, r), box(0.5, 0.45, 0.05, M(0xf2f2f2, 0.6), x, 0.45, z - 0.25, r), ...[[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].map(([a, b]) => box(0.04, 0.45, 0.04, M(0xf2f2f2), x + a, 0, z + b, r))); }
    for (let i = 0; i < 3; i++) { g.add(cyl(0.34, 0.3, 0.4, M(0x8c8f93, 0.4, 0.8), -1.3 + i * 0.9, 0.82, -1.5)); g.add(cyl(0.3, 0.3, 0.04, E(0xff6a1a, 1.2), -1.3 + i * 0.9, 0.84, -1.5)); }
    const glow = new THREE.PointLight(0xff7a2a, 10, 6, 1.6); glow.position.set(0, 1.2, -1.5); g.add(glow); lights.push(glow);
    ticks.push((_, t) => { glow.intensity = 9 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3); });
    g.add(box(3.4, 1.5, 0.4, M(0xe3c7a0), -6, 0, -6), box(3.8, 0.16, 1, M(0x8c8f93, 0.4, 0.7), -6, 1.5, -6));
    const mp = label("MAMA PUT · RICE & STEW", "#1f7a3a", "#ffffff", 2.8, 0.7); mp.position.set(0, 3.6, -1); mp.rotation.y = 0; mp.position.z = -2.4; g.add(mp);
    palm(g, 7, -3); palm(g, -8, -5);
    skylineBackdrop(g, -22, 50, 33, 0.8);
    movingVehicle(8, 0xf2b705, 6);
    bulb(g, lights, 0, 3.2, 0, 0xffe0a0, night ? 10 : 2, 9);
  } else if (id === "club") { // nightlife exterior: neon sign, rope, parked bikes, wet street
    floor = 0x1d1b26; ground(0x24222c);
    g.add(plane(70, 8, M(0x1a1b20, 0.25, 0.2), 0, 0.01, 6));
    g.add(box(16, 9, 6, M(0x2a2336, 0.9), 0, 0, -8)); g.add(box(5, 3, 0.4, E(0x331a44, 0.6), 0, 0, -4.9));
    const neon = label("OS LOUNGE", "#12060f", "#ff2d95", 6, 1.5); neon.position.set(0, 6.8, -4.95); g.add(neon);
    for (const [c, x] of [[0xff2d95, -6], [0x24e0ff, 6], [0xffb02e, -3], [0x9b5cff, 3]] as const) { const l = new THREE.PointLight(c, 22, 14, 1.5); l.position.set(x, 3.5, -3); g.add(l); lights.push(l); g.add(box(0.2, 3.4, 0.2, E(c, 2.2), x, 0.3, -4.7)); }
    g.add(box(0.1, 0.9, 3.2, M(0x8a1a2a), 0, 0, -3), box(0.08, 0.08, 3.2, M(0xd9a21b, 0.3, 0.8), 0, 0.9, -3));
    (["sport", "street", "cafe"] as const).forEach((st, i) => { const b = buildBike(st, [0xff2d95, 0x24e0ff, 0xffb02e][i], 0x111111); b.root.position.set(-8 + i * 2.2, 0, 1 + i * 0.4); b.root.rotation.y = 1.2 - i * 0.2; g.add(b.root); });
    for (let i = 0; i < 12; i++) g.add(box(0.12, 0.12, 0.12, E([0xff2d95, 0x24e0ff, 0xffd24d][i % 3], 2.2), -6 + i, 4.6 + Math.sin(i) * 0.3, -2));
    skylineBackdrop(g, -22, 50, 44, 1.4);
    ticks.push((_, t) => { lights[0].intensity = 20 + Math.sin(t * 9) * 3 + (Math.sin(t * 2.1) > 0.97 ? -14 : 0); lights[2].intensity = 20 + Math.sin(t * 6.3) * 3; });
  } else if (id === "roof") { // rooftop at night: parapet, water tank, antenna, lit skyline
    floor = 0x2a2d34;
    g.add(box(30, 0.6, 24, M(0x6e6f73, 0.85), 0, -0.6, -4));
    g.add(box(30, 1, 0.4, M(0x7e7f82, 0.85), 0, 0, -16), box(0.4, 1, 24, M(0x7e7f82, 0.85), -15, 0, -4), box(0.4, 1, 24, M(0x7e7f82, 0.85), 15, 0, -4));
    g.add(cyl(1.6, 1.6, 2.4, M(0x2c4d6b, 0.5, 0.4), -9, 0, -10), box(0.1, 6, 0.1, M(0x333333), 9, 0, -12), box(1.4, 2.4, 1.4, M(0x8d8f93, 0.9), 11, 0, -8));
    g.add(plane(60, 40, M(0x0b0e16, 1), 0, -10, -30));
    skylineBackdrop(g, -40, 60, 55, 2.2);
    bulb(g, lights, 11, 2.8, -6.8, 0xff7755, 10, 9);
    const l2 = new THREE.PointLight(0x5577ff, 12, 22, 1.5); l2.position.set(0, 5, 4); g.add(l2); lights.push(l2);
  } else if (id === "oldgarage") { // dim shed with a covered bike: father's old garage
    floor = 0x4a463e; ground(0x4a463e, 40);
    g.add(box(8, 3.2, 0.2, M(0x8a7e68, 0.95), 0, 0, -4), box(0.2, 3.2, 6, M(0x8a7e68, 0.95), -4, 0, -1), box(0.2, 3.2, 6, M(0x8a7e68, 0.95), 4, 0, -1), box(8.4, 0.12, 6.4, M(0x7b7f84, 0.4, 0.6), 0, 3.2, -1));
    const cover = box(2.4, 1.1, 0.9, M(0x5b6a7a, 0.95), 0, 0, -2.4); g.add(cover);
    const b = buildBike("cafe", 0x6b3a2a, 0x222222); b.root.position.set(2.2, 0, -2.6); b.root.rotation.y = 0.3; g.add(b.root);
    g.add(box(3, 1, 0.8, M(0x5a3d22), -2.6, 0, -3.5), box(0.5, 0.5, 0.5, M(0x303338, 0.5, 0.7), -2.6, 1, -3.5));
    g.add(box(0.5, 1.4, 0.04, M(0x2a2a2a), 3.9, 1.0, -2.5)); // framed photo
    bulb(g, lights, 0, 2.7, -1.5, 0xffc880, 9, 10);
    ticks.push((_, t) => { lights[0].intensity = 8.5 + Math.sin(t * 31) * 0.5 + (Math.sin(t * 1.3) > 0.9 ? -4 : 0); });
  } else if (id === "port") { // container yard where the black box is hidden
    floor = 0x2c2f33; ground(0x2f3236, 90);
    g.add(plane(90, 90, M(0x1d2024, 0.3, 0.2), 0, 0.01, 0));
    const cols = [0xb23a2f, 0x2a5aa8, 0xd98a2b, 0x2f7a4a, 0x8d9aa3, 0x6b4a8d];
    for (let i = 0; i < 26; i++) { const x = -22 + (i % 9) * 5.4, z = -14 - Math.floor(i / 9) * 6.6; for (let lv = 0; lv < 1 + (i % 3); lv++) g.add(box(2.5, 2.6, 12, M(cols[(i * 5 + lv) % cols.length], 0.7, 0.2), x, lv * 2.65, z, Math.PI / 2 * (i % 2))); }
    const open = box(2.6, 2.7, 6, M(0x6b4a8d, 0.7, 0.2), 0, 0, -3); g.add(open);
    g.add(box(2.2, 0.2, 5.6, E(0xfff0c0, 0.7), 0, 2.6, -3)); // lit interior
    const bb = box(0.62, 0.36, 0.42, M(0x0b0b0e, 0.3, 0.6), 0, 0.9, -1.6); g.add(bb);
    g.add(box(0.06, 0.06, 0.06, E(0xff2a2a, 3), 0.2, 1.3, -1.4));
    const crane = M(0xe2b020, 0.6, 0.3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.9, 26, 0.9, crane, sx * 11, 0, -26 + sz * 4));
    g.add(box(26, 1.8, 3, crane, 0, 26, -26));
    bulb(g, lights, -3.5, 5.5, 1, 0xffe0a0, night ? 16 : 6, 16);
    const pl = new THREE.PointLight(0xfff0c0, 12, 9, 1.6); pl.position.set(0, 2.2, -2.8); g.add(pl); lights.push(pl);
    ticks.push((_, t) => { lights[0].intensity = 15 + Math.sin(t * 23) * 0.4; });
  } else { // skyline: ground + a wide lit city, used for endings
    floor = 0x3a3b3e; ground(0x6d7a5a, 200);
    skylineBackdrop(g, -40, 90, 77, 1.6);
    skylineBackdrop(g, -70, 120, 88, 2.4);
    g.add(box(40, 0.4, 8, M(0xb7b2a6), 0, 0, -6));
    g.add(plane(40, 6, M(0x2a2b2e, 0.88), 0, 0.42, -6));
    palm(g, 12, -2); palm(g, -12, -3);
  }
  const tick = (dt: number, t: number) => { for (const f of ticks) f(dt, t); };
  return { group: g, lights, tick, floor };
}
