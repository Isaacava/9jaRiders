import * as THREE from "three";
import { mulberry32, std } from "./models/util";
import { buildBoostPads, buildLagos, type BoostPad } from "./lagos";
import { Track } from "./track";
import { inWater, themeAt, type MapDef, type Theme } from "./maps";
import { bendWorld, ribbon, wall } from "./trackMesh";

export const GOAL = 5000;
export const LANE_W = 2.4;
export const ROAD_HALF = 6;
export const laneX = (i: number) => (i - 2) * LANE_W;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function roadTexture() {
  const [c, g] = canvas(512, 1024); // 12m x 24m
  g.fillStyle = "#3a3c3f"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 26000; i++) {
    const v = 40 + Math.random() * 40;
    g.fillStyle = `rgba(${v},${v},${v + 3},${Math.random() * 0.5})`;
    g.fillRect(Math.random() * 512, Math.random() * 1024, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 40; i++) { // patches & cracks
    g.strokeStyle = `rgba(20,20,22,${0.2 + Math.random() * 0.3})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); let x = Math.random() * 512, y = Math.random() * 1024; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); }
    g.stroke();
  }
  // tyre wear bands per lane
  for (let l = 0; l < 5; l++) for (const o of [-0.35, 0.35]) {
    const x = ((l + 0.5) / 5) * 512 + o * (512 / 5) * 0.5;
    const gr = g.createLinearGradient(x - 20, 0, x + 20, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(0,0,0,0.16)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - 20, 0, 40, 1024);
  }
  const px = 512 / 12;
  g.fillStyle = "#e8e4d4";
  for (let l = 1; l < 5; l++) { // dashed lane lines
    const x = (l * LANE_W) * px;
    for (let y = 0; y < 1024; y += 170) g.fillRect(x - 3, y, 6, 85);
  }
  g.fillStyle = "#f2c230"; // edge lines
  g.fillRect(8, 0, 7, 1024); g.fillRect(512 - 15, 0, 7, 1024);
  return tex(c);
}

function groundTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#9a7650"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? `rgba(140,100,60,${Math.random() * 0.5})` : `rgba(80,95,50,${Math.random() * 0.35})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  return tex(c, [60, 400]);
}

function windowTexture() {
  // diffuse facade + matching emissive map (random lit windows) so the same buildings work day and night
  const [c, g] = canvas(128, 256);
  const [c2, g2] = canvas(128, 256);
  g.fillStyle = "#cfc8bb"; g.fillRect(0, 0, 128, 256);
  g2.fillStyle = "#000"; g2.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 250; y += 36) for (let x = 10; x < 120; x += 30) {
    const dark = Math.random() > 0.15;
    g.fillStyle = dark ? "#27343f" : "#c9a54a";
    g.fillRect(x, y, 18, 22);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, y, 18, 4);
    if (Math.random() > 0.45) { g2.fillStyle = Math.random() > 0.3 ? "#ffd58a" : "#bfe3ff"; g2.fillRect(x, y, 18, 22); }
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 256, 3, 3); }
  return { map: tex(c), lit: tex(c2) };
}

function glowTexture() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.25, "rgba(255,214,140,0.55)"); gr.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return tex(c);
}

function skyTexture() {
  const [c, g] = canvas(32, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#3a6aa8"); gr.addColorStop(0.4, "#8fb0d0"); gr.addColorStop(0.49, "#f4d9ae"); gr.addColorStop(0.53, "#f2b97a"); gr.addColorStop(0.6, "#e6c9a0"); gr.addColorStop(1, "#c9a67a");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 512);
  return tex(c);
}

function billboardTexture(text: string, bg: string, fg: string) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg; g.font = "900 62px Impact, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const words = text.split(" ");
  words.forEach((w, i) => g.fillText(w, 256, 256 / 2 + (i - (words.length - 1) / 2) * 70));
  g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(10, 10, 492, 236);
  return tex(c);
}

