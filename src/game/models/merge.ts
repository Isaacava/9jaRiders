import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const matKey = (m: THREE.Material) => {
  const x = m as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
  return [
    m.type, x.color ? x.color.getHex() : 0, x.roughness ?? 0, x.metalness ?? 0, m.transparent ? 1 : 0, m.opacity, m.side,
    x.vertexColors ? 1 : 0, x.emissive ? x.emissive.getHex() : 0, x.emissiveIntensity ?? 0, x.clearcoat ?? 0, x.map ? x.map.uuid : ""
  ].join("|");
};

/** Normalise a geometry so different primitives can be merged: indexed, position + normal + uv (+ color). */
function prep(src: THREE.BufferGeometry, wantColor: boolean): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = src.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  g.setAttribute("position", pos.clone());
  g.setAttribute("normal", src.getAttribute("normal") ? (src.getAttribute("normal") as THREE.BufferAttribute).clone() : new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("uv", src.getAttribute("uv") ? (src.getAttribute("uv") as THREE.BufferAttribute).clone() : new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (wantColor) {
    const c = src.getAttribute("color") as THREE.BufferAttribute | undefined;
    g.setAttribute("color", c ? c.clone() : new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  }
  if (src.index) g.setIndex(src.index.clone());
  else { const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  return g;
}

/**
 * Merge every static, non-skinned mesh below `group` into one mesh per material (in `group`'s local space).
 * Anything for which `keep(obj)` is true (and its descendants) is left alone, e.g. wheels, flames, steering.
 * Cuts draw calls dramatically: a rider or bike goes from ~60-100 meshes to a handful.
 */
export function mergeStatic(group: THREE.Object3D, keep: (o: THREE.Object3D) => boolean = () => false) {
  group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; shadow: boolean }>();
  const doomed: THREE.Mesh[] = [];

  const visit = (o: THREE.Object3D) => {
    if (o !== group && keep(o)) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(m.material) && m.geometry.getAttribute("position")) {
      const mat = m.material as THREE.Material;
      const hasColor = !!(mat as THREE.MeshStandardMaterial).vertexColors;
      const key = matKey(mat);
      let b = buckets.get(key);
      if (!b) { b = { mat, geos: [], shadow: false }; buckets.set(key, b); }
      const g = prep(m.geometry, hasColor);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      b.geos.push(g);
      b.shadow = b.shadow || m.castShadow;
      doomed.push(m);
    }
    for (const c of [...o.children]) visit(c);
  };
  visit(group);

  for (const m of doomed) { m.parent?.remove(m); m.geometry.dispose(); }
  for (const b of buckets.values()) {
    if (!b.geos.length) continue;
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.shadow;
    group.add(mesh);
    if (b.geos.length > 1) for (const g of b.geos) g.dispose();
  }
}
