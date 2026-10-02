
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getSharedRealtimeClient } from "./multiplayer";

function PhaserLikeClamp(value: number) { return Math.min(1, Math.max(-1, value)); }

type Mode = "solo" | "multiplayer";

type BikeSpec = {
  color: number;
  accent: number;
  maxSpeed: number;
  accel: number;
  handling: number;
  silhouette: "street" | "sport" | "cruiser" | "futuristic" | "superbike";
};

type RiderSpec = {
  jacket: number;
  accent: number;
  hair: number;
  skin: number;
  build: number;
  hairStyle: "short" | "braids" | "locs" | "bun" | "high";
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
  starter: { color: 0x14a89c, accent: 0xf1c64d, maxSpeed: 150, accel: 88, handling: 8.4, silhouette: "street" },
  speed: { color: 0x2779dc, accent: 0xf39a4a, maxSpeed: 185, accel: 112, handling: 9.4, silhouette: "sport" },
  heavy: { color: 0xbd4a42, accent: 0xe2e0d5, maxSpeed: 168, accel: 76, handling: 6.8, silhouette: "cruiser" },
  elite: { color: 0x8159c6, accent: 0x69dcff, maxSpeed: 202, accel: 128, handling: 8.8, silhouette: "futuristic" },
  legendary: { color: 0xd0a02b, accent: 0xffefac, maxSpeed: 220, accel: 138, handling: 9.1, silhouette: "superbike" }
};

const RIDERS: Record<string, RiderSpec> = {
  main: { jacket: 0x138e85, accent: 0xf2c94c, hair: 0x211715, skin: 0x956345, build: 1.0, hairStyle: "short" },
  ada: { jacket: 0x8056bd, accent: 0xf2d0a9, hair: 0x27131f, skin: 0x8d5c45, build: 0.96, hairStyle: "braids" },
  kobby: { jacket: 0xbe514a, accent: 0xeee4d8, hair: 0x121212, skin: 0x7e5039, build: 1.07, hairStyle: "locs" },
  tobi: { jacket: 0xe0792b, accent: 0x172024, hair: 0x2b170e, skin: 0x956043, build: 1.01, hairStyle: "high" },
  "cpu-01": { jacket: 0x246ba6, accent: 0xf2c94c, hair: 0x2a1a13, skin: 0x81543e, build: 0.98, hairStyle: "short" },
  "cpu-02": { jacket: 0x2c8c5c, accent: 0xf5e5ca, hair: 0x151515, skin: 0x784a35, build: 1.03, hairStyle: "short" },
  "cpu-03": { jacket: 0xb34b89, accent: 0x65d9f4, hair: 0x281623, skin: 0x8d5a42, build: 0.95, hairStyle: "bun" },
  "cpu-04": { jacket: 0x6555bd, accent: 0xe7c06d, hair: 0x1b1512, skin: 0x7b503b, build: 1.01, hairStyle: "high" },
  "cpu-05": { jacket: 0x9f4c38, accent: 0xf0e9dc, hair: 0x111111, skin: 0x754733, build: 1.06, hairStyle: "locs" },
  "cpu-06": { jacket: 0xd26132, accent: 0x9ee8db, hair: 0x1a120e, skin: 0x925c43, build: 0.99, hairStyle: "short" },
  "cpu-07": { jacket: 0xae8628, accent: 0xffefaa, hair: 0x23160f, skin: 0x80513b, build: 1.04, hairStyle: "short" }
};

type RaceModelPack = {
  bikes: Record<string, THREE.Group>;
  riders: THREE.Group;
  traffic: Record<Traffic["kind"], THREE.Group>;
  environments: Record<keyof typeof EXTERNAL_ENVIRONMENT_ASSETS, THREE.Group>;
};

const EXTERNAL_BIKE_ASSETS: Record<string, string> = {
  starter: "https://cdn.3dassets.dev/assets/15423/v1/model.glb",
  speed: "https://cdn.3dassets.dev/assets/15424/v1/model.glb",
  heavy: "https://cdn.3dassets.dev/assets/15428/v1/model.glb",
  elite: "https://cdn.3dassets.dev/assets/15416/v1/model.glb",
  legendary: "https://cdn.3dassets.dev/assets/15415/v1/model.glb"
};

const EXTERNAL_TRAFFIC_ASSETS: Record<Traffic["kind"], string> = {
  // Exact assets requested from 3DAssets.dev.
  danfo: "air-land-sea-vehicles-city-bus-0c71b14a",
  // Existing free catalogue models kept for Lagos-specific traffic placeholders.
  keke: "https://cdn.3dassets.dev/assets/34283/v1/model.glb",
  minibus: "https://cdn.3dassets.dev/assets/32486/v1/model.glb",
  sedan: "air-land-sea-vehicles-city-hatchback-da84bd12",
  suv: "car-park-and-road-vehicle-fleet-executive-saloon-4895d629",
  van: "car-park-and-road-vehicle-fleet-double-cab-pickup-cano-aa92dedb"
};

const EXTERNAL_ENVIRONMENT_ASSETS = {
  busStation: "https://cdn.3dassets.dev/assets/34221/v1/model.glb",
  market: "https://cdn.3dassets.dev/assets/34323/v1/model.glb"
} as const;

type LoadedAsset = THREE.Group | null;

