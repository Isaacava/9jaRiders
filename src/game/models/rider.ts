import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BikeRig } from "./bike";
import { B, BONE_DEFS, buildRiderShape, riderVertexColors, RIDER_LOOKS, type RiderLook } from "./riderShape";
import { rod } from "./util";

export { RIDER_LOOKS };
export type { RiderLook };

export type RiderRig = {
  group: THREE.Group;
  update: (steerAngle: number, tuck: number) => void;
};

// Two-bone IK: returns the middle joint (elbow / knee) for a chain a -> b.
function ik(a: THREE.Vector3, b: THREE.Vector3, l1: number, l2: number, bend: THREE.Vector3) {
  const d = b.clone().sub(a);
  let dist = d.length();
  const max = l1 + l2 - 0.005;
  if (dist > max) { d.setLength(max); dist = max; }
  const dir = d.clone().normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(l1 * l1 - along * along, 0));
  const perp = bend.clone().sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize();
  return a.clone().addScaledVector(dir, along).addScaledVector(perp, h);
}

// One shared geometry per rider look (positions/weights come from the cached body shape).
const GEO = new Map<string, THREE.BufferGeometry>();
function riderGeometry(id: string, look: RiderLook) {
  let g = GEO.get(id);
  if (g) return g;
  const sh = buildRiderShape(look.female, look.build);
  g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(sh.mesh.pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(sh.mesh.nrm, 3));
  g.setAttribute("color", new THREE.BufferAttribute(riderVertexColors(sh, look), 3));
  g.setAttribute("skinIndex", new THREE.BufferAttribute(sh.skinIndex, 4));
  g.setAttribute("skinWeight", new THREE.BufferAttribute(sh.skinWeight, 4));
  g.setIndex(new THREE.BufferAttribute(sh.mesh.idx, 1));
  GEO.set(id, g);
  return g;
}

