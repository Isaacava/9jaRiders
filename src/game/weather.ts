import * as THREE from "three";
import type { World } from "./world";

export type TimeOfDay = "dawn" | "day" | "golden" | "dusk" | "night";
export type WeatherKind = "clear" | "haze" | "overcast" | "rain" | "storm";
export type Env = { time: TimeOfDay; weather: WeatherKind };

export const TIMES: TimeOfDay[] = ["dawn", "day", "golden", "dusk", "night"];
export const WEATHERS: WeatherKind[] = ["clear", "haze", "overcast", "rain", "storm"];
export const envLabel = (e: Env) => `${e.time.toUpperCase()} · ${e.weather.toUpperCase()}`;

type TimePreset = {
  sky: Array<[number, string]>; fog: string; hemiSky: string; hemiGround: string; hemiI: number;
  sun: string; sunI: number; sunOffset: [number, number, number]; exposure: number;
  windows: number; lamps: number; beams: boolean; envI: number; stars: boolean;
};
const T: Record<TimeOfDay, TimePreset> = {
  dawn: { sky: [[0, "#4a5aa0"], [0.4, "#b08cb8"], [0.49, "#f5b59a"], [0.53, "#ffd8a8"], [0.6, "#f0cfa6"], [1, "#b8a080"]], fog: "#e6c0b0", hemiSky: "#ffd9c8", hemiGround: "#7a6a62", hemiI: 0.8, sun: "#ffb48a", sunI: 2.4, sunOffset: [34, 14, 10], exposure: 0.95, windows: 0.5, lamps: 0.5, beams: false, envI: 0.7, stars: false },
  day: { sky: [[0, "#2c78cc"], [0.42, "#86bdea"], [0.49, "#d8e9f6"], [0.55, "#eee4cf"], [1, "#cdb98f"]], fog: "#cfe0ea", hemiSky: "#dff0ff", hemiGround: "#8a7352", hemiI: 1.0, sun: "#fff4dc", sunI: 3.5, sunOffset: [22, 44, 14], exposure: 1.0, windows: 0, lamps: 0, beams: false, envI: 1.0, stars: false },
  golden: { sky: [[0, "#3a6aa8"], [0.4, "#8fb0d0"], [0.49, "#f4d9ae"], [0.53, "#f2b97a"], [0.6, "#e6c9a0"], [1, "#c9a67a"]], fog: "#e9cfa8", hemiSky: "#ffe6c4", hemiGround: "#8a6b4c", hemiI: 0.95, sun: "#ffd29a", sunI: 3.3, sunOffset: [28, 28, 18], exposure: 1.0, windows: 0.1, lamps: 0.1, beams: false, envI: 0.9, stars: false },
  dusk: { sky: [[0, "#1c2858"], [0.4, "#5a4a88"], [0.48, "#d96a8a"], [0.52, "#f59a5a"], [0.58, "#7a5a6a"], [1, "#2a2230"]], fog: "#8a6a7e", hemiSky: "#a8b0e0", hemiGround: "#4a3a48", hemiI: 0.62, sun: "#ff8a5a", sunI: 1.5, sunOffset: [36, 12, 8], exposure: 1.0, windows: 0.9, lamps: 0.9, beams: true, envI: 0.45, stars: false },
  night: { sky: [[0, "#03060e"], [0.4, "#0a1430"], [0.5, "#13244a"], [0.56, "#0c1530"], [1, "#05080f"]], fog: "#0b1428", hemiSky: "#4d68b0", hemiGround: "#1a1d2c", hemiI: 0.5, sun: "#9db6ff", sunI: 0.75, sunOffset: [-20, 30, 12], exposure: 1.15, windows: 1.5, lamps: 1.4, beams: true, envI: 0.2, stars: true }
};
type WeatherMod = { grey: string; greyAmt: number; fogTint: string; fogAmt: number; fogFar: number; fogNear: number; sun: number; hemi: number; exposure: number; rain: number; wet: number; lightning: boolean; wind: number };
const W: Record<WeatherKind, WeatherMod> = {
  clear: { grey: "#ffffff", greyAmt: 0, fogTint: "#ffffff", fogAmt: 0, fogFar: 1, fogNear: 1, sun: 1, hemi: 1, exposure: 1, rain: 0, wet: 0, lightning: false, wind: 0 },
  haze: { grey: "#d8c4a0", greyAmt: 0.4, fogTint: "#d9c3a0", fogAmt: 0.6, fogFar: 0.62, fogNear: 0.5, sun: 0.75, hemi: 1.05, exposure: 1, rain: 0, wet: 0, lightning: false, wind: 0 },
  overcast: { grey: "#98a2aa", greyAmt: 0.75, fogTint: "#a7b0b6", fogAmt: 0.7, fogFar: 0.8, fogNear: 0.7, sun: 0.35, hemi: 1.08, exposure: 0.97, rain: 0, wet: 0.1, lightning: false, wind: 0 },
  rain: { grey: "#69747d", greyAmt: 0.85, fogTint: "#7b868f", fogAmt: 0.8, fogFar: 0.55, fogNear: 0.45, sun: 0.2, hemi: 0.92, exposure: 0.96, rain: 1, wet: 0.85, lightning: false, wind: 4 },
  storm: { grey: "#3b424c", greyAmt: 0.92, fogTint: "#4a525c", fogAmt: 0.88, fogFar: 0.45, fogNear: 0.35, sun: 0.1, hemi: 0.78, exposure: 0.95, rain: 1.6, wet: 1, lightning: true, wind: 9 }
};

