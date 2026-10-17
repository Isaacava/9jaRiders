// GTA-style destination marker for story missions: a glowing ring on the road, a tall light beam you can see from far
// away, and a floating diamond. The engine also draws a screen waypoint (pin + metres) so you always know where to go.
import * as THREE from "three";
import type { Track, Frame } from "./track";

export type Marker = {
  group: THREE.Group;
  /** world position of the marker centre (for the HUD waypoint) */
  pos: THREE.Vector3;
  update: (dt: number, time: number, playerDist: number) => void;
  dispose: () => void;
};

function beamTexture() {
  const c = document.createElement("canvas"); c.width = 4; c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,210,77,0)"); gr.addColorStop(0.35, "rgba(255,210,77,0.35)"); gr.addColorStop(1, "rgba(255,230,140,0.95)");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildMarker(scene: THREE.Scene, track: Track, goal: number, roadHalf: number, color = 0xffd24d): Marker {
  const group = new THREE.Group();
  const f: Frame = { px: 0, py: 0, pz: 0, th: 0 };
  track.frame(goal, f, true);
  group.position.set(f.px, f.py, f.pz);
  group.rotation.y = -f.th;
  const R = roadHalf - 0.5;
  const glow = (o = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });

  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 40), glow(0.16));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05; group.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.45, R, 48), glow(0.95));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(R * 0.55, R * 0.55 + 0.2, 40), glow(0.6));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.07; group.add(ring2);

  const bt = beamTexture();
  const beamMat = new THREE.MeshBasicMaterial({ map: bt, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.85, 140, 28, 1, true), beamMat);
  beam.position.y = 70; group.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 140, 10, 1, true), glow(0.5));
  core.position.y = 70; group.add(core);

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color, fog: false }));
  gem.scale.set(1, 1.5, 1); group.add(gem);

  group.traverse((o) => { o.userData.noBend = true; o.frustumCulled = false; });
  scene.add(group);
  const pos = new THREE.Vector3(f.px, f.py + 4, f.pz);

  return {
    group, pos,
    update: (dt, time, playerDist) => {
      const near = Math.max(0, Math.min(1, (goal - playerDist) / 60)); // calm down as you arrive
      const pulse = 1 + Math.sin(time * 4) * 0.04;
      ring.scale.setScalar(pulse); ring2.scale.setScalar(1 + Math.sin(time * 4 + 1.5) * 0.08);
      gem.position.y = 5 + Math.sin(time * 2.2) * 0.5; gem.rotation.y += dt * 1.8;
      beamMat.opacity = 0.55 + 0.25 * Math.sin(time * 3) + 0.15 * near;
    },
    dispose: () => { scene.remove(group); bt.dispose(); group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } }); }
  };
}
