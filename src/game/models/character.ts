import * as THREE from "three";
import { B, BONE_DEFS, buildRiderShape, RIDER_LOOKS, type RiderLook } from "./riderShape";
import { riderGeometry } from "./rider";
import { dressRider } from "./dress";

// A standing / sitting / walking character for cutscenes. Same smooth skinned body, face, hair and shoes as the riders.
// Game space: faces -z; the "L" limbs are at +x, the "R" limbs at -x.

export type Pose = "stand" | "sit" | "lean" | "arms" | "point" | "slump";
type V = [number, number, number];
type PoseDef = { pelvisY: number; chest: V; head: V; armL: [V, V]; armR: [V, V]; legL: [V, V]; legR: [V, V]; spine?: V };

const mir = (v: V): V => [-v[0], v[1], v[2]];
const POSES: Record<Pose, PoseDef> = {
  stand: { pelvisY: 0, chest: [0, 1, 0], head: [0, 1, -0.02], armL: [[0.16, -1, 0.04], [0.1, -1, -0.2]], armR: [[-0.16, -1, 0.04], [-0.1, -1, -0.2]], legL: [[0.035, -1, -0.02], [0, -1, 0.03]], legR: [[-0.035, -1, -0.02], [0, -1, 0.03]] },
  sit: { pelvisY: -0.42, chest: [0, 1, -0.1], head: [0, 1, -0.05], armL: [[0.12, -1, -0.12], [0.04, -0.35, -1]], armR: [[-0.12, -1, -0.12], [-0.04, -0.35, -1]], legL: [[0.07, -0.06, -1], [0, -1, 0.06]], legR: [[-0.07, -0.06, -1], [0, -1, 0.06]] },
  lean: { pelvisY: -0.02, chest: [0, 1, 0.14], head: [0, 1, -0.12], armL: [[0.22, -0.95, -0.12], [-0.95, 0.12, -0.45]], armR: [[-0.22, -0.95, -0.12], [0.95, 0.1, -0.45]], legL: [[0.05, -1, -0.05], [0, -1, 0.08]], legR: [[-0.06, -1, -0.32], [0, -1, 0.3]] },
  arms: { pelvisY: 0, chest: [0, 1, 0], head: [0, 1, -0.02], armL: [[0.2, -0.95, -0.1], [-0.95, 0.12, -0.45]], armR: [[-0.2, -0.95, -0.1], [0.95, 0.1, -0.45]], legL: [[0.05, -1, -0.02], [0, -1, 0.03]], legR: [[-0.05, -1, -0.02], [0, -1, 0.03]] },
  point: { pelvisY: 0, chest: [0, 1, -0.02], head: [-0.06, 1, -0.06], armL: [[0.16, -1, 0.04], [0.1, -1, -0.2]], armR: [[-0.3, -0.05, -1], [-0.28, 0.05, -1]], legL: [[0.04, -1, -0.02], [0, -1, 0.03]], legR: [[-0.04, -1, -0.02], [0, -1, 0.03]] },
  slump: { pelvisY: -0.02, chest: [0, 0.95, -0.3], head: [0, 0.85, -0.55], armL: [[0.12, -1, -0.15], [0.05, -1, -0.5]], armR: [[-0.12, -1, -0.15], [-0.05, -1, -0.5]], legL: [[0.05, -1, -0.04], [0, -1, 0.05]], legR: [[-0.05, -1, -0.04], [0, -1, 0.05]] }
};

export class Character {
  readonly group = new THREE.Group();
  readonly look: RiderLook;
  readonly scale: number;
  talking = false;
  laughing = false;
  walkSpeed = 0; // m/s, drives the walk cycle (the director moves the group)
  private bones: THREE.Bone[];
  private restDir: THREE.Vector3[];
  private cur: THREE.Vector3[];
  private tgt: THREE.Vector3[];
  private pose: Pose = "stand";
  private pelvisRest: THREE.Vector3;
  private pelvisY = 0;
  private lookAt: THREE.Vector3 | null = null;
  private phase = 0;
  private qp = new THREE.Quaternion(); private qs = new THREE.Quaternion(); private qg = new THREE.Quaternion();
  private mTmp = new THREE.Matrix4(); private v = new THREE.Vector3();
  private qy = new THREE.Quaternion(); private up = new THREE.Vector3(0, 1, 0);
  private yawTgt = 0;
  private yawCur = 0;