async function resolve3DAssetUrl(slugOrUrl: string) {
  if (slugOrUrl.startsWith("http")) return slugOrUrl;

  const response = await fetch(
    `/api/3dassets?slug=${encodeURIComponent(slugOrUrl)}`,
    { cache: "force-cache" }
  );
  if (!response.ok) throw new Error(`3D asset lookup failed: ${slugOrUrl}`);
  const data = await response.json() as { cdnUrl?: string };
  if (!data.cdnUrl) throw new Error(`3D asset has no CDN URL: ${slugOrUrl}`);
  return data.cdnUrl;
}

async function loadOptionalAsset(loader: GLTFLoader, slugOrUrl: string): Promise<LoadedAsset> {
  try {
    return (await loader.loadAsync(await resolve3DAssetUrl(slugOrUrl))).scene;
  } catch (error) {
    console.warn("3DAssets.dev asset unavailable:", slugOrUrl, error);
    return null;
  }
}

async function loadRaceModelPack() {
  const loader = new GLTFLoader();
  const bikeIds = Object.keys(EXTERNAL_BIKE_ASSETS);
  const trafficKinds = Object.keys(EXTERNAL_TRAFFIC_ASSETS) as Traffic["kind"][];
  const environmentIds = Object.keys(EXTERNAL_ENVIRONMENT_ASSETS) as Array<keyof typeof EXTERNAL_ENVIRONMENT_ASSETS>;

  const [riderResult, bikeResults, trafficResults, environmentResults] = await Promise.all([
    loader.loadAsync("/assets/models/riders.glb"),
    Promise.all(bikeIds.map((id) => loadOptionalAsset(loader, EXTERNAL_BIKE_ASSETS[id]))),
    Promise.all(trafficKinds.map((kind) => loadOptionalAsset(loader, EXTERNAL_TRAFFIC_ASSETS[kind]))),
    Promise.all(environmentIds.map((id) => loadOptionalAsset(loader, EXTERNAL_ENVIRONMENT_ASSETS[id])))
  ]);

  const bikes: Record<string, THREE.Group> = {};
  const traffic = {} as Record<Traffic["kind"], THREE.Group>;
  const environments = {} as Record<keyof typeof EXTERNAL_ENVIRONMENT_ASSETS, THREE.Group>;

  bikeIds.forEach((bikeId, index) => {
    if (bikeResults[index]) bikes[bikeId] = bikeResults[index] as THREE.Group;
  });

  trafficKinds.forEach((kind, index) => {
    if (trafficResults[index]) traffic[kind] = trafficResults[index] as THREE.Group;
  });

  environmentIds.forEach((id, index) => {
    if (environmentResults[index]) environments[id] = environmentResults[index] as THREE.Group;
  });

  return {
    bikes,
    riders: riderResult.scene,
    traffic,
    environments
  };
}

function cloneLoadedModel(source: THREE.Object3D, label: string) {
  if (!source) throw new Error("Missing race model: " + label);
  return source.clone(true) as THREE.Group;
}

function fitModel(model: THREE.Object3D, targetHeight: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (size.y <= 0.001) return;
  const scale = targetHeight / size.y;
  model.scale.multiplyScalar(scale);
}

function fitBikeModel(model: THREE.Object3D, targetLength: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  if (size.z <= 0.001) return;
  const scale = targetLength / size.z;
  model.scale.multiplyScalar(scale);
}

function prepareLoadedRiderBike(pack: RaceModelPack, bikeId: string, riderId: string, player = false) {
  const root = new THREE.Group();
  const bike = cloneLoadedModel(pack.bikes[bikeId] ?? pack.bikes.starter, "bike-" + bikeId);
  const rider = cloneLoadedModel(pack.riders, "rider-" + riderId);

  // 3DAssets.dev bikes face +Z; Aboki Riders drives toward -Z.
  root.rotation.y = Math.PI;

  fitBikeModel(bike, player ? 2.55 : 2.15);
  rider.scale.setScalar(player ? 0.92 : 0.72);
  fitModel(rider, player ? 2.45 : 1.98);
  rider.position.y = player ? 0.48 : 0.38;

  const wheels: THREE.Object3D[] = [];
  bike.traverse((object) => {
    if (/wheel/i.test(object.name)) wheels.push(object);
  });

  root.add(bike, rider);
  root.userData.modelBacked = true;
  root.userData.bikeModel = bike;
  root.userData.riderModel = rider;
  root.userData.wheels = wheels;
  return root;
}