export function buildRider(look: RiderLook, bike: BikeRig, lookId = "main"): RiderRig {
  const group = new THREE.Group();
  const shape = buildRiderShape(look.female, look.build);
  const s = shape.s;
  const J = shape.joints;
  const jv = (n: string) => new THREE.Vector3(J[n][0], J[n][1], J[n][2]);

  // ---- armature (same 17-bone layout as the Blender script)
  const bones = BONE_DEFS.map((d) => { const b = new THREE.Bone(); b.name = d.name; return b; });
  BONE_DEFS.forEach((d, i) => {
    if (d.parent < 0) bones[i].position.copy(jv(d.joint));
    else {
      bones[i].position.copy(jv(d.joint).sub(jv(BONE_DEFS[d.parent].joint)));
      bones[d.parent].add(bones[i]);
    }
  });
  const skeleton = new THREE.Skeleton(bones);
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02 });
  const body = new THREE.SkinnedMesh(riderGeometry(lookId, look), bodyMat);
  body.frustumCulled = false;
  body.castShadow = true;
  body.add(bones[0]);
  group.add(body);
  body.bind(skeleton);

  const restDir = BONE_DEFS.map((d) => jv(d.child).sub(jv(d.joint)).normalize());
  const boneLen = BONE_DEFS.map((d) => jv(d.child).distanceTo(jv(d.joint)));
  const UP = new THREE.Vector3(0, 1, 0);
  const qp = new THREE.Quaternion(), qs = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const aim = (i: number, dir: THREE.Vector3, yaw = 0) => {
    const b = bones[i];
    const par = b.parent as THREE.Object3D;
    par.updateWorldMatrix(true, false);
    par.getWorldQuaternion(qp);
    qs.setFromUnitVectors(restDir[i], dir.clone().normalize());
    if (yaw) { qy.setFromAxisAngle(UP, yaw); qs.premultiply(qy); }
    b.quaternion.copy(qp.invert().multiply(qs));
    b.updateWorldMatrix(false, false);
  };
  const wpos = (i: number) => {
    bones[i].updateWorldMatrix(true, false);
    return new THREE.Vector3().setFromMatrixPosition(bones[i].matrixWorld);
  };

  // ---- seat the rider on the bike
  const hips = bike.seat.clone().add(new THREE.Vector3(0, 0.1, 0.02));
  const lean = bike.riderLean;
  const leanDir = (a: number) => new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
  const headDir = leanDir(lean * 0.2);
  const footDir = new THREE.Vector3(0, -0.14, -1).normalize();
  const armIdx = [B.upperArmR, B.upperArmL]; // grips[0] is x<0 -> the "R" chain
  const gripPoint = (k: number) => new THREE.Vector3().copy(bike.grips[k]).applyMatrix4(bike.steer.matrix).add(new THREE.Vector3(0, 0.03, 0.075));

  const poseBody = (h: THREE.Vector3) => {
    bones[B.pelvis].position.copy(h);
    aim(B.pelvis, leanDir(lean * 0.5));
    aim(B.spine, leanDir(lean * 1.25));
    aim(B.chest, leanDir(lean * 1.55));
    aim(B.neck, leanDir(lean * 0.85));
    aim(B.head, headDir);
    // legs: hip -> knee -> ankle, ball of the foot on the peg (x<0 side is the "R" chain)
    for (const side of [-1, 1]) {
      const ti = side === -1 ? B.thighR : B.thighL;
      const peg = bike.pegs[side === -1 ? 0 : 1];
      const ankle = peg.clone().add(new THREE.Vector3(0, 0.075 * s, 0.1 * s));
      const H = wpos(ti);
      const K = ik(H, ankle, boneLen[ti], boneLen[ti + 1], new THREE.Vector3(side * 0.3, 0.15, -1));
      aim(ti, K.clone().sub(H));
      aim(ti + 1, ankle.clone().sub(K));
      aim(ti + 2, footDir);
    }
  };
  bike.steer.rotation.y = 0;
  bike.steer.updateMatrix();
  poseBody(hips);
  // if the bars are out of reach, slide forward on the seat (up to 12 cm) so the hands meet the grips
  let deficit = 0;
  for (let k = 0; k < 2; k++) {
    const ai = armIdx[k];
    deficit = Math.max(deficit, wpos(ai).distanceTo(gripPoint(k)) - (boneLen[ai] + boneLen[ai + 1] - 0.01));
  }
  if (deficit > 0.005) {
    hips.z -= Math.min(0.12, deficit);
    poseBody(hips);
  }

  // ---- face + hair, parented to the head bone
  const headBone = bones[B.head];
  const hp = jv("head");
  const attach = <T extends THREE.Object3D>(o: T, wx: number, wy: number, wz: number) => {
    o.position.set(wx * s - hp.x, wy * s - hp.y, wz * s - hp.z);
    o.traverse((c) => { c.castShadow = true; });
    headBone.add(o);
    return o;
  };
  const skinMat = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a21b, roughness: 0.3, metalness: 0.7 });
  const sph = (r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1) => {
    const x = new THREE.Mesh(new THREE.SphereGeometry(r * s, 16, 12), m);
    x.scale.set(sx, sy, sz);
    return x;
  };

  attach(sph(0.021, skinMat, 1, 1.15, 1.2), 0, 1.7, -0.098); // nose
  attach(sph(0.03, new THREE.MeshStandardMaterial({ color: 0x5a2a26, roughness: 0.45 }), 1.5, 0.45, 0.5), 0, 1.655, -0.1); // lips
  for (const sx of [-1, 1]) {
    attach(sph(0.026, skinMat, 0.45, 1.1, 0.8), sx * 0.09, 1.71, 0.005); // ears
    if (!look.glasses) {
      const eye = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 });
      attach(sph(0.011, eye, 1.2, 0.8, 0.5), sx * 0.036, 1.738, -0.094);
    }
  }
  if (look.glasses) {
    const lensMat = new THREE.MeshPhysicalMaterial({ color: look.lens, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      attach(new THREE.Mesh(new THREE.TorusGeometry(0.034 * s, 0.0045 * s, 8, 28), gold), sx * 0.046, 1.738, -0.099);
      attach(new THREE.Mesh(new THREE.CircleGeometry(0.033 * s, 24), lensMat), sx * 0.046, 1.738, -0.0985);
      const arm = rod(new THREE.Vector3(sx * 0.08 * s, 1.738 * s, -0.093 * s), new THREE.Vector3(sx * 0.092 * s, 1.725 * s, 0), 0.0035 * s, gold, 6);
      arm.position.sub(hp);
      headBone.add(arm);
    }
    attach(new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.006 * s, 0.006 * s), gold), 0, 1.745, -0.101);
  }
  if (look.hoops) {
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.022 * s, 0.0042 * s, 8, 18), gold);
      h.rotation.y = Math.PI / 2;
      attach(h, sx * 0.093, 1.665, 0.005);
    }
  }
  if (look.beard) {
    attach(sph(0.082, hairMat, 0.98, 0.9, 0.88), 0, 1.635, -0.042);
    attach(sph(0.03, hairMat, 1.8, 0.35, 0.6), 0, 1.677, -0.1); // moustache
  }

  if (look.hairStyle === "afro") {
    const geo = new THREE.IcosahedronGeometry(0.2 * s, 4);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 1 + 0.05 * Math.sin(v.x * 40 + v.y * 23) * Math.cos(v.z * 37 - v.y * 11) + 0.03 * Math.sin(v.x * 90 + v.z * 70);
      v.multiplyScalar(n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const afro = new THREE.Mesh(geo, hairMat);
    afro.scale.set(1.04, 0.98, 0.88);
    attach(afro, 0, 1.805, 0.07);
  } else if (look.hairStyle === "fade") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
    cap.scale.set(1, 1.2, 1.1);
    attach(cap, 0, 1.745, 0);
  } else if (look.hairStyle === "braids") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.scale.set(1.02, 1.2, 1.12);
    attach(cap, 0, 1.745, 0.005);
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI * 1.5 - Math.PI * 0.75; // sweep around the sides and back
      const bx = Math.sin(a) * 0.095, bz = 0.01 + Math.cos(a) * 0.095;
      const pts = [
        new THREE.Vector3(bx, 1.8, bz), new THREE.Vector3(bx * 1.2, 1.72, bz * 1.25),
        new THREE.Vector3(bx * 1.22, 1.6, bz * 1.4 + 0.02), new THREE.Vector3(bx * 1.2, 1.5, bz * 1.5 + 0.05)
      ].map((q) => q.multiplyScalar(s).sub(hp));
      headBone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011 * s, 6), hairMat));
    }
  } else if (look.hairStyle === "gele") {
    // Nigerian gele headwrap: wrapped base, folded fan and knot, gold band
    const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.108 * s, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    wrap.scale.set(1.05, 1.2, 1.13);
    attach(wrap, 0, 1.735, 0.012);
    const fold = (r: number, sx: number, sy: number, sz: number, rz: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 22, 14), hairMat);
      m.scale.set(sx, sy, sz); m.rotation.z = rz;
      attach(m, x, y, z);
    };
    fold(0.1, 1.9, 0.55, 0.95, 0.38, 0.05, 1.885, -0.005);
    fold(0.09, 1.6, 0.5, 0.85, -0.28, -0.065, 1.845, 0.025);
    fold(0.06, 1.2, 0.7, 0.8, 0.9, 0.125, 1.835, -0.01);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.108 * s, 0.006 * s, 8, 32), new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4, metalness: 0.5 }));
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.04, 1.12, 1);
    attach(band, 0, 1.775, 0.008);
  } else if (look.hairStyle === "headscarf") {
    // headscarf with the face left open, draping to the shoulders
    const scarfMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.8, side: THREE.DoubleSide });
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.113 * s, 28, 18, 5.61, 4.48, 0, Math.PI * 0.78), scarfMat);
    top.scale.set(1.06, 1.24, 1.14);
    attach(top, 0, 1.735, 0.012);
    const drape = new THREE.Mesh(new THREE.SphereGeometry(0.115 * s, 24, 16, 5.5, 4.28, Math.PI * 0.4, Math.PI * 0.45), scarfMat);
    drape.scale.set(1.12, 1.7, 1.2);
    attach(drape, 0, 1.6, 0.02);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.005 * s, 8, 24, 4.4), new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4, metalness: 0.5 }));
    edge.rotation.set(Math.PI / 2, 0, Math.PI * 0.68);
    edge.scale.set(1.05, 1.12, 1);
    attach(edge, 0, 1.75, 0.012);
  } else if (look.hairStyle === "locs") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.scale.set(1.03, 1.2, 1.12);
    attach(cap, 0, 1.745, 0.005);
    attach(sph(0.06, hairMat, 1.05, 0.9, 1), 0, 1.865, 0.03); // bun
    for (let i = 0; i < 15; i++) {
      const a = ((i / 14) - 0.5) * Math.PI * 1.24; // back half only, keeps the face clear
      const bx = Math.sin(a) * 0.095, bz = 0.012 + Math.cos(a) * 0.095;
      const sway = Math.sin(i * 2.1) * 0.012;
      const pts = [
        new THREE.Vector3(bx, 1.81, bz), new THREE.Vector3(bx * 1.18, 1.73, bz * 1.22),
        new THREE.Vector3(bx * 1.16 + sway, 1.63, bz * 1.38 + 0.03), new THREE.Vector3(bx * 1.12 + sway * 1.5, 1.55 - (i % 3) * 0.02, bz * 1.45 + 0.06)
      ].map((q) => q.multiplyScalar(s).sub(hp));
      headBone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.015 * s, 7), hairMat));
    }
  } else {
    const capMat = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.6 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.104 * s, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    dome.scale.set(1, 1.18, 1.1);
    attach(dome, 0, 1.745, 0);
    const brim = new THREE.Mesh(new RoundedBoxGeometry(0.17 * s, 0.012 * s, 0.1 * s, 2, 0.005), capMat);
    brim.rotation.x = 0.1;
    attach(brim, 0, 1.775, -0.14);
  }


  // ---- hands: fingers wrap the grips (bar axis = X, forward = -Z), placed at the grip each frame
  const handGroups: THREE.Group[] = [];
  const makeHand = (inner: number) => {
    const hg = new THREE.Group();
    const rho = 0.0295; // grip radius + finger radius
    const P = (x: number, phi: number) => new THREE.Vector3(x, rho * Math.cos(phi), -rho * Math.sin(phi));
    const finger = (pts: THREE.Vector3[], rad: number) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4), 14, rad, 8), skinMat);
      m.castShadow = true;
      hg.add(m);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), skinMat);
      tip.position.copy(pts[pts.length - 1]);
      hg.add(tip);
    };
    const curl = [1.0, 1.06, 1.02, 0.88];
    for (let i = 0; i < 4; i++) {
      const x = inner * (0.034 - i * 0.0225);
      const c = curl[i];
      finger([new THREE.Vector3(x, 0.036, 0.055), P(x, -0.55), P(x, 0.45), P(x, 1.35 * c), P(x, 2.35 * c), P(x, 2.95 * c)], 0.0088);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 6), skinMat); // knuckle
      kn.position.copy(P(x, -0.4)); hg.add(kn);
    }
    const tx = inner * 0.052;
    finger([new THREE.Vector3(tx, 0.03, 0.05), new THREE.Vector3(tx, 0.006, 0.034), new THREE.Vector3(tx, -0.02, 0.018), new THREE.Vector3(tx, -0.03, -0.012)], 0.0098);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 10), skinMat);
    palm.scale.set(1.15, 0.55, 0.95);
    palm.position.set(0, 0.036, 0.042);
    palm.castShadow = true;
    hg.add(palm);
    group.add(hg);
    return hg;
  };
  handGroups.push(makeHand(1), makeHand(-1)); // grips[0] is x<0 so its inner side is +x

  // ---- arms follow the handlebars every frame
  const bend = [new THREE.Vector3(-0.9, -0.35, 0.25), new THREE.Vector3(0.9, -0.35, 0.25)];
  const g = new THREE.Vector3();
  const handDir = new THREE.Vector3(0, -0.22, -1).normalize();
  const update = (steerAngle: number, tuck = 0) => {
    bike.steer.rotation.y = steerAngle;
    bike.steer.updateMatrix();
    for (let k = 0; k < 2; k++) {
      const ai = armIdx[k];
      const S = wpos(ai);
      g.copy(gripPoint(k));
      const E = ik(S, g, boneLen[ai], boneLen[ai + 1], bend[k]);
      aim(ai, E.clone().sub(S));
      aim(ai + 1, g.clone().sub(E));
      aim(ai + 2, handDir);
      handGroups[k].position.copy(bike.grips[k]).applyMatrix4(bike.steer.matrix);
      handGroups[k].rotation.y = steerAngle;
    }
    aim(B.head, headDir.clone().add(new THREE.Vector3(0, -tuck * 0.05, 0)), -steerAngle * 0.8);
  };
  update(0, 0);
  return { group, update };
}
