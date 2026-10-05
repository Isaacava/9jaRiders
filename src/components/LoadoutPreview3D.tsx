"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildRacer, disposeTree } from "@/game/models/racer";
import { loadModelPack } from "@/game/models/loadPack";
import { qualityFor, resolveTier } from "@/game/quality";

export default function LoadoutPreview3D({
  bikeId,
  riderId,
  className
}: {
  bikeId: string;
  riderId: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let cleanup: () => void = () => {};
    const start = () => {
    const Q = qualityFor(resolveTier().tier, false);
    const renderer = new THREE.WebGLRenderer({ antialias: Q.tier !== "low", alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.maxDpr));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = Q.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.9;
    const key = new THREE.DirectionalLight(0xfff0d6, 2.4);
    key.position.set(3, 5, 3); key.castShadow = Q.shadows;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3;
    scene.add(key, new THREE.HemisphereLight(0xdfeeff, 0x6a5a45, 0.5));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; scene.add(disc);

    const racer = buildRacer(bikeId, riderId);
    racer.pivot.rotation.z = 0;
    racer.root.rotation.y = 0.5;
    scene.add(racer.root);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.5, 5.2);
    camera.lookAt(0, 0.85, 0);

    const resize = () => {
      const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let drag = false, lastX = 0, vel = 0.5;
    const down = (e: PointerEvent) => { drag = true; lastX = e.clientX; };
    const move = (e: PointerEvent) => { if (!drag) return; vel = (e.clientX - lastX) * 0.012; racer.root.rotation.y += vel; lastX = e.clientX; };
    const up = () => { drag = false; vel = 0.4; };
    renderer.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);

    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      if (Q.fpsCap && now - last < 1000 / Q.fpsCap - 4) return; // weak devices: steady 30 fps
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!drag) racer.root.rotation.y += dt * 0.5;
      racer.bike.frontWheel.rotation.x -= dt * 2; racer.bike.rearWheel.rotation.x -= dt * 2;
      racer.rider.update(0, 0);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      disposeTree(racer.root); env.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.forceContextLoss(); // free the GL context right away (browsers cap how many can be alive)
      renderer.domElement.remove();
    };
    };
    // wait for the pre-baked model pack so the garage never freezes while meshes are generated
    void loadModelPack().then(() => { if (!cancelled) cleanup = start(); });
    return () => { cancelled = true; cleanup(); };
  }, [bikeId, riderId]);

  return <div ref={ref} className={className} style={{ width: "100%", height: "100%" }} />;
}
