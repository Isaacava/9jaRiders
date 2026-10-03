import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

export function placeRod(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  const len = Math.max(d.length(), 0.0001);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}

export function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 10
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, segments), material);
  placeRod(m, a, b);
  m.castShadow = true;
  return m;
}

export function paint(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.3,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ...opts
  });
}

export function std(color: number, roughness = 0.7, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

export function shadowAll(root: THREE.Object3D, cast = true, receive = false) {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