function prepareLoadedTraffic(pack: RaceModelPack, kind: Traffic["kind"]) {
  const source = pack.traffic[kind];
  if (!source) return null;

  const model = cloneLoadedModel(source, "traffic-" + kind);
  const targetHeights: Record<Traffic["kind"], number> = {
    danfo: 2.9,
    keke: 2.15,
    minibus: 1.75,
    sedan: 1.55,
    suv: 1.82,
    van: 1.86
  };
  fitModel(model, targetHeights[kind]);
  model.rotation.y = Math.PI;
  model.userData.modelBacked = true;
  const wheels: THREE.Object3D[] = [];
  model.traverse((object) => {
    if (/wheel/i.test(object.name)) wheels.push(object);
  });
  model.userData.wheels = wheels;
  return model;
}

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
  const bodyMat = material(bike.color, 0.42, 0.16);
  const accentMat = material(bike.accent, 0.4, 0.18);
  const carbonMat = material(0x101417, 0.72, 0.24);
  const metalMat = material(0x556064, 0.34, 0.72);

  const rearRadius = bike.silhouette === "cruiser" ? 0.64 : 0.57;
  const frontRadius = bike.silhouette === "cruiser" ? 0.50 : 0.48;

  const rearWheel = wheel(0x778186, rearRadius, 0.2);
  rearWheel.position.set(0, rearRadius, 0.72);
  root.add(rearWheel);

  const frontWheel = wheel(0x778186, frontRadius, 0.17);
  frontWheel.position.set(0, frontRadius, -1.43);
  root.add(frontWheel);

  const wheelBase = bike.silhouette === "cruiser" ? 1.24 : 1.0;
  const engineWidth = bike.silhouette === "cruiser" ? 0.9 : 0.72;
  const engine = new THREE.Mesh(
    new RoundedBoxGeometry(engineWidth, 0.5, 0.72, 5, 0.09),
    material(0x2e373b, 0.38, 0.62)
  );
  engine.position.set(0, 0.82, 0.05);
  engine.castShadow = true;
  root.add(engine);

  const lowerRailL = cylinderBetween(
    new THREE.Vector3(-engineWidth * 0.42, 0.9, 0.55),
    new THREE.Vector3(-0.22, 0.56, 0.05),
    0.06,
    frameMat
  );
  const lowerRailR = lowerRailL.clone();
  lowerRailR.position.x *= -1;
  root.add(lowerRailL, lowerRailR);

  const tank = new THREE.Mesh(
    new RoundedBoxGeometry(
      bike.silhouette === "cruiser" ? 1.28 : bike.silhouette === "sport" ? 0.92 : 1.08,
      bike.silhouette === "cruiser" ? 0.52 : 0.44,
      bike.silhouette === "sport" ? 1.2 : 0.98,
      6,
      0.11
    ),
    bodyMat
  );
  tank.position.set(0, bike.silhouette === "cruiser" ? 1.07 : 1.12, -0.05);
  tank.rotation.x = bike.silhouette === "sport" ? 0.12 : 0;
  tank.castShadow = true;
  root.add(tank);

  const seat = new THREE.Mesh(
    new RoundedBoxGeometry(
      bike.silhouette === "cruiser" ? 0.78 : 0.64,
      0.18,
      bike.silhouette === "cruiser" ? 1.16 : 1.02,
      5,
      0.06
    ),
    carbonMat
  );
  seat.position.set(0, bike.silhouette === "cruiser" ? 1.17 : 1.28, 0.45);
  root.add(seat);

  const tail = new THREE.Mesh(
    new RoundedBoxGeometry(
      bike.silhouette === "cruiser" ? 0.96 : bike.silhouette === "superbike" ? 0.76 : 0.86,
      bike.silhouette === "cruiser" ? 0.32 : 0.30,
      bike.silhouette === "superbike" ? 0.94 : 0.78,
      5,
      0.08
    ),
    accentMat
  );
  tail.position.set(0, bike.silhouette === "cruiser" ? 0.99 : 1.01, 0.82);
  root.add(tail);

  if (bike.silhouette === "sport" || bike.silhouette === "superbike") {
    const fairing = new THREE.Mesh(
      new RoundedBoxGeometry(1.02, 0.66, 1.08, 6, 0.1),
      bodyMat
    );
    fairing.position.set(0, 1.34, -0.68);
    fairing.rotation.x = 0.08;
    root.add(fairing);

    const windshield = new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 0.26, 0.10, 4, 0.03),
      material(0x29434b, 0.2, 0.14)
    );
    windshield.position.set(0, 1.72, -0.92);
    root.add(windshield);

    const wing = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.06, 0.56, 3, 0.02),
      accentMat
    );
    wing.rotation.y = 0.16;
    wing.position.set(-0.62, 1.30, -0.62);
    const wingR = wing.clone();
    wingR.position.x *= -1;
    wingR.rotation.y *= -1;
    root.add(wing, wingR);
  } else {
    const lampHousing = new THREE.Mesh(
      new RoundedBoxGeometry(0.44, 0.25, 0.22, 5, 0.06),
      carbonMat
    );
    lampHousing.position.set(0, 1.48, -0.96);
    root.add(lampHousing);
  }

  if (bike.silhouette === "futuristic") {
    const sideBlade = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.42, 0.76, 3, 0.04),
      accentMat
    );
    sideBlade.rotation.z = 0.16;
    sideBlade.position.set(-0.62, 1.1, 0.05);
    const sideBladeR = sideBlade.clone();
    sideBladeR.position.x *= -1;
    sideBladeR.rotation.z *= -1;
    root.add(sideBlade, sideBladeR);
  }

  if (bike.silhouette === "cruiser") {
    const wideBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 1.22, 12),
      frameMat
    );
    wideBar.rotation.z = Math.PI / 2;
    wideBar.position.set(0, 1.62, -0.82);
    root.add(wideBar);

    const twinPipeA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 1.0, 16),
      metalMat
    );
    twinPipeA.rotation.x = Math.PI / 2;
    twinPipeA.position.set(0.42, 0.78, 0.52);
    const twinPipeB = twinPipeA.clone();
    twinPipeB.position.x *= -1;
    root.add(twinPipeA, twinPipeB);
  } else {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.05, bike.silhouette === "sport" ? 0.78 : 0.96, 12),
      frameMat
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.6, -0.84);
    root.add(bar);

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.085, bike.silhouette === "superbike" ? 1.08 : 0.96, 14),
      metalMat
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(bike.silhouette === "sport" ? 0.52 : 0.44, 0.78, bike.silhouette === "superbike" ? 0.34 : 0.5);
    root.add(exhaust);
  }

  const rearLight = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.09, 0.08, 3, 0.03),
    emissiveMaterial(0xf0443b, 2.2)
  );
  rearLight.position.set(0, 1.10, 1.18);
  root.add(rearLight);

  const headlamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 10),
    emissiveMaterial(0xffefad, 2.5)
  );
  headlamp.scale.set(1.1, 0.75, 0.5);
  headlamp.position.set(0, bike.silhouette === "sport" || bike.silhouette === "superbike" ? 1.62 : 1.51, -1.03);
  root.add(headlamp);

  const riderRoot = new THREE.Group();
  const posture = bike.silhouette === "sport" || bike.silhouette === "superbike" ? -0.34 : bike.silhouette === "cruiser" ? 0.0 : -0.18;
  riderRoot.position.set(0, bike.silhouette === "cruiser" ? 1.42 : 1.54, bike.silhouette === "cruiser" ? 0.22 : 0.14);
  riderRoot.rotation.x = posture;
  riderRoot.scale.setScalar(rider.build);
  root.add(riderRoot);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.68, 6, 14),
    material(rider.jacket, 0.68, 0)
  );
  torso.scale.set(1.0, 1.0, 0.62);
  torso.rotation.x = -0.28;
  torso.castShadow = true;
  riderRoot.add(torso);

  const shoulderBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.84, 0.22, 0.38, 5, 0.06),
    material(rider.jacket, 0.68, 0)
  );
  shoulderBar.position.set(0, 0.16, 0.02);
  shoulderBar.rotation.x = -0.18;
  riderRoot.add(shoulderBar);

  const backPanel = new THREE.Mesh(
    new RoundedBoxGeometry(0.40, 0.28, 0.045, 4, 0.02),
    material(rider.accent, 0.58, 0)
  );
  backPanel.position.set(0, 0.04, 0.215);
  riderRoot.add(backPanel);

  const belt = new THREE.Mesh(
    new RoundedBoxGeometry(0.62, 0.09, 0.36, 4, 0.02),
    material(0x1b2327, 0.82, 0.04)
  );
  belt.position.set(0, -0.30, 0.03);
  riderRoot.add(belt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.235, 20, 14),
    material(rider.skin, 0.72, 0)
  );
  head.scale.set(0.94, 1.0, 0.92);
  head.position.set(0, 0.78, -0.13);
  riderRoot.add(head);

  const hairBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.72),
    material(rider.hair, 0.92, 0)
  );
  hairBase.scale.set(1.04, 0.88, 1.02);
  hairBase.position.set(0, 0.88, -0.17);
  riderRoot.add(hairBase);

  if (rider.hairStyle === "braids") {
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 2; i += 1) {
        const braid = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.055, 0.42, 4, 8),
          material(rider.hair, 0.94, 0)
        );
        braid.position.set(sx * (0.19 + i * 0.07), 0.52, -0.03 + i * 0.03);
        braid.rotation.z = sx * 0.16;
        riderRoot.add(braid);
      }
    }
  } else if (rider.hairStyle === "bun") {
    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 10),
      material(rider.hair, 0.94, 0)
    );
    bun.position.set(0, 1.04, 0.02);
    riderRoot.add(bun);
  } else if (rider.hairStyle === "high") {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 10),
      material(rider.hair, 0.94, 0)
    );
    puff.scale.set(0.86, 1.28, 0.86);
    puff.position.set(0, 1.06, 0.03);
    riderRoot.add(puff);
  } else if (rider.hairStyle === "locs") {
    for (const sx of [-1, 1]) {
      const lock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.05, 0.48, 4, 8),
        material(rider.hair, 0.94, 0)
      );
      lock.position.set(sx * 0.19, 0.65, 0.01);
      lock.rotation.z = sx * 0.12;
      riderRoot.add(lock);
    }
  }

  const leftArm = cylinderBetween(
    new THREE.Vector3(-0.30, 0.14, -0.03),
    new THREE.Vector3(-0.44, 0.0, -0.78),
    0.092,
    material(rider.jacket, 0.70, 0)
  );
  const rightArm = cylinderBetween(
    new THREE.Vector3(0.30, 0.14, -0.03),
    new THREE.Vector3(0.44, 0.0, -0.78),
    0.092,
    material(rider.jacket, 0.70, 0)
  );
  riderRoot.add(leftArm, rightArm);

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 12, 8),
    material(rider.skin, 0.78, 0)
  );
  hand.position.set(-0.44, -0.005, -0.79);
  const handR = hand.clone();
  handR.position.x *= -1;
  riderRoot.add(hand, handR);

  const leftLeg = cylinderBetween(
    new THREE.Vector3(-0.23, -0.28, 0.08),
    new THREE.Vector3(-0.34, -0.64, 0.46),
    0.108,
    material(0x252d33, 0.84, 0.02)
  );
  const rightLeg = leftLeg.clone();
  rightLeg.position.x *= -1;
  riderRoot.add(leftLeg, rightLeg);

  const boot = new THREE.Mesh(
    new RoundedBoxGeometry(0.18, 0.28, 0.34, 4, 0.04),
    material(0x11171a, 0.9, 0.02)
  );
  boot.position.set(-0.34, -0.78, 0.56);
  const bootR = boot.clone();
  bootR.position.x *= -1;
  riderRoot.add(boot, bootR);

  root.userData.riderRoot = riderRoot;
  root.userData.wheels = [rearWheel, frontWheel];

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const nitroLight = new THREE.PointLight(0x54d7ff, 0, 5.0);
  nitroLight.position.set(0, 0.62, 1.22);
  root.add(nitroLight);
  root.userData.nitroLight = nitroLight;

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.20, 0.95, 12),
    emissiveMaterial(0x53d8ff, 4.5)
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0.62, 1.48);
  flame.scale.set(0.72, 1, 0.85);
  flame.visible = false;
  root.add(flame);
  root.userData.flame = flame;

  return root;
}

