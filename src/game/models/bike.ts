import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { paint, rod, std } from "./util";
import { buildBikeParts, SPEC, type BikeStyle } from "./bikeShape";
import { toGeometry } from "./geo";
import { mergeStatic } from "./merge";

export { type BikeStyle } from "./bikeShape";

export const BIKE_STYLE: Record<string, BikeStyle> = {
  starter: "street",
  speed: "sport",
  heavy: "tourer",
  elite: "sport",
  legendary: "sport",
  cafe: "cafe",
  flattrack: "track",
  lightweight: "street",
  dirt: "dirt"
};

export type BikeRig = {
  root: THREE.Group;
  steer: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  seat: THREE.Vector3;
  pegs: [THREE.Vector3, THREE.Vector3];
  grips: [THREE.Vector3, THREE.Vector3]; // in steer-group local space
  riderLean: number;
  wheelR: number;
  brakeLight: THREE.MeshStandardMaterial;
  flame: THREE.Mesh;
  style: BikeStyle;
};

const rb = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, r);

function makeWheel(r: number, tireW: number, rim: THREE.Material, tire: THREE.Material) {
  const g = new THREE.Group();
  const tireGeo = new THREE.TorusGeometry(r - tireW, tireW, 14, 40);
  tireGeo.rotateY(Math.PI / 2);
  const t = new THREE.Mesh(tireGeo, tire);
  t.castShadow = true;
  g.add(t);
  const rimGeo = new THREE.TorusGeometry(r - tireW * 1.7, 0.016, 8, 36);
  rimGeo.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(rimGeo, rim));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, tireW * 1.5, 14).rotateZ(Math.PI / 2), rim);
  g.add(hub);
  const spokeMat = std(0xb9bec4, 0.35, 0.9);
  for (let i = 0; i < 12; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.x = (i / 12) * Math.PI * 2;
    const len = r - tireW * 1.7;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.008, len, 0.008), spokeMat);
    s.position.y = len / 2;
    pivot.add(s);
    g.add(pivot);
  }
  // brake disc + marker so rotation is visible
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.46, r * 0.46, 0.008, 28).rotateZ(Math.PI / 2), std(0x9aa0a6, 0.4, 0.9));
  disc.position.x = 0.045;
  g.add(disc);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.05), std(0xd13b2a, 0.5, 0.3));
  caliper.position.set(0.06, r * 0.4, 0);
  g.add(caliper);
  return g;
}

function fender(r: number, width: number, spanRad: number, mat: THREE.Material, centerAngle: number) {
  const geo = new THREE.CylinderGeometry(r + 0.035, r + 0.035, width, 24, 1, true, centerAngle - spanRad / 2, spanRad);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  (mat as THREE.Material).side = THREE.DoubleSide;
  m.castShadow = true;
  return m;
}

