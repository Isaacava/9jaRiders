import * as THREE from "three";

export type BikeMountPoints = {
  seat: any;
  handleL: any;
  handleR: any;
  pegL: any;
  pegR: any;
  wheelBase: number;
  height: number;
  width: number;
};

function nameOf(node: any) {
  return String(node?.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findNode(root: any, patterns: RegExp[], side?: "l" | "r") {
  const found: any[] = [];
  root.traverse((node: any) => {
    const name = nameOf(node);
    if (side && !name.endsWith(side)) return;
    if (patterns.some((pattern) => pattern.test(name))) found.push(node);
  });
  return found[0];
}

function namedNodes(root: any, pattern: RegExp) {
  const found: any[] = [];
  root.traverse((node: any) => {
    if (node !== root && pattern.test(String(node?.name ?? ""))) found.push(node);
  });
  return found;
}

function centerOf(root: any, node: any) {
  root.updateMatrixWorld(true);
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(node);
  return root.worldToLocal(box.getCenter(new THREE.Vector3()));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wheelCenters(root: any) {
  const items: any[] = [];
  root.traverse((node: any) => {
    if (!/wheel|tire|tyre/i.test(String(node?.name ?? ""))) return;
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.y, size.z) * 0.5;
    if (radius < 0.06 || radius > 0.9) return;
    items.push({
      center: root.worldToLocal(box.getCenter(new THREE.Vector3())),
      radius
    });
  });
  items.sort((a, b) => a.center.z - b.center.z);
  const unique: any[] = [];
  for (const item of items) {
    if (unique.some((other) => other.center.distanceTo(item.center) < 0.08)) continue;
    unique.push(item);
  }
  return unique;
}

export function deriveBikeMountPoints(bike: any): BikeMountPoints {
  bike.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(bike);
  const size = box.getSize(new THREE.Vector3());
  const min = box.min.clone();

  const wheels = wheelCenters(bike);
  const rear = wheels[0]?.center;
  const front = wheels[wheels.length - 1]?.center;
  const wheelBase = rear && front
    ? Math.max(0.55, Math.abs(front.z - rear.z))
    : Math.max(1.1, size.z * 0.72);

  const height = Math.max(0.75, size.y);
  const width = Math.max(0.45, size.x);
  const groundY = min.y;

  const seatNode = namedNodes(bike, /seat|saddle|seatpad|saddlepad/i)[0];
  const handleNode = namedNodes(bike, /handlebar|handle.?bar|steer|grip|clip.?on/i)[0];
  const pegs = namedNodes(bike, /foot.?peg|foot.?rest|footrest|peg/i)
    .map((node) => centerOf(bike, node))
    .sort((a, b) => a.x - b.x);

  const rearZ = rear?.z ?? min.z;
  const frontZ = front?.z ?? rearZ + wheelBase;

  const seat = seatNode
    ? centerOf(bike, seatNode)
    : new THREE.Vector3(
        0,
        groundY + clamp(height * 0.61, 0.56, 0.96),
        rearZ + wheelBase * 0.45
      );

  const handle = handleNode
    ? centerOf(bike, handleNode)
    : new THREE.Vector3(
        0,
        groundY + clamp(height * 0.70, 0.68, 1.12),
        frontZ - wheelBase * 0.10
      );

  const halfWidth = clamp(width * 0.23, 0.14, 0.29);

  const pegL = pegs.length >= 2
    ? pegs[pegs.length - 1].clone().setX(Math.abs(pegs[pegs.length - 1].x))
    : new THREE.Vector3(halfWidth, groundY + clamp(height * 0.33, 0.28, 0.56), seat.z - wheelBase * 0.11);
  const pegR = pegs.length >= 2
    ? pegs[0].clone().setX(-Math.abs(pegs[0].x))
    : new THREE.Vector3(-halfWidth, groundY + clamp(height * 0.33, 0.28, 0.56), seat.z - wheelBase * 0.11);

  const handleHalfWidth = clamp(width * 0.23, 0.18, 0.34);
  const handleL = handle.clone().setX(handleHalfWidth);
  const handleR = handle.clone().setX(-handleHalfWidth);

  return { seat, handleL, handleR, pegL, pegR, wheelBase, height, width };
}

function worldPos(node: any) {
  return node.getWorldPosition(new THREE.Vector3());
}

function aimBone(bone: any, targetWorld: any) {
  const parent = bone.parent;
  const localTarget = parent
    ? parent.worldToLocal(targetWorld.clone())
    : targetWorld.clone();

  const direction = localTarget.sub(bone.position).normalize();
  if (direction.lengthSq() < 1e-8) return;

  bone.quaternion.copy(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    )
  );
  bone.updateMatrixWorld(true);
}

function twoBoneIK(upper: any, lower: any, targetWorld: any, poleWorld: any) {
  if (!upper || !lower) return;

  const start = worldPos(upper);
  const joint = worldPos(lower);
  const child = lower.children?.find((node: any) => node.type === "Bone");
  const end = child
    ? worldPos(child)
    : joint.clone().add(new THREE.Vector3(0, 0.25, 0));

  const upperLength = Math.max(0.08, start.distanceTo(joint));
  const lowerLength = Math.max(0.08, joint.distanceTo(end));
  const delta = targetWorld.clone().sub(start);
  const distance = clamp(delta.length(), 0.06, upperLength + lowerLength - 0.01);
  const direction = delta.normalize();

  const poleDelta = poleWorld.clone().sub(start);
  const poleProjected = poleDelta.sub(
    direction.clone().multiplyScalar(poleDelta.dot(direction))
  );
  const bendDirection = poleProjected.lengthSq() > 1e-8
    ? poleProjected.normalize()
    : new THREE.Vector3(0, 0, -1);

  const x = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(upperLength * upperLength - x * x, 0));
  const bendTarget = start
    .clone()
    .add(direction.clone().multiplyScalar(x))
    .add(bendDirection.multiplyScalar(h));

  aimBone(upper, bendTarget);
  aimBone(lower, targetWorld);
}