function createTraffic(kind: Traffic["kind"]) {
  const group = new THREE.Group();
  const bodyColor = TRAFFIC_COLORS[kind];
  const bodyMat = material(bodyColor, 0.58, 0.06);
  const glassMat = material(0x29474f, 0.22, 0.12);
  const darkMat = material(0x1a2023, 0.9, 0.02);
  const metalMat = material(0x6c777b, 0.34, 0.45);
  const redMat = emissiveMaterial(0xe8473f, 1.6);

  const dims =
    kind === "sedan" ? [2.52, 1.48, 4.35] :
    kind === "keke" ? [2.12, 1.52, 3.55] :
    kind === "suv" ? [2.82, 1.86, 4.62] :
    kind === "van" ? [2.72, 1.95, 4.68] :
    kind === "minibus" ? [2.68, 1.84, 4.52] :
    [2.74, 1.92, 4.62];

  const body = new THREE.Mesh(
    new RoundedBoxGeometry(dims[0], dims[1], dims[2], 6, 0.16),
    bodyMat
  );
  body.position.y = 0.92;
  group.add(body);

  const cabinDepth = kind === "sedan" ? 1.55 : 2.05;
  const cabinHeight = kind === "sedan" ? 1.55 : 1.72;
  const cabin = new THREE.Mesh(
    new RoundedBoxGeometry(dims[0] * (kind === "keke" ? 0.84 : 0.86), cabinHeight - 0.78, cabinDepth, 5, 0.11),
    glassMat
  );
  cabin.position.set(0, cabinHeight, 0.15);
  group.add(cabin);

  const rearPanelHeight = kind === "sedan" ? 0.42 : kind === "keke" ? 0.55 : 0.64;
  const rearPanel = new THREE.Mesh(
    new RoundedBoxGeometry(dims[0] * 0.78, rearPanelHeight, 0.10, 4, 0.02),
    darkMat
  );
  rearPanel.position.set(0, kind === "sedan" ? 0.82 : 0.74, dims[2] / 2 + 0.05);
  group.add(rearPanel);

  const tailL = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.13, 0.08, 3, 0.02), redMat);
  tailL.position.set(-dims[0] * 0.31, kind === "sedan" ? 0.92 : 0.88, dims[2] / 2 + 0.09);
  const tailR = tailL.clone();
  tailR.position.x *= -1;
  group.add(tailL, tailR);

  const bumper = new THREE.Mesh(
    new RoundedBoxGeometry(dims[0] * 0.84, 0.20, 0.16, 3, 0.03),
    darkMat
  );
  bumper.position.set(0, 0.50, dims[2] / 2 + 0.10);
  group.add(bumper);

  const plate = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.16, 0.03, 2, 0.01),
    material(0xf0e8d6, 0.55, 0.05)
  );
  plate.position.set(0, 0.70, dims[2] / 2 + 0.12);
  group.add(plate);

  if (kind === "danfo") {
    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(dims[0] * 0.92, 0.16, dims[2] * 0.86, 4, 0.05),
      material(0xbdbab2, 0.68, 0.04)
    );
    roof.position.set(0, 1.96, 0);
    group.add(roof);

    const stripe = new THREE.Mesh(
      new RoundedBoxGeometry(dims[0] * 0.90, 0.10, dims[2] * 0.90, 3, 0.02),
      material(0x202326, 0.86, 0.01)
    );
    stripe.position.set(0, 1.12, 0);
    group.add(stripe);

    const routeBoard = new THREE.Mesh(
      new RoundedBoxGeometry(1.0, 0.16, 0.48, 3, 0.03),
      material(0xf3dc83, 0.68, 0.01)
    );
    routeBoard.position.set(0, 2.14, 0.38);
    group.add(routeBoard);

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.44, 0.10),
      metalMat
    );
    handle.position.set(dims[0] * 0.43, 0.95, dims[2] * 0.10);
    group.add(handle);
  } else if (kind === "keke") {
    const canopy = new THREE.Mesh(
      new RoundedBoxGeometry(dims[0] * 1.02, 0.14, dims[2] * 0.88, 3, 0.04),
      darkMat
    );
    canopy.position.set(0, 2.0, 0);
    group.add(canopy);

    for (const x of [-0.76, 0, 0.76]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.16, 10),
        metalMat
      );
      post.position.set(x, 1.43, 1.62);
      group.add(post);
    }
  } else if (kind === "suv") {
    const spare = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.16, 20),
      darkMat
    );
    spare.rotation.z = Math.PI / 2;
    spare.position.set(0, 1.06, dims[2] / 2 + 0.16);
    group.add(spare);
  } else if (kind === "van") {
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.65, 0.10),
      material(0x879297, 0.62, 0.2)
    );
    divider.position.set(0, 1.18, dims[2] / 2 + 0.09);
    group.add(divider);
  }

  const wheelRadius = kind === "keke" ? 0.32 : kind === "sedan" ? 0.39 : 0.45;
  for (const x of [-dims[0] * 0.42, dims[0] * 0.42]) {
    for (const z of [-dims[2] * 0.33, dims[2] * 0.33]) {
      const wheelMesh = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius, kind === "keke" ? 0.065 : 0.085, 10, 22),
        darkMat
      );
      wheelMesh.rotation.y = Math.PI / 2;
      wheelMesh.position.set(x, wheelRadius + 0.03, z);
      group.add(wheelMesh);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.40, wheelRadius * 0.40, 0.20, 16),
        metalMat
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, wheelRadius + 0.03, z);
      group.add(hub);
    }
  }

  const vehicleWheels: THREE.Object3D[] = [];
  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry && mesh.geometry.type === "CylinderGeometry") vehicleWheels.push(mesh);
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  group.userData.wheels = vehicleWheels;
  return group;
}