const mixC = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const css = (c: THREE.Color) => `#${c.getHexString()}`;

export function makeSky(time: TimeOfDay, wx: WeatherKind) {
  const P = T[time], M = W[wx];
  const c = document.createElement("canvas"); c.width = 256; c.height = 512;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  for (const [at, col] of P.sky) {
    // storms/overcast pull the sky towards grey but keep the night/dusk darkness
    const base = new THREE.Color(col);
    const lum = base.r * 0.3 + base.g * 0.59 + base.b * 0.11;
    const grey = new THREE.Color(M.grey).multiplyScalar(0.35 + lum * 0.9);
    gr.addColorStop(at, css(base.lerp(grey, M.greyAmt)));
  }
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  if (P.stars && M.greyAmt < 0.5) {
    for (let i = 0; i < 380; i++) {
      g.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.65})`;
      const s = Math.random() < 0.08 ? 2 : 1;
      g.fillRect(Math.random() * 256, Math.random() * 220, s, s);
    }
    g.fillStyle = "#f4f1e0"; g.beginPath(); g.arc(70, 92, 9, 0, Math.PI * 2); g.fill();            // moon
    const halo = g.createRadialGradient(70, 92, 8, 70, 92, 46); halo.addColorStop(0, "rgba(220,230,255,0.35)"); halo.addColorStop(1, "rgba(220,230,255,0)");
    g.fillStyle = halo; g.fillRect(20, 40, 100, 100);
  }
  if (M.rain > 0) { // cloud bands
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,36,44,${0.05 + Math.random() * 0.08})`; g.fillRect(0, Math.random() * 230, 256, 6 + Math.random() * 22); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Rain {
  readonly lines: THREE.LineSegments;
  private pos: Float32Array; private seed: Float32Array;
  private n: number;
  private box = { w: 30, h: 16, d: 40 };
  private tmp = new THREE.Vector3();
  constructor(n: number) {
    this.n = n;
    this.pos = new Float32Array(n * 6); this.seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { this.seed[i * 3] = Math.random(); this.seed[i * 3 + 1] = Math.random(); this.seed[i * 3 + 2] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.38, depthWrite: false, fog: false }));
    this.lines.frustumCulled = false; this.lines.visible = false;
  }
  private world = new Float32Array(0);
  update(dt: number, cam: THREE.Vector3, camVel: THREE.Vector3, amount: number, wind: number) {
    const count = Math.min(this.n, Math.floor(this.n * Math.min(1, amount / 1.2)));
    this.lines.visible = count > 0;
    if (!count) return;
    if (this.world.length !== this.n * 3) { // world-space drop positions, scattered around the camera once
      this.world = new Float32Array(this.n * 3);
      for (let i = 0; i < this.n; i++) {
        this.world[i * 3] = cam.x + (this.seed[i * 3] - 0.5) * this.box.w;
        this.world[i * 3 + 1] = cam.y - 3 + this.seed[i * 3 + 1] * this.box.h;
        this.world[i * 3 + 2] = cam.z + (this.seed[i * 3 + 2] - 0.5) * this.box.d;
      }
    }
    const fall = 26 + amount * 5, { w, h, d } = this.box, w2 = w / 2, d2 = d / 2;
    this.tmp.set(wind, -fall, 0).sub(camVel); // drop velocity relative to the (moving) camera
    const len = 0.022;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      let x = this.world[o] + wind * dt, y = this.world[o + 1] - fall * dt, z = this.world[o + 2];
      if (y < cam.y - 3) y += h;
      let dx = x - cam.x, dz = z - cam.z;
      if (dx < -w2) x += w; else if (dx > w2) x -= w;
      if (dz < -d2) z += d; else if (dz > d2) z -= d;
      this.world[o] = x; this.world[o + 1] = y; this.world[o + 2] = z;
      const p = i * 6;
      this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
      this.pos[p + 3] = x - this.tmp.x * len; this.pos[p + 4] = y - this.tmp.y * len; this.pos[p + 5] = z - this.tmp.z * len;
      dx = 0; dz = 0;
    }
    this.lines.geometry.setDrawRange(0, count * 2);
    (this.lines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }
}

