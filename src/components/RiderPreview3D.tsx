"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RIDERS, type RiderId } from "@/game/loadout";

const RIDER_URLS = {
  male: "/assets/aboki_male_rider_stylized_v2.glb",
  female: "/assets/aboki_female_rider_stylized_v2.glb"
} as const;

export default function RiderPreview3D({ riderId, className }: { riderId: RiderId; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const rider = RIDERS.find((item) => item.id === riderId) ?? RIDERS[0];
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
    camera.position.set(2.2, 1.25, 3.35);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf6fbff, 0x2a2528, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3, 6, 3);
    scene.add(key);

    const loader = new GLTFLoader();
    let model: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let raf = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    loader.load(RIDER_URLS[rider.gender], (gltf) => {
      if (disposed) return;
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y += size.y * 0.5;
      model.rotation.y = Math.PI * 0.72;
      model.scale.multiplyScalar(1.74 / Math.max(size.y, 0.001));

      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (!(material instanceof THREE.MeshStandardMaterial)) continue;
          const role = (node.name + " " + material.name).toLowerCase();
          if (/shirt|jacket|top|vest|hood|sleeve|outfit|clothes/i.test(role)) {
            material.color.lerp(new THREE.Color(rider.color), 0.34);
          }
          material.needsUpdate = true;
        }
        mesh.castShadow = true;
      });

      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
      scene.add(model);
    }, undefined, (error) => console.error("3D rider preview failed", error));

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const frame = () => {
      if (disposed) return;
      mixer?.update(Math.min(0.05, clock.getDelta()));
      if (model) model.rotation.y += 0.002;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(frame);

    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
      mixer?.stopAllAction();
      renderer.dispose();
      host.replaceChildren();
    };
  }, [riderId]);

  return <div ref={hostRef} className={className} aria-label="3D rider preview" />;
}
