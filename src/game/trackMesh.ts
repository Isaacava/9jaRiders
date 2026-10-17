import * as THREE from "three";
import { Track, type Frame } from "./track";

const CHUNK = 160; // metres per ribbon piece (so far-away pieces can be frustum culled)

function build(track: Track, d0: number, d1: number, mat: THREE.Material, vertex: (d: number, side: 0 | 1, p: THREE.Vector3, n: THREE.Vector3) => void, uv: (d: number, side: 0 | 1) => [number, number]) {
  const group = new THREE.Group();
  group.userData.noBend = true;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let a = d0; a < d1; a += CHUNK) {
    const b = Math.min(d1, a + CHUNK);
    const count = Math.max(1, Math.ceil((b - a) / track.step));
    const pos: number[] = [], nrm: number[] = [], uvs: number[] = [], idx: number[] = [];
    for (let i = 0; i <= count; i++) {
      const d = a + ((b - a) * i) / count;
      for (const side of [0, 1] as const) {
        vertex(d, side, p, n);
        pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z);
        const t = uv(d, side); uvs.push(t[0], t[1]);
      }
      if (i > 0) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

/** Generic strip along the route: `vertex` writes the position/normal of each edge point (side 0 or 1) at distance d. */
export function strip(track: Track, d0: number, d1: number, mat: THREE.Material, vertex: (d: number, side: 0 | 1, p: THREE.Vector3, n: THREE.Vector3) => void, vScale = 8, shadow = true) {
  const g = build(track, d0, d1, mat, vertex, (d, side) => [side, d / vScale]);
  if (shadow) g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return g;
}

/** Flat strip lying on the road surface between lateral offsets x0..x1 at height y (follows curves and flyovers). */
export function ribbon(track: Track, x0: number, x1: number, y: number, d0: number, d1: number, mat: THREE.Material, vScale = 24, elev = true) {
  const f: Frame = { px: 0, py: 0, pz: 0, th: 0 };
  return build(track, d0, d1, mat, (d, side, p, n) => {
    track.frame(d, f, elev);
    const x = side ? x1 : x0;
    p.set(f.px + Math.cos(f.th) * x, f.py + y, f.pz + Math.sin(f.th) * x);
    n.set(0, 1, 0);
  }, (d, side) => [side, d / vScale]);
}

/** Vertical strip at lateral offset x from height yBottom(d) to yTop(d) ABOVE THE ROAD SURFACE: barriers, bridge sides, retaining walls. */
export function wall(track: Track, x: number, yBottom: number | ((d: number) => number), yTop: number | ((d: number) => number), d0: number, d1: number, mat: THREE.Material, facing: 1 | -1 = 1) {
  const f: Frame = { px: 0, py: 0, pz: 0, th: 0 };
  const yb = typeof yBottom === "number" ? () => yBottom : yBottom;
  const yt = typeof yTop === "number" ? () => yTop : yTop;
  return build(track, d0, d1, mat, (d, side, p, n) => {
    track.frame(d, f, true);
    p.set(f.px + Math.cos(f.th) * x, f.py + (side ? yt(d) : yb(d)), f.pz + Math.sin(f.th) * x);
    n.set(Math.cos(f.th) * facing, 0, Math.sin(f.th) * facing);
  }, (d, side) => [side, d / 8]);
}

const _fr: Frame = { px: 0, py: 0, pz: 0, th: 0 };
const _F = new THREE.Matrix4(), _M = new THREE.Matrix4(), _v = new THREE.Vector3();

/**
 * Takes a world that was built along a straight road (x lateral, z = -distance) and lays it onto the winding route:
 * every instance / mesh / line is re-placed in the frame of the route at its own distance. Scenery that would fold
 * through the inside of a tight curve, or stand where a flyover passes over it, is hidden.
 * Objects flagged userData.noBend are left alone (ribbons, lights); userData.onRoad objects also follow the road height.
 */
export function bendWorld(group: THREE.Object3D, track: Track) {
  const frameFor = (d: number, elev: boolean) => {
    track.frame(d, _fr, elev);
    _F.makeRotationY(-_fr.th);
    _F.setPosition(_fr.px, _fr.py, _fr.pz);
    return _F;
  };
  /** true when something at lateral offset x / distance d must not be drawn */
  const hidden = (x: number, d: number) => {
    const k = track.curvature(d);
    if (Math.abs(k) > 1e-5) {
      const xc = -1 / k; // lateral position of the corner's centre
      if (x * xc > 0 && Math.abs(x) > Math.abs(xc) * 0.72) return true;
    }
    return track.height(d) > 1.2 && Math.abs(x) < 17;
  };

  for (const c of [...group.children]) {
    if (c.userData.noBend || (c as THREE.Light).isLight) continue;
    const elev = !!c.userData.onRoad;
    const im = c as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, _M);
        const e = _M.elements, x = e[12], d = -e[14];
        if (hidden(x, d)) { _M.makeScale(0, 0, 0); im.setMatrixAt(i, _M); continue; }
        e[14] = 0;
        _M.premultiply(frameFor(d, false));
        im.setMatrixAt(i, _M);
      }
      im.instanceMatrix.needsUpdate = true;
      im.boundingSphere = null;
      im.computeBoundingSphere();
      continue;
    }
    const line = c as THREE.Line;
    if (line.isLine || (c as THREE.LineSegments).isLineSegments || (c as THREE.Points).isPoints) {
      const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        frameFor(-z, false);
        _v.set(pos.getX(i), pos.getY(i), 0).applyMatrix4(_F);
        pos.setXYZ(i, _v.x, _v.y, _v.z);
      }
      pos.needsUpdate = true;
      line.geometry.computeBoundingSphere();
      continue;
    }
    // plain mesh / group
    c.updateMatrix();
    _M.copy(c.matrix);
    const e = _M.elements, x = e[12], d = -e[14];
    if (!elev && hidden(x, d)) { c.visible = false; continue; }
    e[14] = 0;
    _M.premultiply(frameFor(d, elev));
    c.matrix.copy(_M);
    c.matrixAutoUpdate = false;
    c.matrixWorldNeedsUpdate = true;
  }
}
