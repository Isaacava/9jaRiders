import * as THREE from "three";
import { std } from "./models/util";

// Lagos flavour: yellow/black kerbs, pedestrian footbridges, danfo bus stops, kiosks with local signs,
// green-white-green bunting + flags, people on the pavements, a lagoon bridge stretch with stilt houses and a
// cable-stayed pylon, Victoria Island glass towers, and glowing boost pads.

export const BRIDGE_A = -1800; // lagoon bridge starts (z, negative = forward)
export const BRIDGE_B = -3000; // ...and ends
export const inBridge = (z: number, pad = 0) => z <= BRIDGE_A + pad && z >= BRIDGE_B - pad;

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
function signTexture(lines: string[], bg: string, fg: string, accent = fg, w = 512, h = 256) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = accent; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const size = lines.length > 2 ? 46 : lines.length > 1 ? 64 : 84;
  g.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (size + 10)));
  return tex(c);
}
function kerbTexture() {
  const [c, g] = canvas(16, 64);
  g.fillStyle = "#f2b705"; g.fillRect(0, 0, 16, 32);
  g.fillStyle = "#16171a"; g.fillRect(0, 32, 16, 32);
  return tex(c);
}
function flagTexture() {
  const [c, g] = canvas(96, 64);
  g.fillStyle = "#008751"; g.fillRect(0, 0, 96, 64);
  g.fillStyle = "#ffffff"; g.fillRect(32, 0, 32, 64);
  return tex(c);
}
function chevronTexture() {
  const [c, g] = canvas(128, 256);
  g.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 3; i++) {
    const y = 40 + i * 76;
    const gr = g.createLinearGradient(0, y - 40, 0, y + 30);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, i % 2 ? "#ffb347" : "#4fd1ff");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(64, y - 34); g.lineTo(122, y + 14); g.lineTo(122, y + 40); g.lineTo(64, y - 6); g.lineTo(6, y + 40); g.lineTo(6, y + 14); g.closePath(); g.fill();
  }
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 8, 256); g.fillRect(120, 0, 8, 256);
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function waterTexture() {
  const [c, g] = canvas(256, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#2c7f87"); gr.addColorStop(1, "#1d5f6e");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,236,190,${0.05 + Math.random() * 0.22})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 26, 1 + Math.random() * 2);
  }
  return tex(c, [30, 90]);
}

export type BoostPad = { x: number; dist: number; mesh: THREE.Mesh };

type Rnd = () => number;
const PEOPLE = [0xd8392f, 0x1f7a3a, 0xf5b800, 0x2756a8, 0xf08a38, 0x8d2fa0, 0xffffff, 0x0e8f8f, 0xe8731a, 0x15161a];
const SKINS = [0x2f1c14, 0x3e261c, 0x5b3a24, 0x6b4226, 0x7a5236, 0x8a5a33];

