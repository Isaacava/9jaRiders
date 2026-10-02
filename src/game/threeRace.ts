import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getSharedRealtimeClient } from "./multiplayer";

type Mode = "solo" | "multiplayer";

type BikeSpec = {
  color: number;
  accent: number;
  maxSpeed: number;
  accel: number;
  handling: number;
};

type RiderSpec = {
  jacket: number;
  accent: number;
  hair: number;
  skin: number;
};

type Racer = {
  id: string;
  name: string;
  bikeId: string;
  riderId: string;
  lane: number;
  x: number;
  z: number;
  distance: number;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  aggression: number;
  group: THREE.Group;
  lastNearMissAt: number;
};

type Traffic = {
  kind: "danfo" | "keke" | "minibus" | "sedan" | "suv" | "van";
  lane: number;
  group: THREE.Group;
  z: number;
  speedFactor: number;
  lastCollisionAt: number;
};

const BIKES: Record<string, BikeSpec> = {
  starter: { color: 0x14a89c, accent: 0xf1c64d, maxSpeed: 150, accel: 88, handling: 8.4 },
  speed: { color: 0x2779dc, accent: 0xf39a4a, maxSpeed: 185, accel: 112, handling: 9.4 },
  heavy: { color: 0xbd4a42, accent: 0xe2e0d5, maxSpeed: 168, accel: 76, handling: 6.8 },
  elite: { color: 0x8159c6, accent: 0x69dcff, maxSpeed: 202, accel: 128, handling: 8.8 },
  legendary: { color: 0xd0a02b, accent: 0xffefac, maxSpeed: 220, accel: 138, handling: 9.1 }
};

const RIDERS: Record<string, RiderSpec> = {
  main: { jacket: 0x138e85, accent: 0xf2c94c, hair: 0x211715, skin: 0x956345 },
  ada: { jacket: 0x8056bd, accent: 0xf2d0a9, hair: 0x27131f, skin: 0x8d5c45 },
  kobby: { jacket: 0xbe514a, accent: 0xeee4d8, hair: 0x121212, skin: 0x7e5039 },
  tobi: { jacket: 0xe0792b, accent: 0x172024, hair: 0x2b170e, skin: 0x956043 },
  "cpu-01": { jacket: 0x246ba6, accent: 0xf2c94c, hair: 0x2a1a13, skin: 0x81543e },
  "cpu-02": { jacket: 0x2c8c5c, accent: 0xf5e5ca, hair: 0x151515, skin: 0x784a35 },
  "cpu-03": { jacket: 0xb34c89, accent: 0x65d9f4, hair: 0x281623, skin: 0x8d5a42 },
  "cpu-04": { jacket: 0x6555bd, accent: 0xe7c06d, hair: 0x1b1512, skin: 0x7b503b },
  "cpu-05": { jacket: 0x9f4c38, accent: 0xf0e9dc, hair: 0x111111, skin: 0x754733 },
  "cpu-06": { jacket: 0xd26132, accent: 0x9ee8db, hair: 0x1a120e, skin: 0x925c43 },
  "cpu-07": { jacket: 0xae8628, accent: 0xffefaa, hair: 0x23160f, skin: 0x80513b }
};

const TRAFFIC_COLORS: Record<Traffic["kind"], number> = {
  danfo: 0xeac126,
  keke: 0x2e9561,
  minibus: 0xdcb025,
  sedan: 0x627b87,
  suv: 0x3d6484,
  van: 0xd8d4c8
};

function material(color: number, roughness = 0.72, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function emissiveMaterial(color: number, intensity = 2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.05
  });
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, length, 10), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function wheel(materialColor: number, radius: number, width: number) {
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 24),
    material(0x080b0d, 0.94)
  );
  outer.rotation.z = Math.PI / 2;
  outer.castShadow = true;

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.47, radius * 0.47, width + 0.02, 16),
    material(materialColor, 0.5, 0.5)
  );
  hub.rotation.z = Math.PI / 2;
  outer.add(hub);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.62, radius * 0.035, 8, 20),
    material(0x6e787b, 0.5, 0.35)
  );
  inner.rotation.y = Math.PI / 2;
  outer.add(inner);

  return outer;
}