  constructor(lookId: string) {
    this.look = RIDER_LOOKS[lookId] ?? RIDER_LOOKS.main;
    const shape = buildRiderShape(this.look.female, this.look.build);
    this.scale = shape.s;
    const J = shape.joints;
    const jv = (n: string) => new THREE.Vector3(J[n][0], J[n][1], J[n][2]);
    this.bones = BONE_DEFS.map((d) => { const b = new THREE.Bone(); b.name = d.name; return b; });
    BONE_DEFS.forEach((d, i) => {
      if (d.parent < 0) this.bones[i].position.copy(jv(d.joint));
      else { this.bones[i].position.copy(jv(d.joint).sub(jv(BONE_DEFS[d.parent].joint))); this.bones[d.parent].add(this.bones[i]); }
    });
    this.pelvisRest = this.bones[0].position.clone();
    const skeleton = new THREE.Skeleton(this.bones);
    const body = new THREE.SkinnedMesh(riderGeometry(`char:${lookId}`, this.look), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02 }));
    body.frustumCulled = false; body.castShadow = true;
    body.add(this.bones[0]);
    this.group.add(body);
    body.bind(skeleton);
    this.restDir = BONE_DEFS.map((d) => jv(d.child).sub(jv(d.joint)).normalize());
    this.cur = BONE_DEFS.map((_, i) => this.restDir[i].clone());
    this.tgt = BONE_DEFS.map((_, i) => this.restDir[i].clone());
    dressRider(this.look, shape, this.bones);

    // simple hands (palm + thumb) on the hand bones
    const skin = new THREE.MeshStandardMaterial({ color: this.look.skin, roughness: 0.5 });
    for (const [bi, side] of [[B.handL, 1], [B.handR, -1]] as const) {
      const d = BONE_DEFS[bi];
      const a = jv(d.joint), b2 = jv(d.child), mid = a.clone().add(b2).multiplyScalar(0.5);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045 * this.scale, 14, 10), skin);
      hand.scale.set(0.7, 1.35, 0.6);
      hand.position.copy(mid).sub(a).add(new THREE.Vector3(0, -0.01, 0));
      hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.restDir[bi]);
      this.bones[bi].add(hand);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.016 * this.scale, 8, 6), skin);
      thumb.position.copy(mid).sub(a).add(new THREE.Vector3(-side * 0.03 * this.scale, 0.01, -0.025 * this.scale));
      this.bones[bi].add(thumb);
    }
    this.setPose("stand", true);
    this.update(0.016, 0);
  }

  setPose(p: Pose, instant = false) {
    this.pose = p;
    if (instant) { this.pelvisY = POSES[p].pelvisY * this.scale; this.targets(0); this.cur.forEach((c, i) => c.copy(this.tgt[i])); }
  }
  getPose() { return this.pose; }
  /** world-space point the head should track (null = look ahead) */
  setLookAt(p: THREE.Vector3 | null) { this.lookAt = p ? p.clone() : null; }

  private targets(t: number) {
    const P = POSES[this.pose];
    const set = (i: number, v: V) => this.tgt[i].set(v[0], v[1], v[2]).normalize();
    const breathe = Math.sin(t * 1.7) * 0.012;
    set(B.pelvis, [0, 1, 0]);
    set(B.spine, [0, 1, (P.spine?.[2] ?? 0) + breathe]);
    set(B.chest, [P.chest[0], P.chest[1], P.chest[2] + breathe]);
    set(B.neck, [0, 1, P.head[2] * 0.4]);
    let head: V = [P.head[0], P.head[1], P.head[2]];
    let yaw = 0;
    // look at a world point: twist the neck/head towards it (clamped so the head never snaps backwards)
    if (this.lookAt) {
      this.group.updateWorldMatrix(true, true);
      const hp = this.group.worldToLocal(this.v.setFromMatrixPosition(this.bones[B.head].matrixWorld));
      const dir = this.group.worldToLocal(this.lookAt.clone()).sub(hp).normalize();
      yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(dir.x, -dir.z)));
      const pitch = Math.max(-0.4, Math.min(0.4, Math.asin(Math.max(-1, Math.min(1, dir.y)))));
      head = [P.head[0], P.head[1], P.head[2] - pitch * 0.9];
    }
    this.yawTgt = yaw;
    if (this.talking) { head[1] += Math.sin(t * 4.6) * 0.06; head[0] += Math.sin(t * 2.3) * 0.04; }
    if (this.laughing) { head[1] += 0.18 + Math.sin(t * 20) * 0.05; }
    set(B.head, head);

    let aL = P.armL, aR = P.armR, lL = P.legL, lR = P.legR;
    if (this.talking) { // expressive hands while speaking
      const g = (Math.sin(t * 3.1) * 0.5 + 0.5);
      aR = [[P.armR[0][0] - 0.1, P.armR[0][1] + g * 0.5, P.armR[0][2] - g * 0.55], [P.armR[1][0], P.armR[1][1] + g * 0.9, P.armR[1][2] - g * 1.1]];
      aL = [[P.armL[0][0] + 0.05, P.armL[0][1] + (1 - g) * 0.3, P.armL[0][2] - (1 - g) * 0.4], [P.armL[1][0], P.armL[1][1] + (1 - g) * 0.5, P.armL[1][2] - (1 - g) * 0.6]];
    }
    let bob = 0;
    if (this.walkSpeed > 0.05) { // walk cycle
      const a = Math.sin(this.phase), b = Math.sin(this.phase + Math.PI);
      const swing = (x: number): V => [0, -Math.cos(x * 0.55), -Math.sin(x * 0.55)];
      const knee = (x: number, ph: number): V => [0, -Math.cos(Math.max(0, Math.sin(ph + 1.2)) * 0.8), Math.sin(Math.max(0, Math.sin(ph + 1.2)) * 0.8)];
      lL = [swing(a), knee(a, this.phase)]; lR = [swing(b), knee(b, this.phase + Math.PI)];
      aL = [[0.1, -Math.cos(b * 0.4), -Math.sin(b * 0.4)], [0.05, -1, -0.35 - Math.max(0, b) * 0.2]];
      aR = [[-0.1, -Math.cos(a * 0.4), -Math.sin(a * 0.4)], [-0.05, -1, -0.35 - Math.max(0, a) * 0.2]];
      bob = Math.abs(Math.sin(this.phase)) * 0.025;
    }
    if (this.laughing) { this.tgt[B.chest].x += Math.sin(t * 22) * 0.04; }
    set(B.upperArmL, aL[0]); set(B.foreArmL, aL[1]); set(B.handL, aL[1]);
    set(B.upperArmR, aR[0]); set(B.foreArmR, aR[1]); set(B.handR, aR[1]);
    set(B.thighL, lL[0]); set(B.shinL, lL[1]); set(B.footL, [0, -0.27, -0.96]);
    set(B.thighR, lR[0]); set(B.shinR, lR[1]); set(B.footR, [0, -0.27, -0.96]);
    return bob;
  }

  update(dt: number, t: number) {
    this.phase += dt * this.walkSpeed * 5.2; // stride rate follows speed
    const bob = this.targets(t);
    const k = 1 - Math.exp(-9 * dt);
    const pTarget = POSES[this.pose].pelvisY * this.scale + bob * this.scale;
    this.pelvisY += (pTarget - this.pelvisY) * (dt === 0 ? 1 : k);
    for (let i = 0; i < this.cur.length; i++) this.cur[i].lerp(this.tgt[i], dt === 0 ? 1 : k).normalize();
    this.bones[0].position.set(this.pelvisRest.x, this.pelvisRest.y + this.pelvisY, this.pelvisRest.z);
    this.yawCur += (this.yawTgt - this.yawCur) * (dt === 0 ? 1 : k);
    this.group.updateWorldMatrix(true, true);
    this.group.getWorldQuaternion(this.qg);
    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i], par = b.parent as THREE.Object3D;
      this.mTmp.extractRotation(par.matrixWorld);
      this.qp.setFromRotationMatrix(this.mTmp);
      this.qs.setFromUnitVectors(this.restDir[i], this.cur[i]);
      const yw = i === B.head ? this.yawCur : i === B.neck ? this.yawCur * 0.4 : 0;
      if (yw) { this.qy.setFromAxisAngle(this.up, yw); this.qs.premultiply(this.qy); }
      this.qs.premultiply(this.qg);
      b.quaternion.copy(this.qp.invert().multiply(this.qs));
      b.updateWorldMatrix(false, false);
    }
  }
}

export const buildCharacter = (lookId: string) => new Character(lookId);
