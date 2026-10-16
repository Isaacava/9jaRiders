import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { B, type RiderLook, type RiderShape } from "./riderShape";
import { rod } from "./util";
import { mergeStatic } from "./merge";

/**
 * Adds face, hair / helmet / cap, glasses, beard and shoes to a rig (head + foot bones). Shared by the rider on a bike
 * (rider.ts) and the standing / walking characters in cutscenes (character.ts).
 */
export function dressRider(look: RiderLook, shape: RiderShape, bones: THREE.Bone[]) {
  const s = shape.s;
  const J = shape.joints;
  const jv = (n: string) => new THREE.Vector3(J[n][0], J[n][1], J[n][2]);
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
  } else if (look.hairStyle === "helmet") {
    // full-face helmet: shell + dark visor + accent stripe + chin bar (the face stays hidden)
    const shellMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.25, metalness: 0.15 });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.128 * s, 28, 18), shellMat);
    shell.scale.set(1.0, 1.1, 1.14);
    attach(shell, 0, 1.735, 0.012);
    const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.131 * s, 24, 12, 4.712 - 1.0, 2.0, Math.PI * 0.36, Math.PI * 0.26), visorMat);
    visor.scale.set(1.0, 1.1, 1.14);
    attach(visor, 0, 1.735, 0.012);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 40, Math.PI).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4 }));
    stripe.scale.set(0.13 * s, 0.13 * s, 0.13 * s);
    attach(stripe, 0, 1.775, 0.012);
    const chin = new THREE.Mesh(new RoundedBoxGeometry(0.15 * s, 0.05 * s, 0.1 * s, 2, 0.02), shellMat);
    attach(chin, 0, 1.64, -0.065);
  } else if (look.hairStyle === "fila") {
    // Yoruba fila cap in the outfit colour, grey at the temples
    const fabric = new THREE.MeshStandardMaterial({ color: look.jacket, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.088 * s, 0.108 * s, 0.1 * s, 24), fabric);
    body.rotation.z = 0.08;
    attach(body, 0, 1.825, 0.004);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), fabric);
    top.scale.set(1, 0.35, 1);
    attach(top, 0, 1.872, 0.002);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.006 * s, 8, 28).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.4, metalness: 0.5 }));
    attach(band, 0, 1.79, 0.005);
    for (const sx of [-1, 1]) attach(sph(0.03, hairMat, 0.8, 1.4, 1), sx * 0.088, 1.745, 0.012);
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

}