function createUtilityPole() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.15, 7.2, 10),
    material(0x5a6265, 0.88, 0.18)
  );
  pole.position.y = 3.6;
  group.add(pole);

  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.11, 0.11),
    material(0x3e474a, 0.82, 0.24)
  );
  cross.position.y = 6.15;
  group.add(cross);

  for (const x of [-0.67, 0, 0.67]) {
    const insulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.23, 8),
      material(0xcdd2ce, 0.6, 0.02)
    );
    insulator.position.set(x, 6.32, 0);
    group.add(insulator);
  }

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return group;
}

function createRoadsideFence() {
  const group = new THREE.Group();
  const railMat = material(0x71797b, 0.84, 0.24);

  for (let x = -3; x <= 3; x += 1.5) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 1.35, 8),
      railMat
    );
    post.position.set(x, 0.68, 0);
    group.add(post);
  }

  for (const y of [0.34, 0.76, 1.10]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.045, 0.045),
      railMat
    );
    rail.position.y = y;
    group.add(rail);
  }

  return group;
}

function createStreetSign(text: string, background: number) {
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#" + background.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111417";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = "#fff8e9";
  ctx.font = "900 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.86),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  board.position.y = 2.3;
  group.add(board);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 2.2, 8),
    material(0x596166, 0.82, 0.22)
  );
  post.position.y = 1.1;
  group.add(post);

  group.userData.texture = texture;
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

  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0x37c8ff, transparent: true, opacity: 0.12 })
  );
  group.add(aura);

  const core = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.80, 0.42, 5, 0.08),
    emissiveMaterial(0x46d8ff, 3.6)
  );
  group.add(core);

  const ringTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.055, 10, 28),
    emissiveMaterial(0xc5f7ff, 2.4)
  );
  ringTop.rotation.x = Math.PI / 2;
  ringTop.position.y = 0.05;
  group.add(ringTop);

  const ringMid = ringTop.clone();
  ringMid.rotation.z = Math.PI / 2;
  ringMid.position.y = 0.05;
  group.add(ringMid);

  const light = new THREE.PointLight(0x46d8ff, 4.2, 7);
  light.position.y = 0.12;
  group.add(light);

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

  const speedDial = document.createElement("div");
  speedDial.style.position = "absolute";
  speedDial.style.right = "16px";
  speedDial.style.top = "14px";
  speedDial.style.width = "82px";
  speedDial.style.height = "82px";
  speedDial.style.borderRadius = "50%";
  speedDial.style.background = "radial-gradient(circle at 50% 55%, rgba(25,31,34,.98) 0 52%, rgba(12,16,18,.98) 53% 100%)";
  speedDial.style.border = "3px solid rgba(255,255,255,.84)";
  speedDial.style.boxShadow = "0 8px 24px rgba(0,0,0,.32), inset 0 0 18px rgba(92,224,255,.14)";
  speedDial.style.pointerEvents = "none";
  hud.appendChild(speedDial);

  const speed = document.createElement("div");
  speed.style.position = "absolute";
  speed.style.inset = "18px 0 auto";
  speed.style.textAlign = "center";
  speed.style.fontSize = "22px";
  speed.style.fontWeight = "950";
  speed.style.lineHeight = "1";
  speed.style.letterSpacing = "-0.02em";
  speedDial.appendChild(speed);

  const speedUnit = document.createElement("div");
  speedUnit.style.position = "absolute";
  speedUnit.style.left = "0";
  speedUnit.style.right = "0";
  speedUnit.style.bottom = "18px";
  speedUnit.style.textAlign = "center";
  speedUnit.style.fontSize = "7px";
  speedUnit.style.fontWeight = "900";
  speedUnit.style.opacity = "0.8";
  speedDial.appendChild(speedUnit);

  const gear = document.createElement("div");
  gear.style.position = "absolute";
  gear.style.left = "50%";
  gear.style.top = "-8px";
  gear.style.transform = "translateX(-50%)";
  gear.style.minWidth = "28px";
  gear.style.padding = "3px 5px";
  gear.style.borderRadius = "6px";
  gear.style.background = "#f2c94c";
  gear.style.color = "#111417";
  gear.style.fontSize = "8px";
  gear.style.fontWeight = "950";
  gear.style.textAlign = "center";
  speedDial.appendChild(gear);

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
    gear,
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
  scene.background = new THREE.Color(0x7fc9dc);
  scene.fog = new THREE.Fog(0x7fc9dc, 58, 230);

  const camera = new THREE.PerspectiveCamera(61, 1, 0.1, 500);
  camera.position.set(0, 2.42, 6.25);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  parent.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.6, 0.78);
  composer.addPass(bloom);

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

  const asphaltCanvas = document.createElement("canvas");
  asphaltCanvas.width = 256;
  asphaltCanvas.height = 512;
  const asphaltCtx = asphaltCanvas.getContext("2d")!;
  asphaltCtx.fillStyle = "#35383a";
  asphaltCtx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i += 1) {
    const v = 35 + Math.floor(Math.random() * 45);
    asphaltCtx.fillStyle = `rgb(${v},${v + 2},${v + 3})`;
    const size = Math.random() < 0.9 ? 1 : 2;
    asphaltCtx.fillRect(Math.random() * 256, Math.random() * 512, size, size);
  }
  const asphaltTexture = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTexture.wrapS = THREE.RepeatWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(1, 3.5);
  asphaltTexture.anisotropy = 8;

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    color: 0xffffff,
    roughness: 0.93,
    metalness: 0.02
  });
  const dirtMat = material(0x8e7259, 1);
  const curbDark = material(0x222629, 0.92);
  const curbYellow = material(0xe1b522, 0.66);
  const laneMat = material(0xf2ead7, 0.66);

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

  const skylineMat = material(0x45545c, 0.96, 0.01);
  const skylineWindow = emissiveMaterial(0x9ed6d4, 0.35);
  for (let i = 0; i < 18; i += 1) {
    const h = 11 + (i % 6) * 3;
    const w = 5 + (i % 4) * 1.5;
    const building = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, 4.8, 4, 0.14),
      skylineMat
    );
    building.position.set((i % 2 === 0 ? -1 : 1) * (22 + (i % 5) * 4), h / 2 - 0.5, -125 - Math.floor(i / 2) * 8);
    scene.add(building);
    for (let row = 0; row < 3; row += 1) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.55, 0.12, 0.04),
        skylineWindow
      );
      win.position.set(building.position.x, 3 + row * 3.0, building.position.z - 2.42);
      scene.add(win);
    }
  }

  const scenery: THREE.Object3D[] = [];
  for (let i = 0; i < 56; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -20 - Math.floor(i / 2) * 13 - (i % 3) * 4;
    let obj: THREE.Object3D;
    if (i % 17 === 0) obj = createStreetSign("LAGOS", 0x0f765e);
    else if (i % 13 === 0) obj = createStreetSign("BUS STOP", 0xc49322);
    else if (i % 11 === 0) obj = createBillboard();
    else if (i % 7 === 0) obj = createUtilityPole();
    else if (i % 6 === 0) obj = createRoadsideFence();
    else if (i % 5 === 0) obj = createPalm();
    else obj = createShop(i % 4 === 0 ? 0xc48b5a : i % 4 === 1 ? 0x9d7457 : i % 4 === 2 ? 0x7e9162 : 0x9b6a59);

    obj.position.set(side * (11 + (i % 5) * 1.4), 0, z);
    obj.scale.setScalar(0.82 + (i % 5) * 0.10);
    scene.add(obj);
    scenery.push(obj);
  }

  const playerBikeId = typeof window !== "undefined"
    ? window.localStorage.getItem("aboki:bike") || "starter"
    : "starter";
  const playerRiderId = typeof window !== "undefined"
    ? window.localStorage.getItem("aboki:rider") || "main"
    : "main";

  const player = createBikeAndRider(playerBikeId, playerRiderId, 1.12);
  player.position.set(0, 0, 3.85);
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
  [-0.55, 0.08, 0.62, -0.2, 0.48].forEach((lane, index) => {
    const pickup = createNitroPickup();
    pickup.scale.setScalar(1.55);
    pickup.position.set(lane * 5.15, 1.45, -22 - index * 48);
    scene.add(pickup);
    pickups.push(pickup);
  });

  const hud = makeHud(parent);

  const raceModelsPromise = loadRaceModelPack().then((pack) => {
    const realPlayer = prepareLoadedRiderBike(pack, playerBikeId, playerRiderId, true);
    const playerIndex = scene.children.indexOf(player);
    if (playerIndex >= 0) scene.remove(player);
    realPlayer.position.copy(player.position);
    scene.add(realPlayer);

    for (const ai of aiRacers) {
      const next = prepareLoadedRiderBike(pack, ai.bikeId, ai.riderId, false);
      next.position.copy(ai.group.position);
      scene.remove(ai.group);
      ai.group = next;
      scene.add(next);
    }

    for (const vehicle of traffic) {
      const next = prepareLoadedTraffic(pack, vehicle.kind);
      if (!next) continue;
      next.position.copy(vehicle.group.position);
      scene.remove(vehicle.group);
      vehicle.group = next;
      scene.add(vehicle.group);
    }

    for (const [id, remote] of remoteRacers) {
      const next = prepareLoadedRiderBike(pack, remote.bikeId, remote.riderId, false);
      next.position.copy(remote.group.position);
      next.rotation.copy(remote.group.rotation);
      scene.remove(remote.group);
      remote.group = next;
      remoteRacers.set(id, remote);
      scene.add(next);
    }

    const environmentPlacements = [
      ["busStation", -1, -112, 0.72],
      ["market", 1, -236, 0.94],
      ["busStation", 1, -412, 0.68],
      ["market", -1, -548, 0.92]
    ] as const;

    environmentPlacements.forEach(([kind, side, z, scale]) => {
      const source = pack.environments[kind];
      if (!source) return;
      const setPiece = source.clone(true);
      setPiece.scale.setScalar(scale);
      setPiece.position.set(side * 19, 0, z);
      setPiece.userData.externalEnvironment = kind;
      scene.add(setPiece);
      scenery.push(setPiece);
    });

    return { player: realPlayer };
  }).catch((error) => {
    console.error("3D model pack load failed; keeping deterministic fallback.", error);
    return { player };
  });

  let activePlayer = player;

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

  raceModelsPromise.then(({ player: modelPlayer }) => {
    activePlayer = modelPlayer;
  });

  function resize() {
    width = Math.max(parent.clientWidth, 1);
    height = Math.max(parent.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
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
    const flame = activePlayer.userData.flame as THREE.Mesh;
    const light = activePlayer.userData.nitroLight as THREE.PointLight;
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
      playerX = THREE.MathUtils.clamp(playerX, -5.0, 5.0);
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
        ai.group.rotation.z = THREE.MathUtils.lerp(
          ai.group.rotation.z,
          PhaserLikeClamp(ai.x - ai.group.position.x) * -0.05,
          0.08
        );
        const aiWheels = ai.group.userData.wheels as THREE.Object3D[] | undefined;
        aiWheels?.forEach((wheelObject) => {
          wheelObject.rotation.x -= (ai.speed / 3.6) * dt / 0.5;
        });
        const aiRiderRoot = ai.group.userData.riderRoot as THREE.Group | undefined;
        if (aiRiderRoot) aiRiderRoot.rotation.z = THREE.MathUtils.lerp(aiRiderRoot.rotation.z, 0, 0.08);

        if (ai.group.position.z > 20) {
          ai.group.position.z = -120 - index * 12;
        }
      });

      traffic.forEach((vehicle, index) => {
        vehicle.z += worldSpeed * dt * vehicle.speedFactor;
        vehicle.group.position.z = vehicle.z;
        vehicle.group.rotation.y = Math.sin(performance.now() * 0.0008 + index) * 0.004;
        const trafficWheels = vehicle.group.userData.wheels as THREE.Object3D[] | undefined;
        trafficWheels?.forEach((wheelObject) => {
          wheelObject.rotation.x -= (worldSpeed * vehicle.speedFactor * dt) / 0.43;
        });
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

    activePlayer.position.x = THREE.MathUtils.lerp(activePlayer.position.x, playerX, 0.12);
    activePlayer.rotation.z = THREE.MathUtils.lerp(
      activePlayer.rotation.z,
      -steering * (boosting ? 0.14 : 0.11),
      0.14
    );
    activePlayer.rotation.x = THREE.MathUtils.lerp(
      activePlayer.rotation.x,
      boosting ? -0.055 : playerSpeed > 130 ? -0.018 : 0,
      0.10
    );

    const bob = Math.sin(performance.now() * 0.012 + playerSpeed * 0.02) * (0.012 + normalized * 0.035);
    activePlayer.position.y = bob;

    const riderRoot = activePlayer.userData.riderRoot as THREE.Group | undefined;
    if (riderRoot) {
      riderRoot.rotation.z = THREE.MathUtils.lerp(
        riderRoot.rotation.z,
        -steering * 0.055,
        0.18
      );
    }

    const playerWheels = activePlayer.userData.wheels as THREE.Object3D[] | undefined;
    playerWheels?.forEach((wheelObject, index) => {
      wheelObject.rotation.x -=
        (playerSpeed / 3.6) * dt / (index === 0 ? 0.57 : 0.48);
    });

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerX * 0.55, 0.12);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.62 + normalized * 0.15, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, boosting ? 6.95 : 6.25, 0.08);

    cameraShake *= 0.88;
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;

    camera.lookAt(playerX * 0.42, 1.18, -26);

    const flame = activePlayer.userData.flame as THREE.Mesh;
    const light = activePlayer.userData.nitroLight as THREE.PointLight;
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
    hud.speed.textContent = String(Math.round(playerSpeed)).padStart(3, "0");
    hud.speedUnit.textContent = "KM/H";
    hud.gear.textContent = "G" + Math.min(6, Math.max(1, Math.floor(playerSpeed / 38) + 1));
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
    composer.render();
    requestAnimationFrame(frame);
  }

  start();
  requestAnimationFrame(frame);

  return {
    ready: raceModelsPromise,
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
      composer.dispose();
      renderer.dispose();
      asphaltTexture.dispose();
      parent.removeChild(renderer.domElement);
    }
  };
}
