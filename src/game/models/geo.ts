import * as THREE from "three";
import type { MeshData } from "./sdf";

export function toGeometry(m: MeshData, colors?: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(m.nrm, 3));
  if (colors) g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  g.computeBoundingSphere();
  return g;
}
