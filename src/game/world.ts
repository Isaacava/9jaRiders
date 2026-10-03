import * as THREE from "three";
import { mulberry32, std } from "./models/util";

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
  const [c, g] = canvas(128, 256);
  g.fillStyle = "#cfc8bb"; g.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 250; y += 36) for (let x = 10; x < 120; x += 30) {
    g.fillStyle = Math.random() > 0.15 ? "#27343f" : "#c9a54a";
    g.fillRect(x, y, 18, 22);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, y, 18, 4);
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 256, 3, 3); }
  return tex(c);
}

function skyTexture() {
  const [c, g] = canvas(32, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#2d6fb8"); gr.addColorStop(0.45, "#7fb3dd"); gr.addColorStop(0.5, "#d8e4ea"); gr.addColorStop(0.56, "#e9dcc2"); gr.addColorStop(1, "#c8b79a");
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
  sky: THREE.Object3D;
  followPlayer: (x: number, z: number) => void;
};

export function buildWorld(scene: THREE.Scene): World {
  const rnd = mulberry32(9);
  const group = new THREE.Group();
  scene.add(group);
  const L = GOAL + 600;
  const zMid = 60 - L / 2;

  // lights
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7352, 0.9);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -18; sc.right = 18; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  group.add(sun, sun.target);

  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, L + 800), std(0xffffff, 1, 0, { map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.12, zMid); ground.receiveShadow = true;
  group.add(ground);

  // road
  const rt = roadTexture();
  rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, L / 24);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, L), std(0xffffff, 0.88, 0.02, { map: rt }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, zMid);
  (road.material as THREE.MeshStandardMaterial).polygonOffset = true; (road.material as THREE.MeshStandardMaterial).polygonOffsetFactor = -2; (road.material as THREE.MeshStandardMaterial).polygonOffsetUnits = -2; road.receiveShadow = true;
  group.add(road);

  // curbs / sidewalks / drains
  const concrete = std(0xb7b2a6, 0.95);
  for (const sx of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, L), concrete);
    walk.position.set(sx * (ROAD_HALF + 1.3 + 0.2), 0.1, zMid); walk.receiveShadow = true; group.add(walk);
    const drain = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, L), std(0x1b1c1e, 0.9));
    drain.position.set(sx * (ROAD_HALF + 0.25), 0.012, zMid); group.add(drain);
  }

  // start line + finish
  const [sc2, sg] = canvas(256, 32);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { sg.fillStyle = (i + j) % 2 ? "#fff" : "#111"; sg.fillRect(i * 8, j * 8, 8, 8); }
  const checker = tex(sc2);
  for (const z of [0, -GOAL]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 1.4), new THREE.MeshBasicMaterial({ map: checker }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.015, z - 0.7); group.add(strip);
  }
  const steel = std(0x2b2e33, 0.5, 0.6);
  const makeGantry = (label: string, bg: string, fg: string, z: number) => {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), steel); p.position.set(sx * (ROAD_HALF + 1.2), 4, 0); g.add(p); }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 + 3, 2.2, 0.3), new THREE.MeshBasicMaterial({ map: billboardTexture(label, bg, fg) }));
    banner.position.set(0, 7, 0); g.add(banner);
    g.position.set(0, 0, z); group.add(g);
  };
  makeGantry("FINISH", "#0c7b72", "#ffffff", -GOAL);

  // buildings (instanced by height class)
  const winTex = windowTexture();
  const palette = [0xd9cdb8, 0xc8d4cf, 0xe3c7a0, 0xb7c0d3, 0xe6b8a8, 0xd8d8c4, 0xa9c4a0, 0xf0d890];
  const heights = [4.5, 9, 17];
  const bGeo = heights.map((h) => new THREE.BoxGeometry(9, h, 11));
  const bMat = std(0xffffff, 0.92, 0, { map: winTex });
  const per = [0, 0, 0];
  const placements: { cls: number; x: number; z: number; c: number }[] = [];
  for (const sx of [-1, 1]) {
    for (let z = 20; z > -L + 40; z -= 10 + rnd() * 6) {
      const r = rnd();
      const cls = r < 0.45 ? 0 : r < 0.85 ? 1 : 2;
      const gap = 11.8 + rnd() * (cls === 0 ? 4 : 9);
      placements.push({ cls, x: sx * (gap + 4.5), z, c: palette[Math.floor(rnd() * palette.length)] });
      per[cls]++;
    }
  }
  const inst = bGeo.map((g, i) => new THREE.InstancedMesh(g, bMat, per[i]));
  const idx = [0, 0, 0];
  const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (const p of placements) {
    m4.makeTranslation(p.x, heights[p.cls] / 2, p.z);
    inst[p.cls].setMatrixAt(idx[p.cls], m4);
    inst[p.cls].setColorAt(idx[p.cls], col.set(p.c));
    idx[p.cls]++;
  }
  inst.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; group.add(m); });

  // zinc roofs + shop awnings on low buildings
  const lows = placements.filter((p) => p.cls === 0);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(9.6, 0.25, 11.6), std(0x8c8f93, 0.5, 0.7), lows.length);
  const aw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.5, 9), std(0xffffff, 0.8), lows.length);
  const awCols = [0xd8392f, 0x1f7a3a, 0xf5b800, 0x2756a8, 0xf08a38];
  lows.forEach((p, i) => {
    m4.makeTranslation(p.x, 4.6, p.z); roofs.setMatrixAt(i, m4);
    m4.makeTranslation(p.x - Math.sign(p.x) * 4.6, 3.1, p.z); aw.setMatrixAt(i, m4);
    aw.setColorAt(i, col.set(awCols[i % awCols.length]));
  });
  group.add(roofs, aw);

  // utility poles + street lights + palms
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 8); poleGeo.translate(0, 4.5, 0);
  const armGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12); armGeo.translate(0, 8.6, 0);
  const wood = std(0x5d4631, 0.95);
  const polesZ: number[] = []; for (let z = 0; z > -L + 40; z -= 36) polesZ.push(z);
  const poles = new THREE.InstancedMesh(poleGeo, wood, polesZ.length * 2);
  const arms = new THREE.InstancedMesh(armGeo, wood, polesZ.length * 2);
  polesZ.forEach((z, i) => {
    [-1, 1].forEach((sx, k) => {
      m4.makeTranslation(sx * (ROAD_HALF + 2.2), 0, z - (k ? 18 : 0));
      poles.setMatrixAt(i * 2 + k, m4); arms.setMatrixAt(i * 2 + k, m4);
    });
  });
  group.add(poles, arms);
  // wires
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1b1b1b });
  for (const sx of [-1, 1]) for (const o of [-0.9, 0, 0.9]) {
    const pts: THREE.Vector3[] = [];
    for (let z = 0; z > -L + 40; z -= 6) {
      const seg = ((-z) % 36) / 36; const sag = Math.sin(seg * Math.PI) * -0.5;
      pts.push(new THREE.Vector3(sx * (ROAD_HALF + 2.2) + o, 8.55 + sag, z));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  const lampGeo = new THREE.CylinderGeometry(0.08, 0.1, 7, 8); lampGeo.translate(0, 3.5, 0);
  const lampHeadGeo = new THREE.BoxGeometry(1.4, 0.15, 0.4); lampHeadGeo.translate(0.7, 7.1, 0);
  const lampZ: number[] = []; for (let z = -10; z > -L + 40; z -= 50) lampZ.push(z);
  const lamps = new THREE.InstancedMesh(lampGeo, steel, lampZ.length);
  const heads = new THREE.InstancedMesh(lampHeadGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9b0, emissiveIntensity: 0.7 }), lampZ.length);
  lampZ.forEach((z, i) => { m4.makeTranslation(-(ROAD_HALF + 0.9), 0, z); lamps.setMatrixAt(i, m4); heads.setMatrixAt(i, m4); });
  group.add(lamps, heads);

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 7, 8); trunkGeo.translate(0, 3.5, 0);
  const frond = new THREE.ConeGeometry(0.4, 3.4, 4); frond.rotateZ(Math.PI / 2); frond.translate(1.8, 0, 0);
  const palmZ: number[] = []; for (let z = -20; z > -L + 40; z -= 55 + rnd() * 40) palmZ.push(z);
  const trunks = new THREE.InstancedMesh(trunkGeo, std(0x6b5a45, 0.95), palmZ.length);
  const fronds = new THREE.InstancedMesh(frond, std(0x2f7a37, 0.85), palmZ.length * 7);
  const q = new THREE.Quaternion(); const e = new THREE.Euler(); const sc3 = new THREE.Vector3(1, 1, 1);
  palmZ.forEach((z, i) => {
    const sx = rnd() > 0.5 ? 1 : -1; const px = sx * (ROAD_HALF + 3.6 + rnd() * 2);
    m4.makeTranslation(px, 0, z); trunks.setMatrixAt(i, m4);
    for (let k = 0; k < 7; k++) {
      e.set(0.35 + rnd() * 0.15, (k / 7) * Math.PI * 2 + rnd() * 0.3, 0, "YXZ");
      e.set(0, (k / 7) * Math.PI * 2, -0.45 - rnd() * 0.2, "YZX");
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(px, 6.9, z), q, sc3);
      fronds.setMatrixAt(i * 7 + k, m4);
    }
  });
  group.add(trunks, fronds);

  // billboards
  const ads = [["OBI'S SPARES", "#f5b800", "#15161a"], ["MAMA NKECHI BUKA", "#1f7a3a", "#fff"], ["FRESH FADES", "#15161a", "#f08a38"], ["9JA SPEED", "#d8392f", "#fff"], ["ZOBO AND CHILL", "#8d2fa0", "#fff"]];
  const adMats = ads.map(([t, bg, fg]) => new THREE.MeshBasicMaterial({ map: billboardTexture(t, bg, fg) }));
  for (let z = -120, i = 0; z > -L + 80; z -= 210 + rnd() * 90, i++) {
    const sx = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.3), adMats[i % adMats.length]);
    panel.position.y = 8; g.add(panel);
    for (const o of [-3, 3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6.5, 8), steel); p.position.set(o, 3.2, -0.1); g.add(p); }
    g.position.set(sx * (ROAD_HALF + 5.5), 0, z); g.rotation.y = sx * -0.35 + (sx > 0 ? -Math.PI / 2 + Math.PI / 2 : 0);
    g.rotation.y = -sx * 0.5;
    group.add(g);
  }

  // market umbrellas
  const umbPole = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6); umbPole.translate(0, 1.1, 0);
  const umbTop = new THREE.ConeGeometry(1.4, 0.5, 10); umbTop.translate(0, 2.3, 0);
  const umbZ: number[] = []; for (let z = -30; z > -L + 40; z -= 28 + rnd() * 30) umbZ.push(z);
  const um = new THREE.InstancedMesh(umbTop, std(0xffffff, 0.8), umbZ.length);
  const up = new THREE.InstancedMesh(umbPole, steel, umbZ.length);
  umbZ.forEach((z, i) => {
    const sx = rnd() > 0.5 ? 1 : -1; m4.makeTranslation(sx * (ROAD_HALF + 2.3), 0.2, z);
    um.setMatrixAt(i, m4); up.setMatrixAt(i, m4); um.setColorAt(i, col.set(awCols[Math.floor(rnd() * awCols.length)]));
  });
  group.add(um, up);

  // distant skyline (fog-hidden depth)
  const far = new THREE.InstancedMesh(new THREE.BoxGeometry(14, 1, 14), std(0x9aa7b6, 1), 140);
  for (let i = 0; i < 140; i++) {
    const sx = i % 2 ? 1 : -1; const h = 25 + rnd() * 70;
    m4.compose(new THREE.Vector3(sx * (60 + rnd() * 90), h / 2, 80 - (i / 140) * (L + 100)), q.identity(), new THREE.Vector3(1, h, 1));
    far.setMatrixAt(i, m4);
  }
  group.add(far);

  const followPlayer = (x: number, z: number) => {
    sun.position.set(x + 22, 36, z + 14);
    sun.target.position.set(x, 0, z - 6);
    sun.target.updateMatrixWorld();
  };
  return { group, sun, sky, followPlayer };
}
