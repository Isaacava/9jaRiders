import * as THREE from "three";
import { getBike } from "../loadout";
import { BIKE_STYLE, buildBike, type BikeRig } from "./bike";
import { buildRider, RIDER_LOOKS, type RiderRig } from "./rider";

export type Racer3D = {
  root: THREE.Group; // positioned/yawed by the race
  pivot: THREE.Group; // roll / pitch
  bike: BikeRig;
  rider: RiderRig;
};

export function buildRacer(bikeId: string, riderId: string): Racer3D {
  const def = getBike(bikeId);
  const style = BIKE_STYLE[def.id] ?? "sport";
  const bike = buildBike(style, def.color, style === "dirt" ? 0xf2f2f2 : 0x15181c);
  const lookId = RIDER_LOOKS[riderId] ? riderId : "main";
  const rider = buildRider(RIDER_LOOKS[lookId], bike, lookId);
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.add(bike.root, rider.group);
  root.add(pivot);
  return { root, pivot, bike, rider };
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      (Array.isArray(mat) ? mat : [mat]).forEach((x) => x?.dispose());
    }
  });
}