export class Weather {
  env: Env = { time: "golden", weather: "clear" };
  rainLevel = 0;
  onThunder: ((delay: number) => void) | null = null;
  private rain: Rain;
  private fogFar: number;
  private beams: THREE.Mesh[] = [];
  private flash = 0; private nextBolt = 6; private t = 0;
  private baseSky: THREE.Color = new THREE.Color(0xffffff);
  private cur = { hemiI: 1, sunI: 1, fogColor: new THREE.Color() };
  private lastVel = new THREE.Vector3(); private lastCam = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, private world: World, fogFar: number, rainDrops: number) {
    this.fogFar = fogFar;
    this.rain = new Rain(rainDrops);
    scene.add(this.rain.lines);
  }
  registerBeam(m: THREE.Mesh) { this.beams.push(m); this.applyBeams(); }
  private applyBeams() {
    const P = T[this.env.time];
    for (const b of this.beams) {
      b.visible = P.beams || this.rainLevel > 0.5;
      (b.material as THREE.MeshBasicMaterial).opacity = P.beams ? 0.26 : 0.16;
    }
  }

  set(env: Env) {
    this.env = env;
    const P = T[env.time], M = W[env.weather], w = this.world;
    // sky + fog
    const old = (w.sky.material as THREE.MeshBasicMaterial).map;
    (w.sky.material as THREE.MeshBasicMaterial).map = makeSky(env.time, env.weather);
    (w.sky.material as THREE.MeshBasicMaterial).needsUpdate = true;
    old?.dispose();
    const fog = this.scene.fog as THREE.Fog;
    const fc = mixC(P.fog, M.fogTint, M.fogAmt * (env.time === "night" ? 0.25 : 1));
    if (env.time === "night") fc.multiplyScalar(1 + M.greyAmt * 0.5);
    fog.color.copy(fc); this.cur.fogColor.copy(fc);
    fog.near = 50 * M.fogNear; fog.far = this.fogFar * M.fogFar;
    // lights
    this.cur.hemiI = P.hemiI * M.hemi; this.cur.sunI = P.sunI * M.sun;
    w.hemi.color.set(P.hemiSky); w.hemi.groundColor.set(P.hemiGround); w.hemi.intensity = this.cur.hemiI;
    w.sun.color.set(P.sun); w.sun.intensity = this.cur.sunI;
    w.sunOffset.set(...P.sunOffset);
    this.renderer.toneMappingExposure = P.exposure * M.exposure;
    (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = P.envI * (M.greyAmt > 0.5 ? 0.8 : 1);
    // night / wet look
    const night = P.lamps;
    w.mats.windows.emissiveIntensity = P.windows * (env.weather === "storm" ? 1.1 : 1);
    w.mats.lampHead.emissiveIntensity = 0.7 + night * 1.6;
    w.mats.glow.opacity = Math.min(1, night * 0.85);
    w.mats.pools.opacity = Math.min(0.55, night * 0.4);
    w.mats.neon.color.setScalar(env.time === "night" || env.time === "dusk" ? 1.25 : 0.8);
    w.mats.road.roughness = 0.88 - M.wet * 0.58;
    w.mats.road.color.setScalar(1 - M.wet * 0.3);
    w.mats.road.envMapIntensity = 0.3 + M.wet * 1.3;
    if (w.mats.water) w.mats.water.roughness = env.weather === "storm" ? 0.5 : 0.22;
    this.rainLevel = M.rain;
    this.applyBeams();
    this.nextBolt = 3 + Math.random() * 5;
  }

  update(dt: number, cam: THREE.Vector3) {
    this.t += dt;
    const M = W[this.env.weather];
    this.lastVel.copy(cam).sub(this.lastCam).divideScalar(Math.max(dt, 1e-3)); this.lastCam.copy(cam);
    if (this.lastVel.length() > 200) this.lastVel.set(0, 0, 0); // teleports (restart / cutscene cuts)
    this.rain.update(dt, cam, this.lastVel, M.rain, M.wind);
    if (M.lightning) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = 4 + Math.random() * 9; this.onThunder?.(0.25 + Math.random() * 1.8); }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.6);
      const pulse = this.flash * (0.6 + 0.4 * Math.sin(this.t * 60));
      this.world.hemi.intensity = this.cur.hemiI + pulse * 3.2;
      (this.world.sky.material as THREE.MeshBasicMaterial).color.setScalar(1 + pulse * 1.8);
      (this.scene.fog as THREE.Fog).color.copy(this.cur.fogColor).addScalar(pulse * 0.35);
    } else if (M.lightning) {
      this.world.hemi.intensity = this.cur.hemiI;
      (this.world.sky.material as THREE.MeshBasicMaterial).color.setScalar(1);
      (this.scene.fog as THREE.Fog).color.copy(this.cur.fogColor);
    }
  }

  dispose() { this.scene.remove(this.rain.lines); this.rain.lines.geometry.dispose(); }
}