export type World = {
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  sky: THREE.Mesh;
  track: Track;
  map: MapDef;
  /** where the sun sits relative to the player (set by the weather / time-of-day system) */
  sunOffset: THREE.Vector3;
  /** pass WORLD coordinates of the player */
  followPlayer: (wx: number, wz: number) => void;
  pads: BoostPad[];
  tick: (dt: number, time: number) => void;
  /** materials the weather system drives (night windows, lamp glow, wet road...) */
  mats: { road: THREE.MeshStandardMaterial; windows: THREE.MeshStandardMaterial; lampHead: THREE.MeshStandardMaterial; glow: THREE.PointsMaterial; pools: THREE.MeshBasicMaterial; neon: THREE.MeshBasicMaterial; water: THREE.MeshStandardMaterial | null };
};

export type WorldOpts = { map: MapDef; crowd?: number; shadows?: boolean; shadowSize?: number };

type ThemeParams = { step: number; cls: [number, number, number, number]; gap: number; gapVar: number; palette: number[]; poles: boolean; lamps: number; palms: number; umbrellas: number; neon: number };
const PAL = {
  warm: [0xd9cdb8, 0xc8d4cf, 0xe3c7a0, 0xb7c0d3, 0xe6b8a8, 0xd8d8c4, 0xa9c4a0, 0xf0d890],
  glass: [0x7fa7c4, 0x8fb2c9, 0x6f8fb0, 0x9fbad0, 0xaac3d6, 0x86a0b8],
  night: [0x4a3d63, 0x2f4a5c, 0x5b3a52, 0x39495f, 0x6a4b3a, 0x33403f],
  port: [0xb9b3a4, 0x9aa3a8, 0xc7bba2, 0xa6aeb6]
};
const THEME: Record<Theme, ThemeParams> = {
  mainland: { step: 13, cls: [0.45, 0.4, 0.15, 0], gap: 11.8, gapVar: 8, palette: PAL.warm, poles: true, lamps: 50, palms: 70, umbrellas: 44, neon: 0 },
  market: { step: 9, cls: [0.8, 0.2, 0, 0], gap: 10.2, gapVar: 3, palette: PAL.warm, poles: true, lamps: 60, palms: 140, umbrellas: 16, neon: 0 },
  island: { step: 15, cls: [0.1, 0.25, 0.3, 0.35], gap: 13, gapVar: 9, palette: PAL.glass, poles: false, lamps: 38, palms: 36, umbrellas: 400, neon: 0 },
  nightlife: { step: 12, cls: [0.15, 0.45, 0.3, 0.1], gap: 11, gapVar: 5, palette: PAL.night, poles: false, lamps: 34, palms: 60, umbrellas: 400, neon: 0.55 },
  port: { step: 40, cls: [0.5, 0.3, 0.2, 0], gap: 16, gapVar: 12, palette: PAL.port, poles: true, lamps: 70, palms: 400, umbrellas: 400, neon: 0 }
};

