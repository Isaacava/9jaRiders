import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BikeRig } from "./bike";
import { B, BONE_DEFS, buildRiderShape, riderVertexColors, RIDER_LOOKS, type RiderLook } from "./riderShape";
import { rod } from "./util";
import { mergeStatic } from "./merge";
import { dressRider } from "./dress";

export { RIDER_LOOKS };
export type { RiderLook };

export type RiderRig = {
  group: THREE.Group;
  update: (steerAngle: number, tuck: number) => void;
};

// Two-bone IK: writes the middle joint (elbow / knee) for a chain a -> b into `out` (no allocations).
const _kd = new THREE.Vector3(), _kdir = new THREE.Vector3(), _kp = new THREE.Vector3();
function ik(a: THREE.Vector3, b: THREE.Vector3, l1: number, l2: number, bend: THREE.Vector3, out: THREE.Vector3) {
  _kd.copy(b).sub(a);
  let dist = _kd.length();
  const max = l1 + l2 - 0.005;
  if (dist > max) { _kd.setLength(max); dist = max; }
  _kdir.copy(_kd).normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(l1 * l1 - along * along, 0));
  _kp.copy(bend).addScaledVector(_kdir, -bend.dot(_kdir)).normalize();
  return out.copy(a).addScaledVector(_kdir, along).addScaledVector(_kp, h);
}