function createBikeAndRider(bikeId: string, riderId: string, scale = 1) {
  const bike = BIKES[bikeId] ?? BIKES.starter;
  const rider = RIDERS[riderId] ?? RIDERS.main;
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const frameMat = material(0x151c1f, 0.56, 0.32);
  const bodyMat = material(bike.color, 0.45, 0.12);
  const accentMat = material(bike.accent, 0.45, 0.2);

  const rearWheel = wheel(0x727d80, 0.58, 0.18);
  rearWheel.position.set(0, 0.58, 0.62);
  root.add(rearWheel);

  const frontWheel = wheel(0x727d80, 0.49, 0.16);
  frontWheel.position.set(0, 0.52, -1.38);
  root.add(frontWheel);

  const tank = new THREE.Mesh(
    new RoundedBoxGeometry(1.08, 0.42, 0.96, 4, 0.11),
    bodyMat
  );
  tank.position.set(0, 1.06, -0.02);
  tank.castShadow = true;
  root.add(tank);

  const tail = new THREE.Mesh(
    new RoundedBoxGeometry(0.88, 0.34, 0.78, 4, 0.09),
    accentMat
  );
  tail.position.set(0, 0.99, 0.78);
  tail.castShadow = true;
  root.add(tail);

  const seat = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.19, 1.02, 4, 0.06),
    material(0x161b1d, 0.9)
  );
  seat.position.set(0, 1.25, 0.45);
  seat.castShadow = true;
  root.add(seat);

  const engine = new THREE.Mesh(
    new RoundedBoxGeometry(0.72, 0.46, 0.68, 4, 0.08),
    material(0x30383b, 0.42, 0.5)
  );
  engine.position.set(0, 0.78, 0.05);
  engine.castShadow = true;
  root.add(engine);

  const leftFrame = cylinderBetween(
    new THREE.Vector3(-0.31, 0.92, 0.46),
    new THREE.Vector3(-0.24, 0.54, 0.04),
    0.055,
    frameMat
  );
  const rightFrame = leftFrame.clone();
  rightFrame.position.x *= -1;
  rightFrame.rotation.y *= -1;
  root.add(leftFrame, rightFrame);

  const rearFork = cylinderBetween(
    new THREE.Vector3(-0.3, 0.7, 0.52),
    new THREE.Vector3(0, 0.78, 0.15),
    0.05,
    material(0x697478, 0.42, 0.6)
  );
  const rearFork2 = rearFork.clone();
  rearFork2.position.x *= -1;
  root.add(rearFork, rearFork2);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.94, 10),
    frameMat
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 1.64, -0.92);
  handle.castShadow = true;
  root.add(handle);

  const headlamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 10),
    emissiveMaterial(0xfff1ad, 2.8)
  );
  headlamp.scale.set(0.9, 0.7, 0.55);
  headlamp.position.set(0, 1.58, -0.97);
  root.add(headlamp);

  const tailLamp = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.08, 0.08, 3, 0.03),
    emissiveMaterial(0xf0443b, 2.4)
  );
  tailLamp.position.set(0, 1.09, 1.2);
  root.add(tailLamp);

  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.95, 14),
    material(0x596468, 0.42, 0.72)
  );
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.48, 0.79, 0.53);
  exhaust.castShadow = true;
  root.add(exhaust);

  const riderRoot = new THREE.Group();
  riderRoot.position.set(0, 1.52, 0.18);
  riderRoot.rotation.x = -0.18;
  root.add(riderRoot);

  const torso = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 0.92, 0.38, 5, 0.09),
    material(rider.jacket, 0.66, 0)
  );
  torso.rotation.x = -0.3;
  torso.castShadow = true;
  riderRoot.add(torso);

  const backPanel = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.26, 0.04, 3, 0.015),
    material(rider.accent, 0.62, 0)
  );
  backPanel.position.set(0, 0.13, 0.205);
  riderRoot.add(backPanel);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 14),
    material(rider.skin, 0.74)
  );
  head.scale.set(0.93, 1, 0.96);
  head.position.set(0, 0.84, -0.13);
  head.castShadow = true;
  riderRoot.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.72),
    material(rider.hair, 0.92)
  );
  hair.scale.set(1.05, 0.85, 1.06);
  hair.position.set(0, 0.94, -0.18);
  hair.castShadow = true;
  riderRoot.add(hair);

  const leftArm = cylinderBetween(
    new THREE.Vector3(-0.25, 0.25, -0.08),
    new THREE.Vector3(-0.43, 0.07, -0.92),
    0.095,
    material(rider.jacket, 0.68)
  );
  const rightArm = cylinderBetween(
    new THREE.Vector3(0.25, 0.25, -0.08),
    new THREE.Vector3(0.43, 0.07, -0.92),
    0.095,
    material(rider.jacket, 0.68)
  );
  riderRoot.add(leftArm, rightArm);

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 12, 8),
    material(rider.skin, 0.8)
  );
  leftHand.position.set(-0.43, 0.06, -0.93);
  const rightHand = leftHand.clone();
  rightHand.position.x *= -1;
  riderRoot.add(leftHand, rightHand);

  const leftLeg = cylinderBetween(
    new THREE.Vector3(-0.23, -0.2, 0.1),
    new THREE.Vector3(-0.3, -0.62, 0.48),
    0.105,
    material(0x242b30, 0.82)
  );
  const rightLeg = leftLeg.clone();
  rightLeg.position.x *= -1;
  riderRoot.add(leftLeg, rightLeg);

  const leftBoot = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.28, 0.34, 3, 0.05),
    material(0x11171a, 0.9)
  );
  leftBoot.position.set(-0.3, -0.73, 0.55);
  const rightBoot = leftBoot.clone();
  rightBoot.position.x *= -1;
  riderRoot.add(leftBoot, rightBoot);

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const nitroLight = new THREE.PointLight(0x54d7ff, 0, 4.5);
  nitroLight.position.set(0, 0.58, 1.25);
  root.add(nitroLight);
  root.userData.nitroLight = nitroLight;

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 0.85, 12),
    emissiveMaterial(0x53d8ff, 4)
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.63, 1.52);
  flame.scale.set(0.72, 1, 0.85);
  flame.visible = false;
  root.add(flame);
  root.userData.flame = flame;

  return root;
}

