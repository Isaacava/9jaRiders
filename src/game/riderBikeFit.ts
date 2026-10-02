import * as THREE from "three";

export type RiderRig = {
  root: THREE.Object3D;
  hip?: THREE.Object3D;
  thighL?: THREE.Object3D;
  thighR?: THREE.Object3D;
  calfL?: THREE.Object3D;
  calfR?: THREE.Object3D;
  footL?: THREE.Object3D;
  footR?: THREE.Object3D;
  upperArmL?: THREE.Object3D;
  upperArmR?: THREE.Object3D;
  forearmL?: THREE.Object3D;
  forearmR?: THREE.Object3D;
  handL?: THREE.Object3D;
  handR?: THREE.Object3D;
  spine?: THREE.Object3D;
  chest?: THREE.Object3D;
  head?: THREE.Object3D;
};

export type BikeMountPoints = {
  seat: THREE.Vector3;
  handleL: THREE.Vector3;
  handleR: THREE.Vector3;
  pegL: THREE.Vector3;
  pegR: THREE.Vector3;
  wheelBase: number;
  height: number;
  width: number;
};

type BoneSide = "L" | "R";

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBone(
  bones: THREE.Object3D[],
  patterns: RegExp[],
  side?: BoneSide
) {
  const matches = bones.filter((bone) => {
    const name = normalizedName(bone.name);
    if (side && !name.endsWith(side.toLowerCase())) return false;
    return patterns.some((pattern) => pattern.test(name));
  });
  return matches[0];
}

export function mapRiderRig(root: THREE.Object3D): RiderRig {
  const bones: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node.type === "Bone") bones.push(node);
  });

  const rig: RiderRig = {
    root,
    hip:
      pickBone(bones, [/pelvis/]) ??
      pickBone(bones, [/hips?/]) ??
      pickBone(bones, [/root/]),
    thighL:
      pickBone(bones, [/thigh/, /upperleg/], "L"),
    thighR:
      pickBone(bones, [/thigh/, /upperleg/], "R"),
    calfL:
      pickBone(bones, [/calf/, /shin/, /lowerleg/], "L"),
    calfR:
      pickBone(bones, [/calf/, /shin/, /lowerleg/], "R"),
    footL:
      pickBone(bones, [/foot/, /ankle/], "L"),
    footR:
      pickBone(bones, [/foot/, /ankle/], "R"),
    upperArmL:
      pickBone(bones, [/upperarm/, /arm/], "L"),
    upperArmR:
      pickBone(bones, [/upperarm/, /arm/], "R"),
    forearmL:
      pickBone(bones, [/forearm/, /lowerarm/], "L"),
    forearmR:
      pickBone(bones, [/forearm/, /lowerarm/], "R"),
    handL:
      pickBone(bones, [/hand/, /wrist/], "L"),
    handR:
      pickBone(bones, [/hand/, /wrist/], "R"),
    spine:
      pickBone(bones, [/spine02/, /spine01/, /spine/]) ??
      pickBone(bones, [/chest/]),
    chest:
      pickBone(bones, [/chest/, /spine02/]) ??
      pickBone(bones, [/spine01/, /spine/]),
    head: pickBone(bones, [/head/, /neck/])
  };

  return rig;
}

function collectNamedNodes(root: THREE.Object3D, pattern: RegExp) {
  const found: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node !== root && pattern.test(node.name)) found.push(node);
  });
  return found;
}

function localBoundsCenter(root: THREE.Object3D, object: THREE.Object3D) {
  root.updateMatrixWorld(true);
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  return root.worldToLocal(box.getCenter(new THREE.Vector3()));
}

