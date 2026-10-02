"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BIKE_URLS: Record<string, string> = {
  starter: "/api/3dassets/model?asset=15423",
  speed: "/api/3dassets/model?asset=15424",
  heavy: "/api/3dassets/model?asset=15428",
  elite: "/api/3dassets/model?asset=15416",
  legendary: "/api/3dassets/model?asset=15415",
  cafe: "/api/3dassets/model?asset=15429",
  flattrack: "/api/3dassets/model?asset=15420",
  lightweight: "/api/3dassets/model?asset=15421",
  dirt: "/assets/dirt-bike.glb"
};

type Props = {
  bikeId: keyof typeof BIKE_URLS;
  className?: string;
};

export default function BikePreview3D({ bikeId, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const url = BIKE_URLS[bikeId] ?? BIKE_URLS.starter;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    camera.position.set(3.4, 1.55, 4.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.replaceChildren(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x1d2228, 1.9);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 7, 4);
    key.castShadow = true;
    scene.add(ambient, key);

    const rim = new THREE.PointLight(0x68d8ff, 18, 12, 2);
    rim.position.set(-3, 2.6, -2.4);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 48),
      new THREE.MeshBasicMaterial({ color: 0x071015, transparent: true, opacity: 0.34 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.015;
    scene.add(floor);

    const loader = new GLTFLoader();
    let model: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let raf = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.sub(center);
        model.position.y += size.y * 0.48;
        model.rotation.y = Math.PI * 0.72;

        const longest = Math.max(size.x, size.y, size.z);
        const fit = 3.05 / Math.max(longest, 0.001);
        model.scale.multiplyScalar(fit);

        if (gltf.animations.length) {
          const clip =
            gltf.animations.find((item) => /roll|wheel/i.test(item.name)) ??
            gltf.animations.find((item) => /steer|idle|drive/i.test(item.name)) ??
            gltf.animations[0];
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(clip).play();
        }

        scene.add(model);
      },
      undefined,
      (error) => console.error("3D bike preview failed", error)
    );

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const frame = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      if (mixer) mixer.update(dt);
      if (model) model.rotation.y += dt * 0.24;
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
      floor.geometry.dispose();
      floor.material.dispose();
      host.replaceChildren();
    };
  }, [bikeId]);

  return <div ref={hostRef} className={className} aria-label="3D motorcycle preview" />;
}