function createTraffic(kind: Traffic["kind"]) {
  const group = new THREE.Group();
  const bodyColor = TRAFFIC_COLORS[kind];
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(kind === "sedan" ? 2.55 : 2.7, kind === "keke" ? 1.6 : 1.7, kind === "sedan" ? 4.2 : 4.5, 5, 0.18),
    material(bodyColor, 0.72, 0.03)
  );
  body.position.y = 0.88;
  body.castShadow = true;
  group.add(body);

  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(kind === "keke" ? 2.2 : 2.28, kind === "sedan" ? 0.65 : 0.82, kind === "keke" ? 0.35 : 0.58, 4, 0.08),
    material(0x37535c, 0.25, 0.12)
  );
  glass.position.set(0, kind === "sedan" ? 1.2 : 1.27, 1.72);
  group.add(glass);

  const tail = new THREE.Mesh(
    new RoundedBoxGeometry(2.05, 0.38, 0.12, 3, 0.03),
    material(0x24292c, 0.88)
  );
  tail.position.set(0, 0.58, 2.15);
  group.add(tail);

  const redLight = emissiveMaterial(0xee4d42, 1.8);
  const lightL = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.12, 0.1, 3, 0.02), redLight);
  lightL.position.set(-0.87, 0.68, 2.2);
  const lightR = lightL.clone();
  lightR.position.x *= -1;
  group.add(lightL, lightR);

  const bumper = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 0.24, 0.16, 3, 0.03),
    material(0x202528, 0.88)
  );
  bumper.position.set(0, 0.42, 2.26);
  group.add(bumper);

  if (kind === "danfo") {
    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(2.75, 0.24, 4.12, 3, 0.08),
      material(0xc4c0b6, 0.72)
    );
    roof.position.set(0, 1.84, 0);
    group.add(roof);

    const stripe = new THREE.Mesh(
      new RoundedBoxGeometry(2.4, 0.08, 4.05, 2, 0.02),
      material(0x202426, 0.88)
    );
    stripe.position.set(0, 1.08, 0);
    group.add(stripe);
  }

  if (kind === "keke") {
    const canopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.25, 0.18, 3.5, 3, 0.06),
      material(0x10201c, 0.72)
    );
    canopy.position.set(0, 1.95, 0);
    group.add(canopy);

    const rearWindow = new THREE.Mesh(
      new RoundedBoxGeometry(1.8, 0.72, 0.08, 3, 0.02),
      material(0x6ea9b4, 0.24)
    );
    rearWindow.position.set(0, 1.48, 1.74);
    group.add(rearWindow);
  }

  const wheelPositions = [
    [-1.05, 0.46, 1.35],
    [1.05, 0.46, 1.35],
    [-1.05, 0.46, -1.35],
    [1.05, 0.46, -1.35]
  ];

  wheelPositions.forEach((p) => {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(kind === "keke" ? 0.37 : 0.45, kind === "keke" ? 0.37 : 0.45, 0.18, 18),
      material(0x090b0d, 0.95)
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    w.castShadow = true;
    group.add(w);
  });

  if (kind === "danfo") {
    const roofSign = new THREE.Mesh(
      new RoundedBoxGeometry(1.1, 0.16, 0.48, 3, 0.03),
      material(0xffe498, 0.62)
    );
    roofSign.position.set(0, 2.18, 0.45);
    group.add(roofSign);
  }

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  return group;
}

function createPalm() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.27, 4.5, 9),
    material(0x6f563f, 0.94)
  );
  trunk.position.y = 2.25;
  group.add(trunk);

  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 2.1, 3, 8),
      material(0x2e6a39, 0.86)
    );
    leaf.position.y = 4.45;
    leaf.rotation.z = Math.PI * 0.5;
    leaf.rotation.y = (i / 7) * Math.PI * 2;
    leaf.rotateX(-0.55);
    group.add(leaf);
  }

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return group;
}

function createShop(color: number) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new RoundedBoxGeometry(5.2, 3.5, 4.2, 4, 0.16),
    material(color, 0.88)
  );
  wall.position.y = 1.8;
  wall.castShadow = true;
  group.add(wall);

  const roof = new THREE.Mesh(
    new RoundedBoxGeometry(5.5, 0.32, 4.5, 4, 0.08),
    material(0x27383a, 0.85)
  );
  roof.position.y = 3.72;
  group.add(roof);

  const awning = new THREE.Mesh(
    new RoundedBoxGeometry(5.0, 0.22, 0.7, 3, 0.04),
    material(0xe8ba36, 0.68)
  );
  awning.position.set(0, 2.75, 2.2);
  group.add(awning);

  const door = new THREE.Mesh(
    new RoundedBoxGeometry(1.25, 2.4, 0.12, 3, 0.02),
    material(0x202a2c, 0.75)
  );
  door.position.set(0, 1.25, 2.12);
  group.add(door);

  return group;
}

function createBillboard() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 5, 8),
    material(0x596166, 0.82, 0.25)
  );
  post.position.y = 2.5;
  group.add(post);

  const board = new THREE.Mesh(
    new RoundedBoxGeometry(5.8, 2.8, 0.24, 4, 0.08),
    material(0x263f45, 0.78)
  );
  board.position.y = 5;
  group.add(board);

  const stripe = new THREE.Mesh(
    new RoundedBoxGeometry(5.0, 0.22, 0.28, 3, 0.03),
    emissiveMaterial(0xf3c84d, 0.45)
  );
  stripe.position.set(0, 5.42, 0.18);
  group.add(stripe);
  return group;
}

function createNitroPickup() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.72, 12),
    emissiveMaterial(0x46d8ff, 2.5)
  );
  core.rotation.x = Math.PI / 2;
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.04, 8, 22),
    material(0x8cecff, 0.38, 0.2)
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