function riderBones(rider: any) {
  const bones: any[] = [];
  rider.traverse((node: any) => {
    if (node.type === "Bone") bones.push(node);
  });

  const pick = (patterns: RegExp[], side?: "l" | "r") => findNode({ traverse: (fn: any) => bones.forEach(fn) }, patterns, side);

  return {
    hip: pick([/pelvis/, /hips?/, /root/]),
    thighL: pick([/thigh/, /upperleg/], "l"),
    thighR: pick([/thigh/, /upperleg/], "r"),
    calfL: pick([/calf/, /shin/, /lowerleg/], "l"),
    calfR: pick([/calf/, /shin/, /lowerleg/], "r"),
    footL: pick([/foot/, /ankle/], "l"),
    footR: pick([/foot/, /ankle/], "r"),
    upperArmL: pick([/upperarm/, /arm/], "l"),
    upperArmR: pick([/upperarm/, /arm/], "r"),
    forearmL: pick([/forearm/, /lowerarm/], "l"),
    forearmR: pick([/forearm/, /lowerarm/], "r"),
    spine: pick([/spine02/, /spine01/, /spine/, /chest/]),
    chest: pick([/chest/, /spine02/, /spine01/]),
    head: pick([/head/, /neck/])
  };
}

export function fitRiderToBike(
  riderRoot: any,
  riderModel: any,
  bike: any,
  options: { buildScale?: number; postureBias?: number; yaw?: number } = {}
) {
  const mounts = deriveBikeMountPoints(bike);
  const rig = riderBones(riderModel);
  const buildScale = clamp(options.buildScale ?? 1, 0.92, 1.08);
  const postureBias = clamp(options.postureBias ?? 0, -0.22, 0.22);

  const bounds = new THREE.Box3().setFromObject(riderModel);
  const currentHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
  riderModel.scale.multiplyScalar((1.72 * buildScale) / currentHeight);
  riderModel.rotation.y = options.yaw ?? Math.PI;
  riderModel.updateMatrixWorld(true);

  const seatWorld = bike.localToWorld(mounts.seat.clone());

  if (rig.hip) {
    const parent = riderModel.parent ?? riderRoot;
    const hipLocal = parent.worldToLocal(worldPos(rig.hip));
    const seatLocal = parent.worldToLocal(seatWorld.clone());
    riderModel.position.add(seatLocal.sub(hipLocal));
    riderModel.updateMatrixWorld(true);
  }

  const handleLWorld = bike.localToWorld(mounts.handleL.clone());
  const handleRWorld = bike.localToWorld(mounts.handleR.clone());
  const pegLWorld = bike.localToWorld(mounts.pegL.clone());
  const pegRWorld = bike.localToWorld(mounts.pegR.clone());

  twoBoneIK(rig.thighL, rig.calfL, pegLWorld, seatWorld.clone().add(new THREE.Vector3(-0.25, 0.15, -0.30)));
  twoBoneIK(rig.thighR, rig.calfR, pegRWorld, seatWorld.clone().add(new THREE.Vector3(0.25, 0.15, -0.30)));
  twoBoneIK(rig.upperArmL, rig.forearmL, handleLWorld, seatWorld.clone().add(new THREE.Vector3(-0.50, 0.35, -0.40)));
  twoBoneIK(rig.upperArmR, rig.forearmR, handleRWorld, seatWorld.clone().add(new THREE.Vector3(0.50, 0.35, -0.40)));

  const seatToHandle = handleLWorld.clone().sub(seatWorld);
  const horizontal = Math.max(0.1, Math.hypot(seatToHandle.x, seatToHandle.z));
  const pitch = clamp(Math.atan2(seatToHandle.y, horizontal) * 0.85 + postureBias, -0.50, 0.30);

  if (rig.spine) rig.spine.rotation.x = pitch * 0.55;
  if (rig.chest) rig.chest.rotation.x = pitch * 0.40;
  if (rig.head) rig.head.rotation.x = -pitch * 0.50;

  riderModel.updateMatrixWorld(true);

  return {
    mounts,
    rig,
    scale: riderModel.scale.x
  };
}