export function buildWorld(scene: THREE.Scene, opts: WorldOpts): World {
  const map = opts.map;
  const GOAL = map.length;
  const crowd = Math.max(0.25, Math.min(1, opts.crowd ?? 1));
  const rnd = mulberry32(map.id.length * 131 + GOAL);
  const track = new Track(map.segs);
  const L = GOAL + 600; // built length along the route
  const group = new THREE.Group();
  scene.add(group);
  const water = (d: number, pad = 0) => inWater(map, d, pad);
  const themeOf = (d: number) => themeAt(map, d);
  const flat = new THREE.Matrix4();
  void flat;

  // ---- lights (the weather system retunes these)
  const hemi = new THREE.HemisphereLight(0xffe6c4, 0x8a6b4c, 0.95);
  hemi.userData.noBend = true; group.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd29a, 3.3);
  sun.userData.noBend = true;
  sun.castShadow = opts.shadows ?? true;
  const sm = opts.shadowSize ?? 2048;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -18; sc.right = 18; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  sun.target.userData.noBend = true;
  group.add(sun, sun.target);

  // ---- sky dome (texture is replaced by the weather system); radius is scaled to the camera far plane by the caller
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  // ---- ground: a big tile that follows the player (snapped to the texture period so it never visibly slides)
  const groundTex = groundTexture();
  groundTex.repeat.set(1800 / 15, 1800 / 15);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), std(0xffffff, 1, 0, { map: groundTex }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.12, 0); ground.receiveShadow = true;
  ground.userData.noBend = true;
  group.add(ground);

  // ---- road surface, sidewalks, drains, kerb faces and flyover embankments: ribbons that follow the route
  const rt = roadTexture();
  rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
  const roadMat = std(0xffffff, 0.88, 0.02, { map: rt });
  roadMat.polygonOffset = true; roadMat.polygonOffsetFactor = -2; roadMat.polygonOffsetUnits = -2;
  group.add(ribbon(track, -ROAD_HALF, ROAD_HALF, 0, -40, L, roadMat, 24));
  const concrete = std(0xb7b2a6, 0.95);
  const drainMat = std(0x1b1c1e, 0.9);
  for (const sx of [-1, 1]) {
    const a = sx * (ROAD_HALF + 0.2), b = sx * (ROAD_HALF + 2.8);
    group.add(ribbon(track, Math.min(a, b), Math.max(a, b), 0.2, -40, L, concrete, 8));
    group.add(ribbon(track, sx * ROAD_HALF, sx * (ROAD_HALF + 0.5), 0.012, -40, L, drainMat, 8));
    group.add(wall(track, sx * (ROAD_HALF + 0.2), -0.12, 0.2, -40, L, concrete, -sx as 1 | -1));        // kerb face
    group.add(wall(track, sx * (ROAD_HALF + 2.8), -0.12, 0.2, -40, L, concrete, sx as 1 | -1));          // outer edge / embankment
  }

  // ---- start line + finish
  const [sc2, sg] = canvas(256, 32);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { sg.fillStyle = (i + j) % 2 ? "#fff" : "#111"; sg.fillRect(i * 8, j * 8, 8, 8); }
  const checker = tex(sc2);
  for (const d of [0, GOAL]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 1.4), new THREE.MeshBasicMaterial({ map: checker }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.015, -d - 0.7); strip.userData.onRoad = true; group.add(strip);
  }
  const steel = std(0x2b2e33, 0.5, 0.6);
  {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), steel); p.position.set(sx * (ROAD_HALF + 1.2), 4, 0); g.add(p); }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 + 3, 2.2, 0.3), new THREE.MeshBasicMaterial({ map: billboardTexture("FINISH", "#0c7b72", "#ffffff") }));
    banner.position.set(0, 7, 0); g.add(banner);
    g.position.set(0, 0, -GOAL); g.userData.onRoad = true; group.add(g);
  }

  // ---- buildings per theme (instanced by height class) + neon + containers
  const win = windowTexture();
  const bMat = std(0xffffff, 0.92, 0, { map: win.map });
  bMat.emissive = new THREE.Color(0xffffff); bMat.emissiveMap = win.lit; bMat.emissiveIntensity = 0;
  const heights = [4.5, 9, 17, 34];
  const bGeo = heights.map((h) => new THREE.BoxGeometry(9, h, 11));
  const per = [0, 0, 0, 0];
  const placements: { cls: number; x: number; z: number; c: number; theme: Theme }[] = [];
  for (const sx of [-1, 1]) {
    for (let d = -20; d < L - 40; ) {
      const th = themeOf(d), P = THEME[th];
      d += (P.step * (0.8 + rnd() * 0.45)) / (0.4 + 0.6 * crowd);
      if (water(d, 14)) continue;
      const r = rnd();
      let acc = 0, cls = 0;
      for (let k = 0; k < 4; k++) { acc += P.cls[k]; if (r <= acc) { cls = k; break; } cls = k; }
      const gap = P.gap + rnd() * (cls === 0 ? P.gapVar * 0.5 : P.gapVar);
      placements.push({ cls, x: sx * (gap + 4.5), z: -d, c: P.palette[Math.floor(rnd() * P.palette.length)], theme: th });
      per[cls]++;
    }
  }
  const inst = bGeo.map((g, i) => new THREE.InstancedMesh(g, bMat, Math.max(1, per[i])));
  inst.forEach((m, i) => { m.count = per[i]; });
  const idx = [0, 0, 0, 0];
  const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (const p of placements) {
    m4.makeTranslation(p.x, heights[p.cls] / 2, p.z);
    inst[p.cls].setMatrixAt(idx[p.cls], m4);
    inst[p.cls].setColorAt(idx[p.cls], col.set(p.c));
    idx[p.cls]++;
  }
  inst.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; group.add(m); });

  // zinc roofs + awnings on low buildings
  const lows = placements.filter((p) => p.cls === 0);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(9.6, 0.25, 11.6), std(0x8c8f93, 0.5, 0.7), Math.max(1, lows.length));
  const aw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.5, 9), std(0xffffff, 0.8), Math.max(1, lows.length));
  roofs.count = aw.count = lows.length;
  const awCols = [0xd8392f, 0x1f7a3a, 0xf5b800, 0x2756a8, 0xf08a38];
  lows.forEach((p, i) => {
    m4.makeTranslation(p.x, 4.6, p.z); roofs.setMatrixAt(i, m4);
    m4.makeTranslation(p.x - Math.sign(p.x) * 4.6, 3.1, p.z); aw.setMatrixAt(i, m4);
    aw.setColorAt(i, col.set(awCols[i % awCols.length]));
  });
  group.add(roofs, aw);

  // neon signs on nightlife facades (bright at every hour; they pop at night)
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const neonList = placements.filter((p) => THEME[p.theme].neon > 0 && p.cls >= 1 && rnd() < THEME[p.theme].neon);
  const neon = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 1.3, 4.2), neonMat, Math.max(1, neonList.length));
  neon.count = neonList.length;
  const neonCols = [0xff2d95, 0x24e0ff, 0xffb02e, 0x9b5cff, 0x39ff88];
  neonList.forEach((p, i) => {
    m4.makeTranslation(p.x - Math.sign(p.x) * 4.62, 3 + rnd() * 5, p.z);
    neon.setMatrixAt(i, m4); neon.setColorAt(i, col.set(neonCols[Math.floor(rnd() * neonCols.length)]));
  });
  group.add(neon);

  // port: container stacks, warehouses and portal cranes
  const cont: { x: number; y: number; z: number; c: number }[] = [];
  const cranes: { x: number; z: number }[] = [];
  const contCols = [0xb23a2f, 0x2a5aa8, 0xd98a2b, 0x2f7a4a, 0x8d9aa3, 0x6b4a8d];
  for (let d = -10; d < L - 40; d += 14 / (0.4 + 0.6 * crowd)) {
    if (themeOf(d) !== "port") continue;
    for (const sx of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const bx = sx * (14 + rnd() * 16), levels = 1 + Math.floor(rnd() * 3), c = contCols[Math.floor(rnd() * contCols.length)];
      for (let lv = 0; lv < levels; lv++) cont.push({ x: bx, y: 1.3 + lv * 2.65, z: -d, c });
    }
    if (rnd() < 0.05) cranes.push({ x: (rnd() > 0.5 ? 1 : -1) * 38, z: -d });
  }
  const cMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 2.6, 12), std(0xffffff, 0.7, 0.2), Math.max(1, cont.length));
  cMesh.count = cont.length;
  cont.forEach((c, i) => { m4.makeTranslation(c.x, c.y, c.z); cMesh.setMatrixAt(i, m4); cMesh.setColorAt(i, col.set(c.c)); });
  group.add(cMesh);
  const craneMat = std(0xe2b020, 0.6, 0.3);
  for (const cr of cranes) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1, 30, 1), craneMat); leg.position.set(sx * 9, 15, sz * 5); g.add(leg); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 2, 3), craneMat); beam.position.set(0, 30, 0); g.add(beam);
    g.position.set(cr.x, 0, cr.z); group.add(g);
  }

  // ---- utility poles + wires (mainland / market / port only)
  const wood = std(0x5d4631, 0.95);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1b1b1b });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 8); poleGeo.translate(0, 4.5, 0);
  const armGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12); armGeo.translate(0, 8.6, 0);
  const polesZ: number[] = [];
  for (let d = 0; d < L - 40; d += 36) if (THEME[themeOf(d)].poles && !water(d, 10)) polesZ.push(-d);
  const poles = new THREE.InstancedMesh(poleGeo, wood, Math.max(1, polesZ.length * 2));
  const arms = new THREE.InstancedMesh(armGeo, wood, Math.max(1, polesZ.length * 2));
  poles.count = arms.count = polesZ.length * 2;
  polesZ.forEach((z, i) => [-1, 1].forEach((sx, k) => {
    m4.makeTranslation(sx * (ROAD_HALF + 2.2), 0, z - (k ? 18 : 0));
    poles.setMatrixAt(i * 2 + k, m4); arms.setMatrixAt(i * 2 + k, m4);
  }));
  group.add(poles, arms);
  for (const sx of [-1, 1]) for (const o of [-0.9, 0, 0.9]) {
    const pts: THREE.Vector3[] = [];
    for (let d = 0; d < L - 40; d += 6) {
      if (!THEME[themeOf(d)].poles || water(d, 10)) { if (pts.length > 1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat)); pts.length = 0; continue; }
      const seg = (d % 36) / 36; const sag = Math.sin(seg * Math.PI) * -0.5;
      pts.push(new THREE.Vector3(sx * (ROAD_HALF + 2.2) + o, 8.55 + sag, -d));
    }
    if (pts.length > 1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // ---- street lamps (with a lit head + glow that the weather system fades in at night)
  const lampGeo = new THREE.CylinderGeometry(0.08, 0.1, 7, 8); lampGeo.translate(0, 3.5, 0);
  const lampHeadGeo = new THREE.BoxGeometry(1.4, 0.15, 0.4); lampHeadGeo.translate(0.7, 7.1, 0);
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9b0, emissiveIntensity: 0.7 });
  const lampList: { x: number; z: number }[] = [];
  for (let d = 10; d < L - 40; d += THEME[themeOf(d)].lamps) {
    lampList.push({ x: -(ROAD_HALF + 0.9), z: -d });
    if (THEME[themeOf(d)].lamps < 45) lampList.push({ x: ROAD_HALF + 0.9, z: -d - 12 });
  }
  const lamps = new THREE.InstancedMesh(lampGeo, steel, lampList.length);
  const heads = new THREE.InstancedMesh(lampHeadGeo, lampHeadMat, lampList.length);
  lampList.forEach((l, i) => {
    m4.makeTranslation(l.x, 0, l.z);
    if (l.x > 0) { m4.makeRotationY(Math.PI); m4.setPosition(l.x, 0, l.z); }
    lamps.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
  });
  group.add(lamps, heads);
  const glowTex = glowTexture();
  const glowMat = new THREE.PointsMaterial({ map: glowTex, size: 7, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const gp: number[] = [];
  for (const l of lampList) gp.push(l.x + (l.x > 0 ? -1.2 : 1.2), 7.0, l.z);
  const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  const glow = new THREE.Points(glowGeo, glowMat); glow.frustumCulled = false;
  group.add(glow);
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(13, 13), poolMat, lampList.length);
  lampList.forEach((l, i) => { m4.makeRotationX(-Math.PI / 2); m4.setPosition(l.x > 0 ? l.x - 3.5 : l.x + 3.5, 0.06, l.z); pools.setMatrixAt(i, m4); });
  pools.frustumCulled = false;
  group.add(pools);

  // ---- palms (island / nightlife / mainland)
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 7, 8); trunkGeo.translate(0, 3.5, 0);
  const frond = new THREE.ConeGeometry(0.4, 3.4, 4); frond.rotateZ(Math.PI / 2); frond.translate(1.8, 0, 0);
  const palmZ: number[] = [];
  for (let d = 20; d < L - 40; ) { d += (THEME[themeOf(d)].palms * (0.75 + rnd() * 0.5)) / crowd; if (!water(d, 14)) palmZ.push(-d); }
  const trunks = new THREE.InstancedMesh(trunkGeo, std(0x6b5a45, 0.95), Math.max(1, palmZ.length));
  const fronds = new THREE.InstancedMesh(frond, std(0x2f7a37, 0.85), Math.max(1, palmZ.length * 7));
  trunks.count = palmZ.length; fronds.count = palmZ.length * 7;
  const q = new THREE.Quaternion(); const e = new THREE.Euler(); const sc3 = new THREE.Vector3(1, 1, 1);
  palmZ.forEach((z, i) => {
    const sx = rnd() > 0.5 ? 1 : -1; const px = sx * (ROAD_HALF + 3.6 + rnd() * 2);
    m4.makeTranslation(px, 0, z); trunks.setMatrixAt(i, m4);
    for (let k = 0; k < 7; k++) {
      e.set(0, (k / 7) * Math.PI * 2, -0.45 - rnd() * 0.2, "YZX");
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(px, 6.9, z), q, sc3);
      fronds.setMatrixAt(i * 7 + k, m4);
    }
  });
  group.add(trunks, fronds);

  // ---- billboards (Lagos humour)
  const ads = [["EKO FOR SHO", "#0c7b72", "#fff"], ["LAGOS NO DEY SLEEP", "#15161a", "#f5b800"], ["JOLLOF PARTY", "#d8392f", "#fff"], ["MAMA NKECHI BUKA", "#1f7a3a", "#fff"],
    ["OBI'S SPARES", "#f5b800", "#15161a"], ["GO-SLOW? NOT US", "#2756a8", "#fff"], ["ZOBO AND CHILL", "#8d2fa0", "#fff"], ["9JA SPEED", "#f08a38", "#15161a"],
    ["THE CIRCUIT IS WATCHING", "#15161a", "#ff3d6e"], ["KELECHI AUTO CARE", "#2756a8", "#ffd24d"]];
  const adMats = ads.map(([t, bg, fg]) => new THREE.MeshBasicMaterial({ map: billboardTexture(t, bg, fg) }));
  for (let d = 120, i = 0; d < L - 80; d += 150 + rnd() * 70, i++) {
    if (water(d, 14)) continue;
    const sx = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.3), adMats[i % adMats.length]);
    panel.position.y = 8; g.add(panel);
    for (const o of [-3, 3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.5, 8), steel); p.position.set(o, 3.2, -0.1); g.add(p); }
    g.position.set(sx * (ROAD_HALF + 5.5), 0, -d); g.rotation.y = -sx * 0.5;
    group.add(g);
  }

  // ---- market umbrellas
  const umbPole = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6); umbPole.translate(0, 1.1, 0);
  const umbTop = new THREE.ConeGeometry(1.4, 0.5, 10); umbTop.translate(0, 2.3, 0);
  const umbZ: number[] = [];
  for (let d = 30; d < L - 40; ) { d += (THEME[themeOf(d)].umbrellas * (0.7 + rnd() * 0.7)) / crowd; if (!water(d, 14)) umbZ.push(-d); }
  const um = new THREE.InstancedMesh(umbTop, std(0xffffff, 0.8), Math.max(1, umbZ.length));
  const up = new THREE.InstancedMesh(umbPole, steel, Math.max(1, umbZ.length));
  um.count = up.count = umbZ.length;
  umbZ.forEach((z, i) => {
    const sx = rnd() > 0.5 ? 1 : -1; m4.makeTranslation(sx * (ROAD_HALF + 2.3), 0.2, z);
    um.setMatrixAt(i, m4); up.setMatrixAt(i, m4); um.setColorAt(i, col.set(awCols[Math.floor(rnd() * awCols.length)]));
  });
  group.add(um, up);

  // ---- distant skyline
  const far = new THREE.InstancedMesh(new THREE.BoxGeometry(14, 1, 14), std(0x9aa7b6, 1), 140);
  for (let i = 0; i < 140; i++) {
    const sx = i % 2 ? 1 : -1; const h = 25 + rnd() * 70;
    m4.compose(new THREE.Vector3(sx * (60 + rnd() * 90), h / 2, 80 - (i / 140) * (L + 100)), q.identity(), new THREE.Vector3(1, h, 1));
    far.setMatrixAt(i, m4);
  }
  group.add(far);

  // ---- Lagos props (footbridges, bus stops, kiosks, people, bunting, lagoon + bridge) + boost pads
  const lagos = buildLagos(group, track, map, L, rnd, ROAD_HALF, crowd);
  const padObj = buildBoostPads(group, GOAL, rnd, laneX);

  // lay everything built along the straight road onto the winding route
  bendWorld(group, track);

  const sunOffset = new THREE.Vector3(28, 28, 18);
  const snap = (v: number) => Math.round(v / 15) * 15;
  const followPlayer = (wx: number, wz: number) => {
    ground.position.x = snap(wx); ground.position.z = snap(wz);
    sun.position.set(wx + sunOffset.x, sunOffset.y, wz + sunOffset.z);
    sun.target.position.set(wx, 0, wz - 6);
    sun.target.updateMatrixWorld();
  };
  const tick = (dt: number, time: number) => { lagos.tick(dt, time); padObj.tick(dt, time); };
  return { group, sun, hemi, sky, track, map, sunOffset, followPlayer, pads: padObj.pads, tick, mats: { road: roadMat, windows: bMat, lampHead: lampHeadMat, glow: glowMat, pools: poolMat, neon: neonMat, water: lagos.waterMat } };
}