function makeHud(parent: HTMLElement) {
  parent.style.position = "relative";
  parent.style.overflow = "hidden";
  parent.style.background = "#84cfe1";

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.inset = "0";
  hud.style.pointerEvents = "none";
  hud.style.fontFamily = "Arial, sans-serif";
  hud.style.color = "#fff";
  parent.appendChild(hud);

  const timer = document.createElement("div");
  timer.style.position = "absolute";
  timer.style.left = "18px";
  timer.style.top = "18px";
  timer.style.fontSize = "19px";
  timer.style.fontWeight = "800";
  timer.style.background = "rgba(18,22,24,.76)";
  timer.style.padding = "7px 11px";
  timer.style.borderRadius = "10px";
  hud.appendChild(timer);

  const position = document.createElement("div");
  position.style.position = "absolute";
  position.style.left = "50%";
  position.style.top = "18px";
  position.style.transform = "translateX(-50%)";
  position.style.fontSize = "16px";
  position.style.fontWeight = "900";
  position.style.background = "rgba(18,22,24,.76)";
  position.style.padding = "7px 12px";
  position.style.borderRadius = "10px";
  hud.appendChild(position);

  const speed = document.createElement("div");
  speed.style.position = "absolute";
  speed.style.right = "18px";
  speed.style.top = "18px";
  speed.style.fontSize = "29px";
  speed.style.fontWeight = "900";
  speed.style.letterSpacing = "1px";
  hud.appendChild(speed);

  const speedUnit = document.createElement("div");
  speedUnit.style.position = "absolute";
  speedUnit.style.right = "20px";
  speedUnit.style.top = "52px";
  speedUnit.style.fontSize = "9px";
  speedUnit.style.fontWeight = "800";
  speedUnit.style.opacity = "0.8";
  hud.appendChild(speedUnit);

  const nitroWrap = document.createElement("div");
  nitroWrap.style.position = "absolute";
  nitroWrap.style.left = "50%";
  nitroWrap.style.bottom = "28px";
  nitroWrap.style.transform = "translateX(-50%)";
  nitroWrap.style.width = "min(380px, 54vw)";
  nitroWrap.style.height = "18px";
  nitroWrap.style.borderRadius = "999px";
  nitroWrap.style.background = "rgba(13,18,22,.7)";
  nitroWrap.style.border = "2px solid rgba(255,255,255,.85)";
  nitroWrap.style.overflow = "hidden";
  hud.appendChild(nitroWrap);

  const nitroFill = document.createElement("div");
  nitroFill.style.height = "100%";
  nitroFill.style.width = "30%";
  nitroFill.style.background = "linear-gradient(90deg,#35bfff,#6d6aff,#d655ff)";
  nitroFill.style.boxShadow = "0 0 18px rgba(73,207,255,.85)";
  nitroWrap.appendChild(nitroFill);

  const nitroLabel = document.createElement("div");
  nitroLabel.textContent = "NITRO  •  TAP / SPACE";
  nitroLabel.style.position = "absolute";
  nitroLabel.style.left = "50%";
  nitroLabel.style.bottom = "53px";
  nitroLabel.style.transform = "translateX(-50%)";
  nitroLabel.style.fontSize = "11px";
  nitroLabel.style.fontWeight = "900";
  nitroLabel.style.letterSpacing = "1.2px";
  nitroLabel.style.textShadow = "0 2px 6px rgba(0,0,0,.8)";
  hud.appendChild(nitroLabel);

  const countdown = document.createElement("div");
  countdown.style.position = "absolute";
  countdown.style.left = "50%";
  countdown.style.top = "50%";
  countdown.style.transform = "translate(-50%,-50%)";
  countdown.style.fontSize = "76px";
  countdown.style.fontWeight = "1000";
  countdown.style.fontStyle = "italic";
  countdown.style.textShadow = "0 5px 16px rgba(0,0,0,.75)";
  countdown.style.opacity = "0";
  hud.appendChild(countdown);

  const message = document.createElement("div");
  message.style.position = "absolute";
  message.style.left = "50%";
  message.style.top = "23%";
  message.style.transform = "translate(-50%,-50%)";
  message.style.fontSize = "30px";
  message.style.fontWeight = "1000";
  message.style.fontStyle = "italic";
  message.style.letterSpacing = "2px";
  message.style.textShadow = "0 4px 12px rgba(0,0,0,.8)";
  message.style.opacity = "0";
  hud.appendChild(message);

  const controls = document.createElement("div");
  controls.style.position = "absolute";
  controls.style.left = "18px";
  controls.style.right = "18px";
  controls.style.bottom = "72px";
  controls.style.display = "flex";
  controls.style.justifyContent = "space-between";
  controls.style.pointerEvents = "auto";
  hud.appendChild(controls);

  const steer = document.createElement("div");
  steer.style.display = "flex";
  steer.style.gap = "9px";
  controls.appendChild(steer);

  const rightControls = document.createElement("div");
  rightControls.style.display = "flex";
  rightControls.style.gap = "9px";
  controls.appendChild(rightControls);

  function button(text: string) {
    const el = document.createElement("button");
    el.textContent = text;
    el.style.width = "66px";
    el.style.height = "52px";
    el.style.border = "1px solid rgba(255,255,255,.75)";
    el.style.borderRadius = "16px";
    el.style.background = "rgba(16,21,24,.72)";
    el.style.color = "#fff";
    el.style.fontSize = "21px";
    el.style.fontWeight = "900";
    el.style.touchAction = "none";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    return el;
  }

  const leftButton = button("◀");
  const rightButton = button("▶");
  const nitroButton = button("N");
  nitroButton.style.width = "70px";
  nitroButton.style.background = "linear-gradient(180deg,#6d6aff,#3c66ff)";
  steer.append(leftButton, rightButton);
  rightControls.append(nitroButton);

  return {
    timer,
    position,
    speed,
    speedUnit,
    nitroFill,
    message,
    countdown,
    leftButton,
    rightButton,
    nitroButton,
    dispose() {
      hud.remove();
    }
  };
}

