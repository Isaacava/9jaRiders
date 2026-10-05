import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BikeRig } from "./bike";
import { B, BONE_DEFS, buildRiderShape, riderVertexColors, RIDER_LOOKS, type RiderLook } from "./riderShape";
import { rod } from "./util";
import { mergeStatic } from "./merge";

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
  const lipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.skin).multiplyScalar(0.55).lerp(new THREE.Color(0x6a2a2c), 0.45), roughness: 0.4 });
  const hairMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.3 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.25 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a21b, roughness: 0.3, metalness: 0.7 });
  const sph = (r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1) => {
    const x = new THREE.Mesh(new THREE.SphereGeometry(r * s, 18, 14), m);
    x.scale.set(sx, sy, sz);
    return x;
  };

  // eyes (white + iris + highlight), brows, nose (bridge + tip + wings), lips, chin, ears
  for (const sx of [-1, 1]) {
    attach(sph(0.0175, white, 1.3, 0.85, 0.5), sx * 0.037, 1.742, -0.092);
    attach(sph(0.0105, dark, 1, 1, 0.5), sx * 0.037, 1.742, -0.1);
    attach(sph(0.0035, white, 1, 1, 0.5), sx * 0.04, 1.746, -0.106);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055 * s, 0.03 * s, 4, 8), dark);
    brow.rotation.z = Math.PI / 2 + sx * 0.14;
    attach(brow, sx * 0.039, 1.77, -0.088);
    attach(sph(0.029, skinMat, 0.5, 1.15, 0.85), sx * 0.091, 1.712, 0.005); // ears
    attach(sph(0.0125, skinMat, 1, 0.9, 0.9), sx * 0.015, 1.693, -0.099);   // nostril wings
    attach(sph(0.025, skinMat, 1, 0.8, 0.5), sx * 0.052, 1.683, -0.082);    // cheeks
  }
  const bridge = rod(new THREE.Vector3(0, 1.745 * s, -0.09 * s), new THREE.Vector3(0, 1.7 * s, -0.103 * s), 0.0105 * s, skinMat, 8);
  bridge.position.sub(hp);
  headBone.add(bridge);
  attach(sph(0.0175, skinMat, 1, 1, 1.05), 0, 1.695, -0.106);   // nose tip
  attach(sph(0.021, lipMat, 1.55, 0.5, 0.65), 0, 1.664, -0.097); // upper lip
  attach(sph(0.023, lipMat, 1.5, 0.55, 0.65), 0, 1.649, -0.094); // lower lip
  attach(sph(0.026, skinMat, 1.2, 0.8, 0.8), 0, 1.622, -0.082);  // chin

  if (look.glasses) {
    const lensMat = new THREE.MeshPhysicalMaterial({ color: look.lens, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      attach(new THREE.Mesh(new THREE.TorusGeometry(0.034 * s, 0.0045 * s, 8, 28), gold), sx * 0.046, 1.742, -0.108);
      attach(new THREE.Mesh(new THREE.CircleGeometry(0.033 * s, 24), lensMat), sx * 0.046, 1.742, -0.1075);
      const arm = rod(new THREE.Vector3(sx * 0.08 * s, 1.742 * s, -0.1 * s), new THREE.Vector3(sx * 0.092 * s, 1.73 * s, 0), 0.0035 * s, gold, 6);
      arm.position.sub(hp);
      headBone.add(arm);
    }
    attach(new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.006 * s, 0.006 * s), gold), 0, 1.748, -0.11);
  }
  if (look.hoops) {
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.024 * s, 0.0045 * s, 8, 18), gold);
      h.rotation.y = Math.PI / 2;
      attach(h, sx * 0.094, 1.672, 0.005);
    }
  }
  if (look.beard) {
    attach(sph(0.082, hairMat, 0.98, 0.78, 0.82), 0, 1.628, -0.05);
    attach(sph(0.03, hairMat, 1.8, 0.32, 0.6), 0, 1.68, -0.104); // moustache
  }

  // hair: every style leaves the face open (front edge sits at the hairline above the brows)
  const hairCap = (theta: number, tilt: number, mat: THREE.Material, rad = 0.1, ox = 1.02, oy = 1.2, oz = 1.12) => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rad * s, 24, 14, 0, Math.PI * 2, 0, Math.PI * theta), mat);
    cap.scale.set(ox, oy, oz);
    cap.rotation.x = tilt; // front edge rises to a hairline, back edge drops
    return cap;
  };
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
    attach(afro, 0, 1.83, 0.085);
  } else if (look.hairStyle === "fade") {
    attach(hairCap(0.5, 0.5, hairMat, 0.1, 1.0, 1.22, 1.1), 0, 1.76, 0.008);
  } else if (look.hairStyle === "braids") {
    attach(hairCap(0.55, 0.5, hairMat, 0.1, 1.02, 1.22, 1.12), 0, 1.76, 0.012);
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI * 1.35 - Math.PI * 0.675; // back + sides only
      const bx = Math.sin(a) * 0.095, bz = 0.015 + Math.cos(a) * 0.095;
      const pts = [
        new THREE.Vector3(bx, 1.81, bz), new THREE.Vector3(bx * 1.2, 1.73, bz * 1.25),
        new THREE.Vector3(bx * 1.22, 1.61, bz * 1.4 + 0.02), new THREE.Vector3(bx * 1.2, 1.5, bz * 1.5 + 0.05)
      ].map((q) => q.multiplyScalar(s).sub(hp));
      headBone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011 * s, 6), hairMat));
    }
  } else if (look.hairStyle === "locs") {
    attach(hairCap(0.55, 0.5, hairMat, 0.1, 1.03, 1.22, 1.12), 0, 1.76, 0.012);
    attach(sph(0.06, hairMat, 1.05, 0.9, 1), 0, 1.875, 0.04); // bun
    for (let i = 0; i < 15; i++) {
      const a = ((i / 14) - 0.5) * Math.PI * 1.24;
      const bx = Math.sin(a) * 0.095, bz = 0.02 + Math.cos(a) * 0.095;
      const sway = Math.sin(i * 2.1) * 0.012;
      const pts = [
        new THREE.Vector3(bx, 1.82, bz), new THREE.Vector3(bx * 1.18, 1.74, bz * 1.22),
        new THREE.Vector3(bx * 1.16 + sway, 1.64, bz * 1.38 + 0.03), new THREE.Vector3(bx * 1.12 + sway * 1.5, 1.56 - (i % 3) * 0.02, bz * 1.45 + 0.06)
      ].map((q) => q.multiplyScalar(s).sub(hp));
      headBone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.015 * s, 7), hairMat));
    }
  } else if (look.hairStyle === "gele") {
    // headwrap sits ABOVE the brows: wrapped crown, folded fan + knot, gold band
    attach(hairCap(0.43, 0.3, hairMat, 0.108, 1.05, 1.2, 1.13), 0, 1.745, 0.014);
    const fold = (r: number, sx: number, sy: number, sz: number, rz: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 22, 14), hairMat);
      m.scale.set(sx, sy, sz); m.rotation.z = rz;
      attach(m, x, y, z);
    };
    fold(0.1, 1.9, 0.55, 0.95, 0.38, 0.05, 1.9, 0.0);
    fold(0.09, 1.6, 0.5, 0.85, -0.28, -0.065, 1.86, 0.03);
    fold(0.06, 1.2, 0.7, 0.8, 0.9, 0.125, 1.85, -0.005);
    const bandMat = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4, metalness: 0.5 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 36).rotateX(Math.PI / 2), bandMat);
    band.scale.set(0.094 * s, 0.1 * s, 0.085 * s);
    attach(band, 0, 1.79, 0.008);
  } else if (look.hairStyle === "headscarf") {
    // scarf wraps the back/sides of the head and drapes to the shoulders; the FACE STAYS OPEN
    const scarfMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.8, side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.112 * s, 28, 18, -0.35, Math.PI + 0.7, 0, Math.PI * 0.8), scarfMat);
    back.scale.set(1.06, 1.24, 1.14);
    attach(back, 0, 1.735, 0.014);
    const drape = new THREE.Mesh(new THREE.SphereGeometry(0.118 * s, 24, 16, 0.05, Math.PI - 0.1, Math.PI * 0.38, Math.PI * 0.5), scarfMat);
    drape.scale.set(1.15, 1.7, 1.2);
    attach(drape, 0, 1.6, 0.03);
    const bandMat = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4, metalness: 0.5 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 36).rotateX(Math.PI / 2), bandMat);
    band.scale.set(0.094 * s, 0.1 * s, 0.085 * s);
    attach(band, 0, 1.79, 0.008);
    attach(sph(0.04, scarfMat, 1.2, 0.9, 0.8), 0.062, 1.76, -0.055); // side fold at the temple
  } else {
    const capMat = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.6 });
    attach(hairCap(0.52, 0.3, capMat, 0.106, 1, 1.18, 1.1), 0, 1.752, 0.006);
    const brim = new THREE.Mesh(new RoundedBoxGeometry(0.17 * s, 0.012 * s, 0.1 * s, 2, 0.005), capMat);
    brim.rotation.x = 0.1;
    attach(brim, 0, 1.793, -0.135);
  }

  mergeStatic(headBone); // ~40 face/hair/glasses meshes -> one mesh per material

  // ---- shoes (boots or sneakers) on the foot bones; built in rest pose, then the foot bone aims them
  const sneaker = look.boots === 0xf2f2f2 || look.boots === 0xffffff;
  const upperMat = new THREE.MeshStandardMaterial({ color: look.boots, roughness: 0.55 });
  const soleMat = new THREE.MeshStandardMaterial({ color: sneaker ? 0xf0efe8 : 0x17120e, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: sneaker ? look.trim : 0x2a1d14, roughness: 0.5 });
  for (const side of [1, -1]) {
    const k = side === 1 ? "L" : "R";
    const foot = bones[side === 1 ? B.footL : B.footR];
    const an = jv("an" + k);
    const shoe = new THREE.Group();
    const place = (o: THREE.Object3D, dx: number, y: number, z: number) => { o.position.set(dx * s, y * s - an.y, z * s - an.z); o.traverse((c) => { c.castShadow = true; }); shoe.add(o); return o; };
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.108 * s, 0.04 * s, 0.31 * s, 3, 0.016 * s), soleMat);
    place(sole, 0, 0.02, -0.05);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), upperMat);   // rounded toe box
    toe.scale.set(0.054 * s, 0.045 * s, 0.125 * s);
    place(toe, 0, 0.062, -0.085);
    const mid = new THREE.Mesh(new RoundedBoxGeometry(0.1 * s, 0.07 * s, 0.16 * s, 3, 0.03 * s), upperMat);
    place(mid, 0, 0.075, -0.015);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * s, 0.056 * s, (sneaker ? 0.09 : 0.13) * s, 16), upperMat);
    place(shaft, 0, sneaker ? 0.15 : 0.165, 0.02);
    const heel = new THREE.Mesh(new RoundedBoxGeometry(0.1 * s, 0.05 * s, 0.07 * s, 3, 0.02 * s), accentMat);
    place(heel, 0, 0.035, 0.085);
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.012 * s, 0.1 * s), accentMat);
    tongue.rotation.x = 0.5;
    place(tongue, 0, 0.115, -0.045);
    for (let i = 0; i < 3; i++) place(new THREE.Mesh(new THREE.BoxGeometry(0.075 * s, 0.006 * s, 0.008 * s), white), 0, 0.105 + i * 0.001, -0.02 - i * 0.03);
    for (const e of [-1, 1]) place(new THREE.Mesh(new THREE.BoxGeometry(0.004 * s, 0.03 * s, 0.14 * s), accentMat), e * 0.052, 0.07, -0.03); // side stripe
    foot.add(shoe);
    mergeStatic(foot);
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