function getWheelCenters(root: THREE.Object3D) {
  const candidates: Array<{ center: THREE.Vector3; radius: number }> = [];
  root.updateMatrixWorld(true);

  root.traverse((node) => {
    if (!/wheel|tire|tyre/i.test(node.name)) return;
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const centerWorld = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.y, size.z) * 0.5;
    if (radius < 0.06 || radius > 0.8) return;

    candidates.push({
      center: root.worldToLocal(centerWorld),
      radius
    });
  });

  // Dedupe nested nodes (wheel mesh + wheel pivot + wheel tyre).
  const unique: typeof candidates = [];
  for (const candidate of candidates) {
    if (unique.some((other) => other.center.distanceTo(candidate.center) < 0.08)) continue;
    unique.push(candidate);
  }

  unique.sort((a, b) => a.center.z - b.center.z);
  return unique;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveBikeMountPoints(bike: THREE.Object3D): BikeMountPoints {
  bike.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(bike);
  const size = bounds.getSize(new THREE.Vector3());
  const min = bounds.min.clone();
  const max = bounds.max.clone();

  const wheels = getWheelCenters(bike);
  const rear = wheels[0]?.center;
  const front = wheels.length > 1 ? wheels[wheels.length - 1]?.center : undefined;

  const wheelBase =
    rear && front ? Math.max(0.55, front.z - rear.z) : Math.max(1.1, size.z * 0.72);
  const groundY = min.y;
  const bikeHeight = Math.max(0.75, size.y);
  const bikeWidth = Math.max(0.45, size.x);

  const seatNodes = collectNamedNodes(
    bike,
    /seat|saddle|saddlepad|seatpad|cushion/i
  );
  const handleNodes = collectNamedNodes(
    bike,
    /handlebar|handle.?bar|steer|grip|clip.?on/i
  );
  const pegNodes = collectNamedNodes(
    bike,
    /foot.?peg|foot.?rest|footrest|peg/i
  );

  const wheelRearZ = rear?.z ?? min.z + wheelBase * 0.12;
  const wheelFrontZ = front?.z ?? wheelRearZ + wheelBase;

  const defaultSeat = new THREE.Vector3(
    0,
    groundY + clamp(bikeHeight * 0.61, 0.56, 0.96),
    wheelRearZ + wheelBase * 0.45
  );

  const seat = seatNodes.length
    ? localBoundsCenter(bike, seatNodes[0])
    : defaultSeat;

  const handleCenter = handleNodes.length
    ? localBoundsCenter(bike, handleNodes[0])
    : new THREE.Vector3(
        0,
        groundY + clamp(bikeHeight * 0.70, 0.68, 1.12),
        wheelFrontZ - wheelBase * 0.10
      );

  const pegNodesSorted = pegNodes
    .map((node) => localBoundsCenter(bike, node))
    .sort((a, b) => a.x - b.x);

  const pegHalfWidth = clamp(bikeWidth * 0.23, 0.14, 0.29);
  const handleHalfWidth = clamp(bikeWidth * 0.23, 0.18, 0.34);

  const handleL = pegNodesSorted.length >= 2
    ? handleCenter.clone().setX(Math.abs(pegNodesSorted[0].x) >= Math.abs(pegNodesSorted[pegNodesSorted.length - 1].x)
        ? Math.max(pegNodesSorted[pegNodesSorted.length - 1].x, 0.04)
        : handleHalfWidth)
    : handleCenter.clone().setX(handleHalfWidth);

  const handleR = handleCenter.clone().setX(-Math.abs(handleL.x));

  const pegCenter = new THREE.Vector3(
    0,
    groundY + clamp(bikeHeight * 0.33, 0.28, 0.56),
    seat.z - wheelBase * 0.11
  );

  const pegL = pegNodesSorted.length >= 2
    ? pegNodesSorted[pegNodesSorted.length - 1].clone().setX(Math.abs(pegNodesSorted[pegNodesSorted.length - 1].x))
    : pegCenter.clone().setX(pegHalfWidth);
  const pegR = pegNodesSorted.length >= 2
    ? pegNodesSorted[0].clone().setX(-Math.abs(pegNodesSorted[0].x))
    : pegCenter.clone().setX(-pegHalfWidth);

  return {
    seat,
    handleL,
    handleR,
    pegL,
    pegR,
    wheelBase,
    height: bikeHeight,
    width: bikeWidth
  };
}

function worldPosition(object: THREE.Object3D) {
  return object.getWorldPosition(new THREE.Vector3());
}

function aimBoneAt(bone: THREE.Object3D, targetWorld: THREE.Vector3) {
  const parent = bone.parent;
  const targetLocal = parent
    ? parent.worldToLocal(targetWorld.clone())
    : targetWorld.clone();

  const direction = targetLocal.sub(bone.position).normalize();
  if (direction.lengthSq() < 1e-8) return;

  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction
  );
  bone.quaternion.copy(quaternion);
  bone.updateMatrixWorld(true);
}

function solveTwoBoneIK(
  upper: THREE.Object3D | undefined,
  lower: THREE.Object3D | undefined,
  targetWorld: THREE.Vector3,
  poleWorld: THREE.Vector3
) {
  if (!upper || !lower) return;

  upper.parent?.updateMatrixWorld(true);
  lower.parent?.updateMatrixWorld(true);

  const start = worldPosition(upper);
  const joint = worldPosition(lower);

  const endBone = lower.children.find((child) => child.type === "Bone");
  const naturalEnd = endBone ? worldPosition(endBone) : joint.clone().add(new THREE.Vector3(0, lower.scale.y || 0.3, 0));

  const upperLength = Math.max(0.08, start.distanceTo(joint));
  const lowerLength = Math.max(0.08, joint.distanceTo(naturalEnd));

  const toTarget = targetWorld.clone().sub(start);
  const distance = clamp(
    toTarget.length(),
    0.05,
    upperLength + lowerLength - 0.015
  );
  const direction = toTarget.normalize();

  const projectedPole = poleWorld
    .clone()
    .sub(start)
    .sub(direction.clone().multiplyScalar(poleWorld.clone().sub(start).dot(direction)));

  const bendDirection = projectedPole.lengthSq() > 1e-8
    ? projectedPole.normalize()
    : new THREE.Vector3(0, 0, -1);

  const x = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(upperLength * upperLength - x * x, 0));
  const bend = start
    .clone()
    .add(direction.clone().multiplyScalar(x))
    .add(bendDirection.multiplyScalar(h));

  aimBoneAt(upper, bend);
  aimBoneAt(lower, targetWorld);
}