export function createThreeRace(parent: HTMLElement, options: { mode?: Mode }) {
  const mode = options.mode ?? "solo";
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x83cde2);
  scene.fog = new THREE.Fog(0x83cde2, 65, 250);

  const camera = new THREE.PerspectiveCamera(61, 1, 0.1, 500);
  camera.position.set(0, 2.65, 7.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  parent.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xccecf8, 0x4c382f, 1.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe4aa, 2.3);
  sun.position.set(-28, 55, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 46;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const roadMat = material(0x31363a, 0.95, 0);
  const dirtMat = material(0x95775a, 1);
  const curbDark = material(0x242628, 0.9);
  const curbYellow = material(0xe0b51f, 0.72);
  const laneMat = material(0xece6cc, 0.76);

  const roadSegments: THREE.Group[] = [];
  const segmentLength = 80;
  const segmentCount = 8;
  for (let i = 0; i < segmentCount; i += 1) {
    const segment = new THREE.Group();
    segment.position.z = -i * segmentLength;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(105, segmentLength), dirtMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    segment.add(ground);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, segmentLength), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    segment.add(road);

    for (const x of [-8.1, 8.1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, segmentLength), curbDark);
      curb.position.set(x, 0.1, 0);
      curb.receiveShadow = true;
      segment.add(curb);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 4.6), curbYellow);
      stripe.position.set(x, 0.205, -segmentLength * 0.25);
      segment.add(stripe);
      const stripe2 = stripe.clone();
      stripe2.position.z += segmentLength * 0.45;
      segment.add(stripe2);
    }

    for (const x of [-2.66, 2.66]) {
      for (let z = -segmentLength / 2 + 6; z < segmentLength / 2; z += 12) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 5.0), laneMat);
        dash.position.set(x, 0.025, z);
        segment.add(dash);
      }
    }

    roadSegments.push(segment);
    scene.add(segment);
  }

  const scenery: THREE.Object3D[] = [];
  for (let i = 0; i < 42; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -20 - Math.floor(i / 2) * 13 - (i % 3) * 4;
    let obj: THREE.Object3D;
    if (i % 9 === 0) obj = createBillboard();
    else if (i % 4 === 0) obj = createPalm();
    else obj = createShop(i % 3 === 0 ? 0xc48b5a : i % 3 === 1 ? 0x9d7457 : 0x7e9162);

    obj.position.set(side * (11 + (i % 5)), 0, z);
    obj.scale.setScalar(0.9 + (i % 4) * 0.11);
    scene.add(obj);
    scenery.push(obj);
  }

  const playerBikeId = typeof window !== "undefined"
    ? window.localStorage.getItem("aboki:bike") || "starter"
    : "starter";
  const playerRiderId = typeof window !== "undefined"
    ? window.localStorage.getItem("aboki:rider") || "main"
    : "main";

  const player = createBikeAndRider(playerBikeId, playerRiderId, 1.08);
  player.position.set(0, 0, 5.2);
  scene.add(player);

  const speedStreaks: THREE.Mesh[] = [];
  const streakMaterial = emissiveMaterial(0x9cecff, 2.8);
  for (let i = 0; i < 18; i += 1) {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1.6), streakMaterial);
    streak.position.set((Math.random() - 0.5) * 13.5, 0.35 + Math.random() * 1.9, -10 - Math.random() * 110);
    streak.visible = false;
    scene.add(streak);
    speedStreaks.push(streak);
  }

  const riderNames = ["Tega", "Chidi", "Zina", "Emeka", "Bisi", "Femi", "Yemi"];
  const aiRacers: Racer[] = [];
  const aiConfigs = [
    ["cpu-01", "speed", 0.18, 0.88, -32],
    ["cpu-02", "heavy", -0.14, 0.92, -51],
    ["cpu-03", "elite", 0.38, 0.98, -74],
    ["cpu-04", "starter", -0.36, 0.86, -93],
    ["cpu-05", "heavy", 0.10, 1.0, -116],
    ["cpu-06", "speed", -0.48, 0.94, -138],
    ["cpu-07", "legendary", 0.48, 1.02, -162]
  ] as const;

  aiConfigs.forEach((cfg, index) => {
    const [riderId, bikeId, laneBias, skill, z] = cfg;
    const group = createBikeAndRider(bikeId, riderId, 0.86);
    group.position.set(laneBias * 5.3, 0, z);
    scene.add(group);
    aiRacers.push({
      id: "cpu-" + (index + 1),
      name: riderNames[index],
      bikeId,
      riderId,
      lane: laneBias,
      x: laneBias * 5.3,
      z,
      distance: Math.abs(z) * 12,
      speed: BIKES[bikeId].maxSpeed * skill,
      targetSpeed: BIKES[bikeId].maxSpeed * skill,
      maxSpeed: BIKES[bikeId].maxSpeed,
      aggression: 0.45 + index * 0.055,
      group,
      lastNearMissAt: 0
    });
  });

  const traffic: Traffic[] = [];
  const trafficKinds: Traffic["kind"][] = ["danfo", "keke", "minibus", "sedan", "suv", "van"];
  trafficKinds.forEach((kind, index) => {
    const group = createTraffic(kind);
    const lane = [-0.82, 0.78, -0.22, 0.3, -0.56, 0.58][index];
    group.position.set(lane * 5.5, 0, -24 - index * 31);
    scene.add(group);
    traffic.push({
      kind,
      lane,
      group,
      z: group.position.z,
      speedFactor: 0.62 + index * 0.055,
      lastCollisionAt: 0
    });
  });

  const pickups: THREE.Group[] = [];
  [-0.55, 0.08, 0.62, -0.2].forEach((lane, index) => {
    const pickup = createNitroPickup();
    pickup.position.set(lane * 5.5, 1.05, -45 - index * 75);
    scene.add(pickup);
    pickups.push(pickup);
  });

  const hud = makeHud(parent);

  let width = Math.max(parent.clientWidth, 1);
  let height = Math.max(parent.clientHeight, 1);
  let disposed = false;
  let steering = 0;
  let nitro = 0.34;
  let boosting = false;
  let playerX = 0;
  let playerSpeed = 0;
  let playerDistance = 0;
  let raceStartedAt = performance.now();
  let countdown = 3;
  let finished = false;
  let finishShown = false;
  let cameraShake = 0;
  let lastTime = performance.now();
  let messageUntil = 0;
  let messageText = "";
  let audioContext: AudioContext | null = null;
  let engineOsc: OscillatorNode | null = null;
  let engineGain: GainNode | null = null;
  let networkState: any = null;
  let networkLocal: any = null;
  let lastNetworkInput = 0;
  const remoteRacers = new Map<string, { group: THREE.Group; bikeId: string; riderId: string }>();

  function resize() {
    width = Math.max(parent.clientWidth, 1);
    height = Math.max(parent.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  resize();
  window.addEventListener("resize", resize);

  function initAudio() {
    if (audioContext || typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext = new Ctx();
    engineOsc = audioContext.createOscillator();
    engineGain = audioContext.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 80;
    engineGain.gain.value = 0.018;
    engineOsc.connect(engineGain).connect(audioContext.destination);
    engineOsc.start();
  }

  function beep(boost: boolean) {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = boost ? "square" : "sine";
    osc.frequency.value = boost ? 260 : 520;
    gain.gain.value = 0.035;
    osc.connect(gain).connect(audioContext.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.22);
    osc.start();
    osc.stop(audioContext.currentTime + 0.22);
  }

  function showMessage(text: string, duration = 900) {
    messageText = text;
    messageUntil = performance.now() + duration;
    hud.message.textContent = text;
  }

  function setButtonState(button: HTMLElement, down: boolean) {
    button.style.transform = down ? "scale(.94)" : "scale(1)";
    button.style.filter = down ? "brightness(1.18)" : "brightness(1)";
  }

  function bindHold(button: HTMLElement, value: number) {
    const down = () => {
      initAudio();
      steering = value;
      setButtonState(button, true);
    };
    const up = () => {
      if (steering === value) steering = 0;
      setButtonState(button, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  }

  bindHold(hud.leftButton, -1);
  bindHold(hud.rightButton, 1);

  function triggerNitro() {
    initAudio();
    if (nitro < 0.08 || finished) return;
    nitro = Math.max(0, nitro - 0.12);
    boosting = true;
    beep(true);
    showMessage("NITRO!", 650);
    cameraShake = Math.max(cameraShake, 0.09);
    const flame = player.userData.flame as THREE.Mesh;
    const light = player.userData.nitroLight as THREE.PointLight;
    flame.visible = true;
    light.intensity = 9;
    window.setTimeout(() => {
      boosting = false;
      flame.visible = false;
      light.intensity = 0;
    }, 900);
  }

  hud.nitroButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerNitro();
  });

  const keyDown = (event: KeyboardEvent) => {
    initAudio();
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") steering = -1;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") steering = 1;
    if (event.code === "Space" || event.key.toLowerCase() === "e") triggerNitro();
  };
  const keyUp = (event: KeyboardEvent) => {
    if ((event.key === "ArrowLeft" || event.key.toLowerCase() === "a") && steering === -1) steering = 0;
    if ((event.key === "ArrowRight" || event.key.toLowerCase() === "d") && steering === 1) steering = 0;
  };
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  let connectPromise: Promise<void> | null = null;
  const realtime = mode === "multiplayer" ? getSharedRealtimeClient() : null;
  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const networkRoomId = query?.get("room") ?? "";
  const networkPlayerId = query?.get("player") ?? "";

  if (realtime && networkRoomId && networkPlayerId) {
    realtime.onState((state) => {
      networkState = state;
      const local = state.players.find((p) => p.id === networkPlayerId);
      networkLocal = local ?? null;
      if (local) {
        if (state.status === "racing") {
          if (countdown > 0) raceStartedAt = performance.now();
          countdown = 0;
        }
        if (state.status === "countdown") countdown = Math.max(1, Math.ceil((state.countdownMs ?? 3000) / 1000));
        if (state.status === "finished" && !finished) {
          finished = true;
          showMessage(local.finishPosition ? "FINISH " + local.finishPosition + "!" : "FINISH!", 2400);
        }
      }

      for (const remote of state.players.filter((p) => p.id !== networkPlayerId)) {
        let node = remoteRacers.get(remote.id);
        if (!node || node.bikeId !== remote.bikeId || node.riderId !== remote.riderId) {
          if (node) scene.remove(node.group);
          const group = createBikeAndRider(remote.bikeId || "starter", remote.riderId || "main", 0.86);
          scene.add(group);
          node = { group, bikeId: remote.bikeId || "starter", riderId: remote.riderId || "main" };
          remoteRacers.set(remote.id, node);
        }
        node.group.position.x = THREE.MathUtils.lerp(node.group.position.x, (remote.lane - 0.5) * 10.6, 0.13);
        node.group.position.z = 5 - (remote.distance - (local?.distance ?? 0)) * 0.04;
      }
    });
    connectPromise = realtime.connect().catch(() => undefined);
  }

  function start() {
    raceStartedAt = performance.now();
    countdown = mode === "multiplayer" ? 3 : 3;
  }

  function recycleRoadSegments(scroll: number) {
    let minZ = Infinity;
    roadSegments.forEach((segment) => {
      segment.position.z += scroll;
      minZ = Math.min(minZ, segment.position.z);
    });
    roadSegments.forEach((segment) => {
      if (segment.position.z > 85) {
        segment.position.z = minZ - segmentLength;
      }
    });
  }

  function recycleScenery(scroll: number) {
    let minZ = Infinity;
    scenery.forEach((obj) => {
      obj.position.z += scroll * 0.82;
      minZ = Math.min(minZ, obj.position.z);
    });
    scenery.forEach((obj) => {
      if (obj.position.z > 55) {
        obj.position.z = minZ - 18;
      }
    });
  }

  function finishRace() {
    if (finishShown) return;
    finishShown = true;
    finished = true;
    const ahead = aiRacers.filter((ai) => ai.distance > playerDistance).length;
    showMessage("FINISH " + (ahead + 1) + "/8", 3000);
    cameraShake = 0.03;
  }

  function update(dt: number) {
    if (finished) return;

    if (countdown > 0) {
      if (mode === "multiplayer" && networkState?.status === "countdown") {
        playerSpeed = THREE.MathUtils.lerp(playerSpeed, 0, 0.12);
      } else {
        const elapsed = performance.now() - raceStartedAt;
        countdown = Math.max(0, 3 - Math.floor(elapsed / 900));
      }
      if (countdown === 0) beep(false);
      playerSpeed = THREE.MathUtils.lerp(playerSpeed, 0, 0.1);
    } else {
      const spec = BIKES[playerBikeId] ?? BIKES.starter;
      if (mode === "multiplayer" && networkLocal) {
        playerSpeed = networkLocal.speed ?? playerSpeed;
        playerDistance = networkLocal.distance ?? playerDistance;
        const serverX = (networkLocal.lane - 0.5) * 10.6;
        playerX = THREE.MathUtils.lerp(playerX, serverX, 0.16);
      } else {
        const max = spec.maxSpeed * (boosting ? 1.34 : 1);
        const accel = spec.accel * dt;
        playerSpeed = Math.min(max, playerSpeed + accel);
      if (!boosting && playerSpeed > spec.maxSpeed) playerSpeed = Math.max(spec.maxSpeed, playerSpeed - 20 * dt);
      const lateral = steering * (spec.handling * 0.36) * dt;
      playerX += lateral * (0.7 + playerSpeed / Math.max(spec.maxSpeed, 1));
      playerX = THREE.MathUtils.clamp(playerX, -6.1, 6.1);
        playerDistance += (playerSpeed / 3.6) * dt;
      }

      const worldSpeed = (playerSpeed / 3.6) * 0.62;
      recycleRoadSegments(worldSpeed * dt);
      recycleScenery(worldSpeed * dt);

      aiRacers.forEach((ai, index) => {
        const target = ai.maxSpeed * (0.82 + index * 0.018);
        ai.targetSpeed = target;
        ai.speed = THREE.MathUtils.lerp(ai.speed, ai.targetSpeed, 0.02);
        ai.distance += (ai.speed / 3.6) * dt;
        const desiredX = Math.sin((performance.now() * 0.00035) + index) * 1.2 + ai.lane * 4.8;
        ai.x = THREE.MathUtils.lerp(ai.x, desiredX, 0.012);
        ai.group.position.x = THREE.MathUtils.lerp(ai.group.position.x, ai.x, 0.12);
        ai.group.position.z = 5 - (ai.distance - playerDistance) * 0.04;

        if (ai.group.position.z > 20) {
          ai.group.position.z = -120 - index * 12;
        }
      });

      traffic.forEach((vehicle, index) => {
        vehicle.z += worldSpeed * dt * vehicle.speedFactor;
        vehicle.group.position.z = vehicle.z;
        if (vehicle.z > 28) {
          const lanePool = [-0.82, -0.28, 0.28, 0.78];
          vehicle.lane = lanePool[(index + Math.floor(performance.now() / 1800)) % lanePool.length];
          vehicle.z = -150 - index * 24;
        }
      });

      pickups.forEach((pickup, index) => {
        pickup.rotation.y += dt * 2.2;
        pickup.rotation.z += dt * 1.3;
        pickup.position.z += worldSpeed * dt;
        if (pickup.position.z > 24) pickup.position.z = -240 - index * 60;

        const dx = Math.abs(pickup.position.x - playerX);
        if (dx < 0.95 && Math.abs(pickup.position.z - 5.2) < 1.5) {
          nitro = Math.min(1, nitro + 0.28);
          pickup.position.z = -260 - index * 45;
          showMessage("NITRO +", 520);
          beep(false);
        }
      });

      traffic.forEach((vehicle) => {
        const dz = Math.abs(vehicle.group.position.z - 5.2);
        const dx = Math.abs(vehicle.group.position.x - playerX);
        if (dz < 1.55 && dx < 1.05 && performance.now() - vehicle.lastCollisionAt > 1200) {
          vehicle.lastCollisionAt = performance.now();
          playerSpeed *= 0.46;
          nitro = Math.max(0, nitro - 0.18);
          cameraShake = Math.max(cameraShake, 0.18);
          showMessage("CRASH!", 850);
          beep(false);
        } else if (dz < 1.1 && dx > 1.05 && dx < 2.0 && performance.now() - vehicle.lastCollisionAt > 1400) {
          vehicle.lastCollisionAt = performance.now();
          nitro = Math.min(1, nitro + 0.12);
          cameraShake = Math.max(cameraShake, 0.055);
          showMessage("NEAR MISS +", 620);
        }
      });

      if (mode === "solo" && playerDistance >= 3500) finishRace();
    }

    const normalized = Math.min(1, playerSpeed / 220);
    const targetFov = boosting ? 72 : 61 + normalized * 5;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.09);
    camera.updateProjectionMatrix();

    player.position.x = THREE.MathUtils.lerp(player.position.x, playerX, 0.12);
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -steering * 0.1, 0.12);
    player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, boosting ? -0.04 : 0, 0.08);
    const bob = Math.sin(performance.now() * 0.012 + playerSpeed * 0.02) * 0.018;
    player.position.y = bob;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerX * 0.32, 0.09);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.62 + normalized * 0.15, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, boosting ? 8.15 : 7.5, 0.08);

    cameraShake *= 0.88;
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;

    camera.lookAt(playerX * 0.16, 1.05, -24);

    const flame = player.userData.flame as THREE.Mesh;
    const light = player.userData.nitroLight as THREE.PointLight;
    flame.scale.y = 0.82 + Math.sin(performance.now() * 0.035) * 0.18;
    if (!boosting) {
      flame.visible = false;
      light.intensity = 0;
    }

    if (engineOsc && engineGain && audioContext) {
      engineOsc.frequency.value = 74 + normalized * 168 + (boosting ? 48 : 0);
      engineGain.gain.value = 0.012 + normalized * 0.024 + (boosting ? 0.016 : 0);
    }

    if (countdown > 0) {
      hud.countdown.style.opacity = "1";
      hud.countdown.textContent = countdown === 1 ? "GO!" : String(countdown);
    } else {
      hud.countdown.style.opacity = "0";
    }

    if (messageUntil < performance.now()) {
      hud.message.style.opacity = "0";
    } else {
      hud.message.style.opacity = "1";
      hud.message.textContent = messageText;
    }

    if (mode === "solo") {
      const place = 1 + aiRacers.filter((ai) => ai.distance > playerDistance).length;
      hud.position.textContent = place + "/8";
    } else if (networkLocal) {
      const place = 1 + (networkState?.players ?? []).filter((p: any) => p.id !== networkPlayerId && p.distance > networkLocal.distance).length;
      hud.position.textContent = place + "/" + (networkState?.players?.length ?? 1);
    }

    if (boosting) {
      speedStreaks.forEach((streak, index) => {
        streak.visible = true;
        streak.position.z += (playerSpeed / 3.6) * dt * (1.5 + (index % 4) * 0.25);
        if (streak.position.z > 8) {
          streak.position.z = -90 - Math.random() * 70;
          streak.position.x = (Math.random() - 0.5) * 13.5;
          streak.position.y = 0.35 + Math.random() * 1.9;
        }
      });
    } else {
      speedStreaks.forEach((streak) => {
        streak.visible = false;
      });
    }

    hud.timer.textContent = new Date(Math.max(performance.now() - raceStartedAt, 0)).toISOString().substring(14, 19);
    hud.position.textContent = "1/8";
    hud.speed.textContent = String(Math.round(playerSpeed)).padStart(3, "0");
    hud.speedUnit.textContent = "KM/H";
    hud.nitroFill.style.width = Math.round(nitro * 100) + "%";

    if (realtime && networkRoomId && networkPlayerId && performance.now() - lastNetworkInput > 55) {
      lastNetworkInput = performance.now();
      try {
        realtime.sendInput(networkRoomId, networkPlayerId, {
          steering,
          braking: false,
          useItem: boosting
        });
      } catch {
        // reconnect state
      }
    }
  }

  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  start();
  requestAnimationFrame(frame);

  return {
    destroy() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      realtime?.disconnect();
      void connectPromise;
      audioContext?.close().catch(() => undefined);
      hud.dispose();
      renderer.dispose();
      parent.removeChild(renderer.domElement);
    }
  };
}