/** Lighting numbers for an environment, so cutscene sets can reuse exactly the same looks as the race. */
export function lightingFor(env: Env) {
  const P = T[env.time], M = W[env.weather];
  const fog = mixC(P.fog, M.fogTint, M.fogAmt * (env.time === "night" ? 0.25 : 1));
  if (env.time === "night") fog.multiplyScalar(1 + M.greyAmt * 0.5);
  return {
    fog, fogNear: 12 * M.fogNear + 6, fogFar: 160 * M.fogFar + 40,
    hemiSky: P.hemiSky, hemiGround: P.hemiGround, hemiI: P.hemiI * M.hemi,
    sun: P.sun, sunI: P.sunI * M.sun, sunOffset: P.sunOffset as [number, number, number],
    exposure: P.exposure * M.exposure, envI: P.envI, rain: M.rain, wind: M.wind, wet: M.wet,
    windows: P.windows, lamps: P.lamps, lightning: M.lightning, night: env.time === "night" || env.time === "dusk"
  };
}

/** Free-play variety: a deterministic-ish pick, overridable with ?time=night&weather=rain in the URL. */
export function pickEnv(url?: URLSearchParams): Env {
  const time = (url?.get("time") as TimeOfDay | null) ?? null;
  const weather = (url?.get("weather") as WeatherKind | null) ?? null;
  const rt = TIMES[[1, 2, 2, 3, 4, 2][Math.floor(Math.random() * 6)]];
  const rw = WEATHERS[[0, 0, 0, 1, 2, 3][Math.floor(Math.random() * 6)]];
  return { time: time && TIMES.includes(time) ? time : rt, weather: weather && WEATHERS.includes(weather) ? weather : rw };
}