function riderLocalToWorld(root: THREE.Object3D, point: THREE.Vector3) {
  return root.localToWorld(point.clone());
}

function bikeLocalToWorld(bike: THREE.Object3D, point: THREE.Vector3) {
  return bike.localToWorld(point.clone());
}

export type RiderFitResult = {
  mounts: BikeMountPoints;
  rig: RiderRig;
  scale: number;
};

export function fitRiderToBike(
  riderRoot: THREE.Object3D,
  riderModel: THREE.Object3D,
  bike: THREE.Object3D,
  options: {
    buildScale?: number;
    postureBias?: number;
    yaw?: number;
  } = {}
): RiderFitResult {
  const mounts = deriveBikeMountPoints(bike);
  const rig = mapRiderRig(riderModel);
  const buildScale = clamp(options.buildScale ?? 1, 0.92, 1.08);
  const postureBias = clamp(options.postureBias ?? 0, -0.22, 0.22);

  // Normalise the character once. This keeps one human asset reusable on
  // full-size bikes, scooters and compact bikes without changing world units.
  const riderBounds = new THREE.Box3().setFromObject(riderModel);
  const riderHeight = Math.max(0.001, riderBounds.max.y - riderBounds.min.y);
  const targetHeight = 1.72 * buildScale;
  const scale = targetHeight / riderHeight;
  riderModel.scale.multiplyScalar(scale);

  riderModel.rotation.set(0, options.yaw ?? Math.PI, 0);
  riderModel.updateMatrixWorld(true);

  if (rig.hip) {
    const hipWorld = worldPosition(rig.hip);
    const seatWorld = bikeLocalToWorld(bike, mounts.seat);
    const delta = seatWorld.sub(hipWorld);
    const parent = riderModel.parent ?? riderRoot;
    const localDelta = parent.worldToLocal(
      new THREE.Vector3(delta.x, delta.y, delta.z).add(parent.getWorldPosition(new THREE.Vector3()))
    ).sub(parent.worldToLocal(parent.getWorldPosition(new THREE.Vector3())));
    riderModel.position.add(localDelta);
    riderModel.updateMatrixWorld(true);
  }

  const seatWorld = bikeLocalToWorld(bike, mounts.seat);
  const handleLWorld = bikeLocalToWorld(bike, mounts.handleL);
  const handleRWorld = bikeLocalToWorld(bike, mounts.handleR);
  const pegLWorld = bikeLocalToWorld(bike, mounts.pegL);
  const pegRWorld = bikeLocalToWorld(bike, mounts.pegR);

  if (rig.thighL && rig.calfL) {
    solveTwoBoneIK(
      rig.thighL,
      rig.calfL,
      pegLWorld,
      seatWorld.clone().add(new THREE.Vector3(-0.28, 0.18, -0.35))
    );
  }
  if (rig.thighR && rig.calfR) {
    solveTwoBoneIK(
      rig.thighR,
      rig.calfR,
      pegRWorld,
      seatWorld.clone().add(new THREE.Vector3(0.28, 0.18, -0.35))
    );
  }

  if (rig.upperArmL && rig.forearmL) {
    solveTwoBoneIK(
      rig.upperArmL,
      rig.forearmL,
      handleLWorld,
      seatWorld.clone().add(new THREE.Vector3(-0.60, 0.40, -0.50))
    );
  }
  if (rig.upperArmR && rig.forearmR) {
    solveTwoBoneIK(
      rig.upperArmR,
      rig.forearmR,
      handleRWorld,
      seatWorld.clone().add(new THREE.Vector3(0.60, 0.40, -0.50))
    );
  }

  // Torso pitch is derived from the actual seat-to-handlebar relationship.
  // Sport bikes naturally produce a deeper tuck; scooters/cruisers stay upright.
  const seatToBar = handleLWorld.clone().sub(seatWorld);
  const horizontal = Math.max(0.1, Math.hypot(seatToBar.x, seatToBar.z));
  const torsoPitch = clamp(
    Math.atan2(seatToBar.y, horizontal) * 0.85 + postureBias,
    -0.55,
    0.32
  );

  if (rig.spine) rig.spine.rotation.x = torsoPitch * 0.55;
  if (rig.chest) rig.chest.rotation.x = torsoPitch * 0.42;
  if (rig.head) rig.head.rotation.x = -torsoPitch * 0.5;

  // Keep the feet and hands visually attached after the initial solve.
  riderModel.updateMatrixWorld(true);

  return { mounts, rig, scale };
}