export function buildBike(style: BikeStyle, color: number, accent = 0x15181c): BikeRig {
  const s = SPEC[style];
  const root = new THREE.Group();
  const r = s.r;
  const zR = s.wb / 2;
  const zF = -s.wb / 2;

  const body = paint(color);
  const accentMat = paint(accent, { metalness: 0.2, roughness: 0.4 });
  const black = std(0x15171a, 0.6, 0.3);
  const chrome = std(0xd5d9dd, 0.18, 1);
  const dark = std(0x2a2d31, 0.5, 0.7);
  const tire = std(0x101113, 0.92);
  const rubber = std(0x1b1c1e, 0.9);

  // wheels
  const tw = style === "dirt" ? 0.065 : 0.075;
  const front = makeWheel(r, tw, chrome, tire);
  front.position.set(0, r, zF);
  const rear = makeWheel(r, tw + 0.012, chrome, tire);
  rear.position.set(0, r, zR);
  root.add(front, rear);

  // smooth sculpted bodywork (tank, tail, fairing, fenders), seat and engine: one blended mesh each
  const parts = buildBikeParts(style);
  const bodyMesh = new THREE.Mesh(toGeometry(parts.body), body);
  const seatMesh = new THREE.Mesh(toGeometry(parts.seat), std(0x17181a, 0.85));
  const engineMesh = new THREE.Mesh(toGeometry(parts.engine), dark);
  root.add(bodyMesh, seatMesh, engineMesh);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.18), dark);
    fin.position.set(0, r + 0.44 + i * 0.028, -0.09);
    fin.rotation.x = -0.4;
    root.add(fin);
  }

  // frame, swingarm, suspension
  const head = new THREE.Vector3(0, s.seatY + 0.1, zF + 0.2);
  const seatRear = new THREE.Vector3(0, s.seatY - 0.04, zR - 0.28);
  root.add(rod(head, new THREE.Vector3(0.09, r + 0.33, 0.12), 0.02, black));
  root.add(rod(head, new THREE.Vector3(-0.09, r + 0.33, 0.12), 0.02, black));
  root.add(rod(new THREE.Vector3(0.1, r + 0.45, 0.1), seatRear, 0.02, black));
  root.add(rod(new THREE.Vector3(-0.1, r + 0.45, 0.1), seatRear, 0.02, black));
  for (const sx of [-1, 1]) {
    root.add(rod(new THREE.Vector3(sx * 0.11, r + 0.22, 0.2), new THREE.Vector3(sx * 0.1, r, zR), 0.022, accentMat));
  }
  root.add(rod(new THREE.Vector3(0, r + 0.55, 0.3), new THREE.Vector3(0, r + 0.12, 0.45), 0.025, std(0xe0a526, 0.4, 0.5)));

  // exhaust
  const exA = new THREE.Vector3(0.14, r + 0.12, -0.1);
  const exB = new THREE.Vector3(0.17, r + 0.18, zR + 0.12);
  root.add(rod(exA, exB, 0.032, chrome, 12));
  root.add(rod(new THREE.Vector3(0.18, r + 0.2, zR - 0.28), new THREE.Vector3(0.18, r + 0.27, zR + 0.3), 0.052, chrome, 14));
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.55, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flame.position.set(0.18, r + 0.27, zR + 0.62);
  root.add(flame);

  // rear light + plate
  const sporty = style === "sport" || style === "cafe";
  const brakeLight = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 0.4 });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.03), brakeLight);
  tl.position.set(0, s.seatY + (sporty ? 0.17 : 0.1), zR + 0.04);
  root.add(tl);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.01), std(0xf5f0d0, 0.6));
  plate.position.set(0, s.seatY - 0.08, zR + 0.12);
  plate.rotation.x = 0.3;
  root.add(plate);

  // windscreen
  if (s.fairing) {
    const big = !!s.bigFairing;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, big ? 0.34 : 0.22),
      new THREE.MeshPhysicalMaterial({ color: 0x223344, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    screen.position.set(0, s.seatY + (big ? 0.34 : 0.26), zF + (big ? 0.34 : 0.3));
    screen.rotation.x = -0.9;
    root.add(screen);
  }

  // steering group (pivot at head)
  const steer = new THREE.Group();
  steer.position.copy(head);
  root.add(steer);
  const axle = new THREE.Vector3(0, r, zF).sub(head);
  for (const sx of [-1, 1]) {
    steer.add(rod(new THREE.Vector3(sx * 0.075, 0.02, 0.02), new THREE.Vector3(sx * 0.075, axle.y + 0.05, axle.z), 0.024, chrome, 12));
    steer.add(rod(new THREE.Vector3(sx * 0.075, 0.02, 0.02), new THREE.Vector3(sx * 0.075, -0.15, axle.z * 0.55), 0.034, accentMat, 12));
  }
  const barPos = new THREE.Vector3(0, s.barY - head.y, s.barZ - head.z);
  const hb = s.barW / 2;
  const gx = hb - 0.05; // grip centre x (rider IK targets these)
  const gL = new THREE.Vector3(-gx, barPos.y, barPos.z);
  const gR = new THREE.Vector3(gx, barPos.y, barPos.z);
  const tubeAlong = (pts: THREE.Vector3[], rad: number, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.3), 24, rad, 10), m);
    mesh.castShadow = true;
    steer.add(mesh);
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const clipOn = style === "sport" || style === "cafe";
  // top triple clamp + fork bridge
  const clamp = new THREE.Mesh(rb(0.22, 0.03, 0.06, 0.012), dark);
  clamp.position.set(0, 0.025, 0.02);
  steer.add(clamp);
  if (clipOn) {
    // low clip-on bars swept down and out from the fork tubes
    for (const sx of [-1, 1]) {
      tubeAlong([V(sx * 0.09, 0.02, 0.02), V(sx * 0.15, 0.03, 0.03), V(sx * (hb - 0.14), barPos.y - 0.012, barPos.z + 0.035), V(sx * (hb - 0.07), barPos.y, barPos.z + 0.005), V(sx * (hb + 0.02), barPos.y, barPos.z)], 0.0125, chrome);
    }
  } else {
    // riser blocks + a proper bar
    for (const sx of [-1, 1]) steer.add(rod(V(sx * 0.055, 0.03, 0.02), V(sx * 0.06, barPos.y - 0.012, barPos.z), 0.02, dark, 10));
    const top = barPos.y;
    tubeAlong([V(-hb - 0.02, top - 0.005, barPos.z + 0.05), V(-hb + 0.06, top, barPos.z + 0.005), V(-0.12, top + 0.004, barPos.z), V(0, top + 0.008, barPos.z), V(0.12, top + 0.004, barPos.z), V(hb - 0.06, top, barPos.z + 0.005), V(hb + 0.02, top - 0.005, barPos.z + 0.05)], 0.0125, chrome);
    if (s.highFender || style === "track") {
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 8).rotateZ(Math.PI / 2), chrome);
      cross.position.set(0, barPos.y + 0.07, barPos.z);
      steer.add(cross);
      for (const sx of [-1, 1]) steer.add(rod(V(sx * 0.14, barPos.y, barPos.z), V(sx * 0.14, barPos.y + 0.07, barPos.z), 0.007, chrome, 6));
    }
  }
  // grips with end caps; throttle housing (right) + switch housing (left)
  for (const g of [gL, gR]) {
    const out = g.x > 0 ? 1 : -1;
    steer.add(rod(g.clone().add(V(-out * 0.06, 0, 0)), g.clone().add(V(out * 0.07, 0, 0)), 0.02, rubber, 14));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12).rotateZ(Math.PI / 2), chrome);
    cap.position.copy(g).add(V(out * 0.076, 0, 0));
    steer.add(cap);
    const housing = new THREE.Mesh(rb(0.05, 0.04, 0.05, 0.015), black);
    housing.position.copy(g).add(V(-out * 0.092, 0.004, 0));
    steer.add(housing);
    // brake (right) / clutch (left) lever with pivot block
    const lever = rod(g.clone().add(V(-out * 0.07, -0.012, -0.012)), g.clone().add(V(-out * 0.045, -0.05, -0.12)), 0.0075, chrome, 8);
    steer.add(lever);
    const mc = new THREE.Mesh(rb(0.05, 0.035, 0.05, 0.012), dark);
    mc.position.copy(g).add(V(-out * 0.11, 0.0, -0.002));
    steer.add(mc);
  }
  // mirrors on stalks (not on race-style / dirt bikes)
  if (style === "street" || style === "tourer" || style === "track" || style === "cafe") {
    for (const sx of [-1, 1]) {
      steer.add(rod(V(sx * (hb - 0.16), barPos.y + 0.01, barPos.z - 0.02), V(sx * (hb - 0.2), barPos.y + 0.17, barPos.z + 0.04), 0.0055, black, 6));
      const mir = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), black);
      mir.scale.set(1, 0.65, 0.2);
      mir.position.set(sx * (hb - 0.2), barPos.y + 0.185, barPos.z + 0.045);
      mir.rotation.x = -0.35;
      steer.add(mir);
      const glassM = new THREE.Mesh(new THREE.CircleGeometry(0.036, 14), std(0x9fb4c6, 0.05, 1));
      glassM.scale.set(1, 0.65, 1);
      glassM.position.copy(mir.position).add(V(0, 0.0, 0.0105));
      glassM.rotation.x = -0.35;
      steer.add(glassM);
    }
  }
  // dash / speedo pod facing the rider
  const dash = new THREE.Mesh(rb(0.1, 0.05, 0.035, 0.012), black);
  dash.position.set(0, barPos.y + 0.045, barPos.z - 0.06);
  dash.rotation.x = -0.5;
  steer.add(dash);
  const dashScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.032), new THREE.MeshBasicMaterial({ color: 0x1fe0c4 }));
  dashScreen.position.copy(dash.position).add(V(0, 0.0045, 0.0195));
  dashScreen.rotation.x = -0.5;
  steer.add(dashScreen);
  // headlight
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c4, emissiveIntensity: 1.6, roughness: 0.2 });
  if (s.roundLamp) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), lampMat);
    lamp.position.set(0, -0.02, -0.18);
    lamp.scale.z = 0.7;
    steer.add(lamp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 8, 24), chrome);
    ring.position.set(0, -0.02, -0.235);
    steer.add(ring);
  } else if (!s.fairing) {
    const lamp = new THREE.Mesh(rb(0.2, 0.13, 0.1, 0.04), lampMat);
    lamp.position.set(0, -0.0, -0.17);
    steer.add(lamp);
  } else {
    for (const sx of [-1, 1]) {
      const lamp = new THREE.Mesh(rb(0.12, 0.05, 0.05, 0.02), lampMat);
      lamp.position.set(sx * 0.11, -0.03, -0.17);
      steer.add(lamp);
    }
  }
  if (s.highFender) {
    const pl = new THREE.Mesh(rb(0.24, 0.2, 0.02, 0.03), std(0xf2f2f2, 0.5));
    pl.position.set(0, 0.0, -0.3);
    pl.rotation.x = 0.25;
    steer.add(pl);
  }

  const pegY = r + 0.2;
  const pegs: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(-0.23, pegY, 0.25), new THREE.Vector3(0.23, pegY, 0.25)];
  for (const p of pegs) root.add(rod(new THREE.Vector3(p.x * 0.4, p.y, p.z), p, 0.012, chrome));

  // collapse ~80 tiny meshes into a handful of draw calls (steering and wheels keep moving as groups)
  mergeStatic(steer);
  mergeStatic(front);
  mergeStatic(rear);
  mergeStatic(root, (o) => o === steer || o === front || o === rear || o === flame || o === tl);

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && !(o as THREE.Mesh).castShadow && o !== flame) o.castShadow = true; });
  flame.castShadow = false;

  return {
    root, steer, frontWheel: front, rearWheel: rear,
    seat: new THREE.Vector3(0, s.seatY, zR - 0.52),
    pegs, grips: [gL, gR], riderLean: s.lean, wheelR: r, brakeLight, flame, style
  };
}