// One shared geometry per rider look (positions/weights come from the cached body shape).
const GEO = new Map<string, THREE.BufferGeometry>();
export function riderGeometry(id: string, look: RiderLook) {
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
  const qp = new THREE.Quaternion(), qs = new THREE.Quaternion(), qy = new THREE.Quaternion(), qg = new THREE.Quaternion();
  const invG = new THREE.Matrix4(), mTmp = new THREE.Matrix4();
  const vN = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), vD = new THREE.Vector3(), vE = new THREE.Vector3();
  // All maths below is done in the RIDER GROUP's local space, so it stays correct while the bike root is
  // moved, yawed or rolled by the race / garage. sync() refreshes the world matrices once per pose pass;
  // aim() then only touches the bone it changes (no per-call hierarchy walks, no allocations).
  const sync = () => {
    group.updateWorldMatrix(true, true);
    group.getWorldQuaternion(qg);
    invG.copy(group.matrixWorld).invert();
  };
  const aim = (i: number, dir: THREE.Vector3, yaw = 0) => {
    const b = bones[i];
    const par = b.parent as THREE.Object3D;
    mTmp.extractRotation(par.matrixWorld);
    qp.setFromRotationMatrix(mTmp);
    qs.setFromUnitVectors(restDir[i], vN.copy(dir).normalize());
    if (yaw) { qy.setFromAxisAngle(UP, yaw); qs.premultiply(qy); }
    qs.premultiply(qg); // desired world rotation = group rotation * local swing
    b.quaternion.copy(qp.invert().multiply(qs));
    b.updateWorldMatrix(false, false);
  };
  const wpos = (i: number, out: THREE.Vector3) => {
    bones[i].updateWorldMatrix(false, false);
    return out.setFromMatrixPosition(bones[i].matrixWorld).applyMatrix4(invG);
  };

  // ---- seat the rider on the bike
  const lean = bike.riderLean;
  const leanTo = (a: number, out: THREE.Vector3) => out.set(0, Math.cos(a), -Math.sin(a));
  const headDir = leanTo(lean * 0.2, new THREE.Vector3());
  const footDir = new THREE.Vector3(0, -0.14, -1).normalize();
  const armIdx = [B.upperArmR, B.upperArmL]; // grips[0] is x<0 -> the "R" chain
  const gripTo = (k: number, out: THREE.Vector3) => { out.copy(bike.grips[k]).applyMatrix4(bike.steer.matrix); out.y += 0.03; out.z += 0.075; return out; };
  const legBend = [new THREE.Vector3(-0.3, 0.15, -1), new THREE.Vector3(0.3, 0.15, -1)];

  let extraLean = 0; // extra forward lean (rad) used when the bars are further than the arms reach
  const baseHips = bike.seat.clone().add(new THREE.Vector3(0, 0.1, 0.02));
  let shift = 0;      // the rider slides forward/back on the seat (0..14 cm) so both hands always meet the grips
  const poseBody = () => {
    sync();
    bones[B.pelvis].position.set(baseHips.x, baseHips.y, baseHips.z - shift);
    aim(B.pelvis, leanTo(lean * 0.5 + extraLean * 0.2, vA));
    aim(B.spine, leanTo(lean * 1.25 + extraLean * 0.55, vA));
    aim(B.chest, leanTo(lean * 1.55 + extraLean, vA));
    aim(B.neck, leanTo(lean * 0.85 + extraLean * 0.6, vA));
    aim(B.head, headDir);
    // legs: hip -> knee -> ankle, ball of the foot on the peg (x<0 side is the "R" chain)
    for (let side = 0; side < 2; side++) {
      const ti = side === 0 ? B.thighR : B.thighL;
      const peg = bike.pegs[side];
      vB.set(peg.x, peg.y + 0.075 * s, peg.z + 0.1 * s);          // ankle target
      wpos(ti, vC);                                                // hip
      ik(vC, vB, boneLen[ti], boneLen[ti + 1], legBend[side], vD); // knee
      aim(ti, vE.copy(vD).sub(vC));
      aim(ti + 1, vE.copy(vB).sub(vD));
      aim(ti + 2, footDir);
    }
  };
  const refit = () => {
    let need = -9;
    for (let k = 0; k < 2; k++) {
      const ai = armIdx[k];
      need = Math.max(need, wpos(ai, vA).distanceTo(gripTo(k, vB)) - (boneLen[ai] + boneLen[ai + 1] - 0.01));
    }
    let ns = shift, nl = extraLean;
    if (need > 0.004) {
      ns = Math.min(0.14, shift + need);
      const left = need - (ns - shift);
      if (left > 0.004) nl = Math.min(0.5, extraLean + left * 2.2); // slide maxed out: lean in further
    } else if (need < -0.03) {
      if (extraLean > 0) nl = Math.max(0, extraLean + (need + 0.03) * 2.2);
      else ns = Math.max(0, shift + need + 0.03);
    }
    if (Math.abs(ns - shift) > 0.003 || Math.abs(nl - extraLean) > 0.004) { shift = ns; extraLean = nl; poseBody(); }
  };
  bike.steer.rotation.y = 0;
  bike.steer.updateMatrix();
  poseBody();
  refit(); refit(); refit();

  const skinMat = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.5 });
  dressRider(look, shape, bones); // face, hair, glasses, beard, shoes

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
    mergeStatic(hg);
    group.add(hg);
    return hg;
  };
  handGroups.push(makeHand(1), makeHand(-1)); // grips[0] is x<0 so its inner side is +x

  // ---- arms follow the handlebars (only re-solved when the steering / tuck actually changed)
  const bend = [new THREE.Vector3(-0.9, -0.35, 0.25), new THREE.Vector3(0.9, -0.35, 0.25)];
  const handDir = new THREE.Vector3(0, -0.22, -1).normalize();
  let lastSteer = NaN, lastTuck = NaN;
  const update = (steerAngle: number, tuck = 0) => {
    if (Math.abs(steerAngle - lastSteer) < 0.002 && Math.abs(tuck - lastTuck) < 0.01) return;
    lastSteer = steerAngle; lastTuck = tuck;
    bike.steer.rotation.y = steerAngle;
    bike.steer.updateMatrix();
    sync();
    refit();
    for (let k = 0; k < 2; k++) {
      const ai = armIdx[k];
      wpos(ai, vA);                                   // shoulder
      gripTo(k, vB);                                  // wrist target
      ik(vA, vB, boneLen[ai], boneLen[ai + 1], bend[k], vC); // elbow
      aim(ai, vD.copy(vC).sub(vA));
      aim(ai + 1, vD.copy(vB).sub(vC));
      aim(ai + 2, handDir);
      handGroups[k].position.copy(bike.grips[k]).applyMatrix4(bike.steer.matrix);
      handGroups[k].rotation.y = steerAngle;
    }
    aim(B.head, vD.copy(headDir).setY(headDir.y - tuck * 0.05), -steerAngle * 0.8);
  };
  update(0, 0);
  return { group, update };
}