export function buildLagos(group: THREE.Group, L: number, rnd: Rnd, ROAD_HALF: number, crowd = 1) {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  const steel = std(0x2b2e33, 0.5, 0.6);
  const yellow = std(0xf2b705, 0.55);
  const zFar = -L + 60;

  // ---------------------------------------------------------------- yellow/black kerbs
  const kt = kerbTexture(); kt.wrapS = kt.wrapT = THREE.RepeatWrapping; kt.repeat.set(1, L / 1.2);
  for (const sx of [-1, 1]) {
    const k = new THREE.Mesh(new THREE.PlaneGeometry(0.24, L), new THREE.MeshBasicMaterial({ map: kt }));
    k.rotation.x = -Math.PI / 2; k.position.set(sx * (ROAD_HALF + 0.14), 0.205, 60 - L / 2);
    group.add(k);
  }

  // ---------------------------------------------------------------- pedestrian footbridges
  const bridgeSign = new THREE.MeshBasicMaterial({ map: signTexture(["LAGOS STATE", "PEDESTRIAN BRIDGE"], "#0b5d3b", "#ffffff", "#f2b705") });
  const green = std(0x0f6b46, 0.6, 0.3);
  for (let z = -240; z > zFar; z -= 430 + rnd() * 70) {
    if (inBridge(z, 40)) continue;
    const g = new THREE.Group();
    const half = ROAD_HALF + 1.7;
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.3, 6, 1.6), green); t.position.set(sx * half, 3, 0); g.add(t);
      const stair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 6), steel); stair.position.set(sx * (half + 0.9), 3, 3.4); stair.rotation.x = 0.9; g.add(stair);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1.3, 0.35, 2.2), green); deck.position.y = 6.15; g.add(deck);
    const under = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1.3, 0.12, 2.2), yellow); under.position.y = 5.92; g.add(under);
    for (const sz of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1.3, 0.08, 0.08), yellow); rail.position.set(0, 7.15, sz * 1.05); g.add(rail);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 1.3, 0.9, 0.04), new THREE.MeshStandardMaterial({ color: 0x1b2a25, roughness: 0.8, transparent: true, opacity: 0.55 })); mesh.position.set(0, 6.7, sz * 1.05); g.add(mesh);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.4), bridgeSign); sign.position.set(0, 7.65, 1.2); g.add(sign);
    g.position.z = z; group.add(g);
  }

  // ---------------------------------------------------------------- danfo bus stops
  const stopNames = ["OSHODI", "YABA", "IKEJA", "MILE 2", "OJOTA", "AJAH", "SURULERE", "OJUELEGBA", "OBALENDE", "IDUMOTA"];
  const stopMats = stopNames.map((n) => new THREE.MeshBasicMaterial({ map: signTexture(["BUS STOP", n], "#f2b705", "#15161a", "#15161a") }));
  const people = { x: [] as number[], z: [] as number[] };
  let si = 0;
  for (let z = -150; z > zFar; z -= 240 + rnd() * 80) {
    if (inBridge(z, 30)) continue;
    const sx = rnd() > 0.5 ? 1 : -1;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), steel); pole.position.y = 1.7; g.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.08), stopMats[si++ % stopMats.length]); board.position.set(0, 3.1, 0); g.add(board);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.4), std(0x8c8f93, 0.5, 0.7)); roof.position.set(-sx * 1.4, 2.6, 0); g.add(roof);
    for (const o of [0.4, 2.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), steel); p.position.set(-sx * o, 1.45, 0.5); g.add(p); }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.4), std(0x6b4a2b, 0.9)); bench.position.set(-sx * 1.4, 0.55, 0.45); g.add(bench);
    g.position.set(sx * (ROAD_HALF + 0.9), 0.2, z); // board faces +z = the oncoming riders
    group.add(g);
    for (let k = 0; k < 4; k++) { people.x.push(sx * (ROAD_HALF + 1.2 + rnd() * 1.2)); people.z.push(z + (rnd() - 0.5) * 3); }
  }

  // ---------------------------------------------------------------- pedestrians (instanced)
  const N = Math.floor(420 * crowd);
  for (let i = 0; i < N; i++) {
    const z = 20 - rnd() * (L - 40);
    if (inBridge(z, 10)) continue;
    const sx = rnd() > 0.5 ? 1 : -1;
    people.x.push(sx * (ROAD_HALF + 0.7 + rnd() * 1.7)); people.z.push(z);
  }
  const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.75, 4, 8); bodyGeo.translate(0, 0.78, 0);
  const headGeo = new THREE.SphereGeometry(0.16, 10, 8); headGeo.translate(0, 1.58, 0);
  const bodies = new THREE.InstancedMesh(bodyGeo, std(0xffffff, 0.85), people.x.length);
  const heads = new THREE.InstancedMesh(headGeo, std(0xffffff, 0.6), people.x.length);
  const sc = new THREE.Vector3();
  people.x.forEach((x, i) => {
    const s = 0.9 + rnd() * 0.22;
    e.set(0, rnd() * Math.PI * 2, 0); q.setFromEuler(e); sc.set(s, s * (0.95 + rnd() * 0.12), s);
    m4.compose(new THREE.Vector3(x, 0.2, people.z[i]), q, sc);
    bodies.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
    bodies.setColorAt(i, col.set(PEOPLE[Math.floor(rnd() * PEOPLE.length)]));
    heads.setColorAt(i, col.set(SKINS[Math.floor(rnd() * SKINS.length)]));
  });
  group.add(bodies, heads);

  // ---------------------------------------------------------------- kiosks with local signs
  const signs: Array<[string[], string, string]> = [
    [["PURE WATER", "50 NAIRA"], "#2756a8", "#ffffff"], [["RECHARGE", "CARDS"], "#d8392f", "#ffffff"],
    [["AGEGE BREAD", "HOT & FRESH"], "#f5b800", "#15161a"], [["POS", "WITHDRAW 24/7"], "#1f7a3a", "#ffffff"],
    [["SUYA SPOT"], "#15161a", "#f08a38"], [["FRESH FADES", "& BRAIDS"], "#8d2fa0", "#ffffff"]
  ];
  const kz: Array<{ x: number; z: number; t: number; sx: number }> = [];
  for (let z = -20; z > zFar; z -= (30 + rnd() * 26) / crowd) {
    if (inBridge(z, 20)) continue;
    const sx = rnd() > 0.5 ? 1 : -1;
    kz.push({ x: sx * (ROAD_HALF + 3.9), z, t: Math.floor(rnd() * signs.length), sx });
  }
  const kBody = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 2.4, 2.2), std(0xffffff, 0.85), kz.length);
  const kRoof = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.16, 2.6), std(0x8c8f93, 0.5, 0.7), kz.length);
  const kCol = [0xe3c7a0, 0xc8d4cf, 0xe6b8a8, 0xb7c0d3, 0xf0d890];
  kz.forEach((k, i) => {
    m4.makeTranslation(k.x, 1.4, k.z); kBody.setMatrixAt(i, m4); kBody.setColorAt(i, col.set(kCol[i % kCol.length]));
    m4.makeTranslation(k.x, 2.7, k.z); kRoof.setMatrixAt(i, m4);
  });
  group.add(kBody, kRoof);
  signs.forEach(([lines, bg, fg], si2) => {
    const list = kz.filter((k) => k.t === si2);
    if (!list.length) return;
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 1.1), new THREE.MeshBasicMaterial({ map: signTexture(lines, bg, fg) }), list.length);
    list.forEach((k, i) => {
      e.set(0, k.sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(k.x - k.sx * 1.22, 2.0, k.z), q, new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m4);
    });
    group.add(im);
  });

  // ---------------------------------------------------------------- Nigerian bunting across the road + flags on poles
  const flagTri = new THREE.ConeGeometry(0.24, 0.5, 3); flagTri.rotateX(Math.PI); flagTri.scale(1, 1, 0.12);
  const buntZ: number[] = []; for (let z = -90; z > zFar; z -= 150 + rnd() * 40) if (!inBridge(z, 20)) buntZ.push(z);
  const per = 21;
  const flags = new THREE.InstancedMesh(flagTri, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), buntZ.length * per);
  const linePts: THREE.Vector3[] = [];
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 7.6, 6); poleGeo.translate(0, 3.8, 0);
  const bPoles = new THREE.InstancedMesh(poleGeo, steel, buntZ.length * 2);
  buntZ.forEach((z, b) => {
    const span = ROAD_HALF + 1.6;
    for (let i = 0; i < per; i++) {
      const t = i / (per - 1), x = -span + t * span * 2, sag = Math.sin(t * Math.PI) * 0.9;
      m4.makeTranslation(x, 7.2 - sag - 0.25, z);
      flags.setMatrixAt(b * per + i, m4); flags.setColorAt(b * per + i, col.set(i % 2 ? 0xffffff : 0x008751));
      if (i < per - 1) {
        const t2 = (i + 1) / (per - 1);
        linePts.push(new THREE.Vector3(x, 7.2 - sag, z), new THREE.Vector3(-span + t2 * span * 2, 7.2 - Math.sin(t2 * Math.PI) * 0.9, z));
      }
    }
    for (const [k, sx] of [-1, 1].entries()) { m4.makeTranslation(sx * span, 0.2, z); bPoles.setMatrixAt(b * 2 + k, m4); }
  });
  group.add(flags, bPoles, new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts), new THREE.LineBasicMaterial({ color: 0x222222 })));
  const flagMat = new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide });
  for (let z = -60; z > zFar; z -= 310 + rnd() * 90) {
    if (inBridge(z, 20)) continue;
    const sx = rnd() > 0.5 ? 1 : -1;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 9, 8), steel); pole.position.y = 4.5; g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), flagMat); flag.position.set(-sx * 1.3, 8.1, 0); flag.rotation.y = Math.PI / 2; g.add(flag);
    g.position.set(sx * (ROAD_HALF + 2.6), 0, z); group.add(g);
  }

  // ---------------------------------------------------------------- lagoon + bridge stretch
  const zc = (BRIDGE_A + BRIDGE_B) / 2, len = Math.abs(BRIDGE_A - BRIDGE_B);
  const wt = waterTexture();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, len + 400), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.22, metalness: 0.15 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.06, zc); group.add(water);
  const concrete = std(0xc9c4b8, 0.9);
  for (const sx of [-1, 1]) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, len + 6), concrete);
    barrier.position.set(sx * (ROAD_HALF + 2.9), 0.65, zc); group.add(barrier);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, len + 6), yellow);
    cap.position.set(sx * (ROAD_HALF + 2.9), 1.35, zc); group.add(cap);
  }
  // stilt houses on the water (zinc roofs) and canoes
  const shackN = Math.max(12, Math.floor(90 * crowd));
  const shacks = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 2.2, 3.4), std(0x7a5a3a, 0.95), shackN);
  const shackRoofs = new THREE.InstancedMesh(new THREE.BoxGeometry(4.1, 0.2, 4.1), std(0x9aa0a6, 0.45, 0.7), shackN);
  const stilts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), std(0x4b3826, 1), shackN);
  for (let i = 0; i < shackN; i++) {
    const sx = i % 2 ? 1 : -1, x = sx * (22 + rnd() * 70), z = BRIDGE_A - 40 - rnd() * (len - 80), y = 0.9;
    e.set(0, rnd() * 0.6, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y + 1.1, z), q, new THREE.Vector3(1, 0.8 + rnd() * 0.5, 1)); shacks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, y + 2.35, z), q, new THREE.Vector3(1, 1, 1)); shackRoofs.setMatrixAt(i, m4);
    m4.makeTranslation(x, 0, z); stilts.setMatrixAt(i, m4);
  }
  group.add(shacks, shackRoofs, stilts);
  const canoeG = new THREE.BoxGeometry(0.9, 0.35, 5); canoeG.translate(0, 0.1, 0);
  const canoes = new THREE.InstancedMesh(canoeG, std(0x8a5a33, 0.9), 40);
  for (let i = 0; i < 40; i++) {
    e.set(0, rnd() * Math.PI, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3((i % 2 ? 1 : -1) * (14 + rnd() * 60), -0.02, BRIDGE_A - 20 - rnd() * (len - 40)), q, new THREE.Vector3(1, 1, 1));
    canoes.setMatrixAt(i, m4); canoes.setColorAt(i, col.set([0x8a5a33, 0x2756a8, 0xd8392f, 0xf5b800][i % 4]));
  }
  group.add(canoes);
  // cable-stayed pylon in the distance (Lekki-Ikoyi style)
  {
    const px = -52, pz = zc, deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, len * 0.8), std(0xcfcac0, 0.8));
    deck.position.set(px, 7, pz); group.add(deck);
    const legMat = std(0xe9e6df, 0.7);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 74, 2.2), legMat);
      leg.position.set(px + s * 3.4, 37, pz); leg.rotation.z = -s * 0.07; group.add(leg);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 2.2), legMat); top.position.set(px, 72, pz); group.add(top);
    const cp: THREE.Vector3[] = [];
    for (let i = 1; i <= 16; i++) for (const s of [-1, 1]) {
      cp.push(new THREE.Vector3(px, 66, pz), new THREE.Vector3(px + (i % 2 ? 5 : -5), 7.6, pz + s * i * 7.5));
    }
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cp), new THREE.LineBasicMaterial({ color: 0xf6f3ea })));
  }

  // ---------------------------------------------------------------- Victoria Island glass towers
  const glassN = Math.max(14, Math.floor(46 * (0.4 + 0.6 * crowd)));
  const glass = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x6f9bb5, roughness: 0.18, metalness: 0.65, emissive: 0x16303f, emissiveIntensity: 0.6 }), glassN);
  for (let i = 0; i < glassN; i++) {
    const sx = i % 2 ? 1 : -1, h = 70 + rnd() * 90, w = 18 + rnd() * 16;
    m4.compose(new THREE.Vector3(sx * (105 + rnd() * 120), h / 2, 90 - (i / glassN) * (L + 120)), q.identity(), new THREE.Vector3(w, h, w));
    glass.setMatrixAt(i, m4);
  }
  group.add(glass);

  const tick = (_dt: number, time: number) => { wt.offset.y = (time * 0.012) % 1; wt.offset.x = Math.sin(time * 0.15) * 0.02; };
  return { tick };
}

// ------------------------------------------------------------------ boost pads
export function buildBoostPads(group: THREE.Group, L: number, rnd: Rnd, laneX: (i: number) => number) {
  const ct = chevronTexture();
  const geo = new THREE.PlaneGeometry(2.0, 5.2);
  const pads: BoostPad[] = [];
  for (let d = 230; d < 4900; d += 170 + rnd() * 90) {
    if (inBridge(-d, 0) && rnd() < 0.3) continue;
    const mat = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const m = new THREE.Mesh(geo, mat);
    const x = laneX(Math.floor(rnd() * 5));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, -d);
    group.add(m);
    pads.push({ x, dist: d, mesh: m });
  }
  void L;
  const tick = (_dt: number, time: number) => {
    ct.offset.y = -((time * 0.9) % 1);
    for (const p of pads) (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(time * 6 + p.dist) * 0.25;
  };
  return { pads, tick };
}
