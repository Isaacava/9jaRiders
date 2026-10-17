import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BIKES, RIDERS, getBike, getDifficulty, getRider } from "./loadout";
import { buildRacer, disposeTree, type Racer3D } from "./models/racer";
import { buildTraffic, TRAFFIC_SIZE, type TrafficKind } from "./models/traffic";
import { mulberry32 } from "./models/util";
import { getSharedRealtimeClient, type RealtimeState } from "./multiplayer";
import { buildWorld, ROAD_HALF, laneX } from "./world";
import { buildMarker, type Marker } from "./marker";
import { getMap } from "./maps";
import type { Frame } from "./track";
import { Weather, envLabel, pickEnv, type Env } from "./weather";
import { Mission, type Host, type MissionResult } from "./story/mission";
import { SPEAKERS, type MissionCfg } from "./story/types";
import { RIDER_LOOKS } from "./models/rider";
import { GameAudio } from "./audio";
import { VoiceBox } from "./voice";
import { flavor, getLangMode } from "./story/lang";
import { DynamicRes, qualityFor, resolveTier, setGfxSetting, type GfxSetting } from "./quality";

export type RaceMode = "solo" | "multiplayer" | "demo";
export type MissionOutcome = MissionResult & { reward: number; time: number; skipped?: boolean; retry?: boolean };
export type RaceOptions = {
  mode: RaceMode; room?: string; player?: string; map?: string; env?: Env;
  /** story mode: objective, rivals, comms... */
  mission?: MissionCfg; attempt?: number; onMissionEnd?: (o: MissionOutcome) => void;
};

type Racer = {
  id: string; name: string; human: boolean; remote: boolean;
  model: Racer3D; x: number; dist: number; v: number; vx: number;
  vmax: number; accel: number; handling: number;
  nitro: number; boosting: boolean; skill: number;
  laneT: number; laneTimer: number; hit: number; hitCool: number;
  finished: boolean; place: number; finishT: number;
  roll: number; steerAng: number; pitch: number; mult: number; bestMult: number;
  braking: boolean; ahead: boolean; color: string; lastDist: number;
  padT: number; padCool: number;
  /** story: false = not in the world yet; scripted = driven by the mission rules instead of the CPU brain */
  active: boolean; scripted: boolean;
};

type TrafficCar = {
  kind: TrafficKind; x: number; dist: number; v: number; w: number; l: number;
  mesh: THREE.Group | null; variant: number; passed: boolean; minDx: number; hitFlag: boolean; hornCool: number;
};

type Pickup = {
  y0: number; x: number; dist: number; taken: boolean; mesh: THREE.Group };

const COLORS = ["#2fd1c0", "#ff5d73", "#ffd24d", "#7aa7ff", "#c58bff", "#ff9a52", "#7be08a", "#ffffff"];
const ROAD_LIMIT = ROAD_HALF - 0.75;

const CSS = `
.rr-hud{position:absolute;inset:0;pointer-events:none;color:#fff;font-family:Impact,"Arial Black",system-ui,sans-serif;text-transform:uppercase;user-select:none;-webkit-user-select:none;text-shadow:0 2px 6px rgba(0,0,0,.55)}
.rr-top{position:absolute;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.rr-chip{background:rgba(10,14,18,.62);border:2px solid rgba(255,255,255,.18);border-radius:12px;padding:6px 12px;font-size:20px;letter-spacing:.04em;backdrop-filter:blur(6px);min-width:70px;text-align:center;line-height:1.05}
.rr-chip small{display:block;font-size:10px;letter-spacing:.15em;opacity:.7;font-family:system-ui,sans-serif;font-weight:700}
.rr-pos b{font-size:30px;color:#ffd24d}
.rr-speed b{font-size:32px}
.rr-mult{position:absolute;right:12px;top:calc(max(10px,env(safe-area-inset-top)) + 78px);font-size:26px;color:#ffd24d}
.rr-prog{position:absolute;left:14px;right:14px;top:calc(max(10px,env(safe-area-inset-top)) + 66px);height:8px;border-radius:6px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.25)}
.rr-dot{position:absolute;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;border:2px solid #111;transition:left .15s linear}
.rr-nitro{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));width:min(52%,340px);text-align:center;font-size:12px;letter-spacing:.2em}
.rr-bar{height:12px;border-radius:8px;background:rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.3);overflow:hidden;margin-top:4px}
.rr-bar i{display:block;height:100%;width:50%;background:linear-gradient(90deg,#3aa0ff,#b06bff);transition:width .1s}
.rr-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.rr-count{font-size:min(30vw,170px);color:#ffd24d;-webkit-text-stroke:3px #111;animation:rrpop .9s ease-out infinite}
@keyframes rrpop{0%{transform:scale(1.7);opacity:0}25%{opacity:1}100%{transform:scale(.9);opacity:.9}}
.rr-pop{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:26px;color:#7dffb2;opacity:0}
.rr-pop.on{animation:rrfloat 1.1s ease-out}
@keyframes rrfloat{0%{opacity:0;transform:translateY(18px) scale(.8)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}
.rr-steer{z-index:2;position:absolute;left:0;right:0;bottom:0;height:58%;display:none;touch-action:none;pointer-events:auto;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.rr-steer.touch{display:flex}
.rr-steer i{flex:1;display:flex;align-items:flex-end;justify-content:center;padding-bottom:calc(40px + env(safe-area-inset-bottom));font-style:normal;color:rgba(255,255,255,.5);font-size:52px;transition:background .06s;border-radius:0}
.rr-steer i.l{background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,0))}
.rr-steer i.r{background:linear-gradient(270deg,rgba(255,255,255,.05),rgba(255,255,255,0))}
.rr-steer i.on{background:rgba(255,255,255,.16);color:#fff}
.rr-ctl{z-index:4;position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom));display:none;justify-content:space-between;align-items:flex-end;padding:0 14px;pointer-events:none}
.rr-ctl.touch{display:flex}
.rr-btn.brake{width:92px;height:92px;font-size:13px;font-weight:800;letter-spacing:.04em;border-color:rgba(255,120,120,.6)}
.rr-btn.nitro{width:108px;height:108px}
.rr-btn{pointer-events:auto;touch-action:none;width:74px;height:74px;border-radius:50%;border:3px solid rgba(255,255,255,.4);background:rgba(12,16,20,.55);color:#fff;font-size:30px;font-family:inherit;display:grid;place-items:center;backdrop-filter:blur(4px)}
.rr-btn.on{background:rgba(255,210,77,.75);color:#111}
.rr-btn.nitro{width:84px;height:84px;background:rgba(80,120,255,.6);font-size:22px}
.rr-pair{display:flex;gap:12px}
.rr-hint{position:absolute;left:0;right:0;bottom:calc(46px + env(safe-area-inset-bottom));text-align:center;font-size:11px;letter-spacing:.14em;opacity:.7;font-family:system-ui,sans-serif;font-weight:700}
.rr-result{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,10,14,.62);pointer-events:auto;backdrop-filter:blur(3px)}
.rr-card{background:#fff6e4;color:#14181c;border:4px solid #14181c;box-shadow:6px 6px 0 #14181c;border-radius:16px;padding:20px 24px;width:min(88%,360px);text-align:center;text-shadow:none}
.rr-card h2{margin:0;font-size:46px;color:#f08a38;-webkit-text-stroke:2px #14181c;line-height:1}
.rr-card p{margin:6px 0;font-family:system-ui,sans-serif;font-weight:800;letter-spacing:.06em;font-size:14px}
.rr-card a,.rr-card button{display:block;margin-top:10px;padding:12px;border-radius:12px;border:3px solid #14181c;background:#f08a38;color:#14181c;font:inherit;font-size:20px;text-decoration:none;cursor:pointer}
.rr-card a.alt{background:#fff}
.rr-wait{position:absolute;inset:0;display:grid;place-items:center;font-size:22px;letter-spacing:.2em}
.rr-flash{position:absolute;inset:0;background:radial-gradient(transparent 40%,rgba(255,40,40,.55));opacity:0;transition:opacity .35s}
.rr-boost{position:absolute;inset:0;background:radial-gradient(transparent 40%,rgba(255,170,60,.45));opacity:0;transition:opacity .25s}
.rr-env{position:absolute;left:50%;transform:translateX(-50%);top:calc(max(10px,env(safe-area-inset-top)) + 54px);font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;color:#fff;opacity:.75;text-shadow:0 1px 3px #000;pointer-events:none;white-space:nowrap}
.rr-drops{position:absolute;inset:0;opacity:0;transition:opacity 1.2s;pointer-events:none;background-image:radial-gradient(circle at 12% 18%,rgba(255,255,255,.22) 0 2px,transparent 3px),radial-gradient(circle at 83% 32%,rgba(255,255,255,.2) 0 3px,transparent 4px),radial-gradient(circle at 36% 71%,rgba(255,255,255,.18) 0 2px,transparent 3px),radial-gradient(circle at 67% 86%,rgba(255,255,255,.22) 0 3px,transparent 4px),radial-gradient(circle at 92% 64%,rgba(255,255,255,.16) 0 2px,transparent 3px),radial-gradient(circle at 24% 44%,rgba(255,255,255,.16) 0 3px,transparent 4px);background-size:100% 100%;animation:rrdrip 3.2s linear infinite}
@keyframes rrdrip{from{transform:translateY(-3%)}to{transform:translateY(3%)}}
.rr-mis{position:absolute;left:12px;top:calc(max(10px,env(safe-area-inset-top)) + 130px);max-width:min(300px,56vw);background:rgba(10,12,16,.62);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:8px 12px;color:#fff;pointer-events:none}
.rr-mis .g{font:900 10px/1.3 system-ui,sans-serif;letter-spacing:.1em;color:#ffd24d}
.rr-mis .row{display:flex;gap:12px;margin-top:4px;font:800 13px/1 system-ui,sans-serif}
.rr-mis .tm.low{color:#ff6b6b;animation:csb 0.6s infinite}
.rr-mis .bars{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.rr-mis .bars i{display:none;height:6px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}
.rr-mis .bars i b{display:block;height:100%;width:0;background:#ff5a5a}
.rr-mis .bars i.bf b{background:#7dffb2}
.rr-cap{position:absolute;left:50%;transform:translateX(-50%) translateY(10px);top:calc(max(10px,env(safe-area-inset-top)) + 84px);width:min(560px,90%);background:rgba(10,12,16,.82);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:8px 12px;color:#fff;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;font:600 14px/1.4 system-ui,sans-serif}
.rr-wp{position:absolute;left:50%;top:30%;transform:translate(-50%,-100%);text-align:center;pointer-events:none;color:#ffd24d;font:900 12px/1.1 system-ui,sans-serif;letter-spacing:.08em;text-shadow:0 1px 4px #000;transition:opacity .2s}
.rr-wp i{display:block;font-style:normal;font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.7));animation:rrbob 1s ease-in-out infinite}
.rr-wp small{display:block;font:700 10px/1.2 system-ui,sans-serif;color:#fff;letter-spacing:.12em;max-width:160px;opacity:.9}
@keyframes rrbob{50%{transform:translateY(-5px)}}
.rr-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .9s ease}
.rr-cap.on{opacity:1;transform:translateX(-50%) translateY(0)}
.rr-cap .gl{display:block;font:italic 600 11px/1.3 system-ui,sans-serif;color:#ffd9a0;opacity:.85;margin-top:3px}
.rr-cap b{display:block;font:900 10px/1 system-ui,sans-serif;letter-spacing:.14em;margin-bottom:3px}
.rr-mres{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:10px;pointer-events:auto;padding:20px}
.rr-mres h2{font:900 clamp(30px,8vw,64px)/1 Impact,Arial Black,sans-serif;margin:0;letter-spacing:.03em}
.rr-mres p{max-width:480px;font:600 16px/1.45 system-ui,sans-serif;opacity:.92;margin:0}
.rr-mres .rw{font:900 22px system-ui,sans-serif;color:#7dffb2}
.rr-mres button{background:#f28c28;color:#15161a;border:0;border-radius:14px;padding:12px 26px;font:900 15px system-ui,sans-serif;letter-spacing:.06em;margin:4px}
.rr-mres button.alt{background:rgba(255,255,255,.16);color:#fff}
.rr-hud.min .rr-pos,.rr-hud.min .rr-prog,.rr-hud.min .rr-mult{display:none}
.rr-ping{position:absolute;right:12px;top:calc(max(10px,env(safe-area-inset-top)) + 78px);font:700 11px/1 system-ui,sans-serif;letter-spacing:.05em;color:#7dffb2;text-shadow:0 1px 2px #000;pointer-events:none}
.rr-lines{position:absolute;inset:0;opacity:0;transition:opacity .2s;pointer-events:none;background:repeating-conic-gradient(from 0deg at 50% 60%,rgba(255,255,255,0) 0deg 5deg,rgba(255,255,255,.16) 5deg 5.8deg);-webkit-mask:radial-gradient(circle at 50% 60%,transparent 26%,#000 72%);mask:radial-gradient(circle at 50% 60%,transparent 26%,#000 72%);animation:rrspin 1.1s linear infinite}
@keyframes rrspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.rr-gfx{left:62px;font-size:11px;letter-spacing:.04em;width:auto;padding:0 10px;border-radius:21px}
.rr-mute{position:absolute;left:12px;top:calc(max(10px,env(safe-area-inset-top)) + 78px);pointer-events:auto;width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,14,18,.6);color:#fff;font-size:18px;display:grid;place-items:center}
`;

/** soft dark blob used as a contact shadow under every bike and car (real shadow maps are off on weak phones,
 *  and without any shadow vehicles look like they hover above the tarmac) */
let BLOB: { geo: THREE.PlaneGeometry; mat: THREE.MeshBasicMaterial } | null = null;
function blobShadow(w: number, l: number, strength = 0.55) {
  if (!BLOB) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, "rgba(0,0,0,0.95)"); gr.addColorStop(0.55, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    BLOB = {
      geo: new THREE.PlaneGeometry(1, 1),
      mat: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 1, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
    };
  }
  const m = new THREE.Mesh(BLOB.geo, BLOB.mat.clone());
  (m.material as THREE.MeshBasicMaterial).opacity = strength;
  m.scale.set(w, l, 1);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2; m.frustumCulled = false;
  return m;
}

const ordinal = (n: number) => `${n}${["TH", "ST", "ND", "RD"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "TH"}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function createThreeRace(container: HTMLElement, options: RaceOptions) {
  const mode = options.mode;
  const demo = mode === "demo";
  // the route: a real Lagos map (multiplayer uses a fixed 5 km course so it matches the server's finish line)
  const map = mode === "multiplayer" ? { ...getMap("third_mainland"), length: 5000 } : getMap(options.map ?? (demo ? "ojuelegba" : new URLSearchParams(window.location.search).get("map") ?? "ojuelegba"));
  const GOAL = map.length;
  const rnd = mulberry32(1337 + Math.floor(Math.random() * 1000));
  let disposed = false;
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((r) => { resolveReady = r; });

  // ---------- renderer / scene ----------
  // graphics tier is detected from the device (or chosen by the player) and adapted live by a resolution governor
  const { tier: gfxTier, setting: gfxSetting } = resolveTier();
  const Q = qualityFor(gfxTier, demo);
  const dyn = new DynamicRes(Q.minDpr, Q.maxDpr, Q.startDpr, Q.targetMs);
  const renderer = new THREE.WebGLRenderer({ antialias: Q.msaa, powerPreference: "high-performance" });
  renderer.setPixelRatio(dyn.dpr);
  renderer.shadowMap.enabled = Q.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe9cfa8, 50, Q.fogFar);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.3, Q.fogFar + 80);
  // story missions (except proper races) end at a GTA-style destination marker instead of a finish line
  const markerMode = !!options.mission && options.mission.objective !== "race";
  const world = buildWorld(scene, { map, crowd: Q.crowd, shadows: Q.shadows, shadowSize: Q.shadowSize, finishLine: !markerMode });
  const marker: Marker | null = markerMode ? buildMarker(scene, world.track, GOAL, ROAD_HALF) : null;
  const track = world.track;
  const _f: Frame = { px: 0, py: 0, pz: 0, th: 0 };
  const _w = { x: 0, y: 0, z: 0 }, _w2 = { x: 0, y: 0, z: 0 };
  const _wp = new THREE.Vector3();
  // time of day + weather (night, rain, storm...): story missions set it, free races pick one (or ?time=night&weather=rain)
  const envSel: Env = options.env ?? (demo ? { time: "golden", weather: "clear" } : pickEnv(new URLSearchParams(window.location.search)));
  const weather = new Weather(scene, renderer, world, Q.fogFar, Q.tier === "low" ? 220 : Q.tier === "medium" ? 420 : 700);
  weather.set(envSel);
  world.sky.scale.setScalar((camera.far * 0.88) / 1400); // the dome must sit INSIDE the far plane or the sky disappears

  // ---------- HUD ----------
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const hud = document.createElement("div");
  hud.className = "rr-hud";
  hud.style.display = demo ? "none" : "block";
  hud.innerHTML = `
    <div class="rr-flash"></div><div class="rr-boost"></div><div class="rr-lines"></div>
    <div class="rr-drops"></div>
    <div class="rr-env"></div>
    <div class="rr-ping"></div>
    <button class="rr-mute" data-k="mute" aria-label="sound">🔊</button>
    <button class="rr-mute rr-gfx" data-k="gfx" aria-label="graphics quality">GFX</button>
    <div class="rr-top">
      <div class="rr-chip"><small>TIME</small><b data-k="time">0:00.0</b></div>
      <div class="rr-chip rr-pos"><small>POSITION</small><b data-k="pos">1</b>/<span data-k="total">8</span></div>
      <div class="rr-chip rr-speed"><small>KM/H</small><b data-k="speed">0</b></div>
    </div>
    <div class="rr-mis" style="display:none"><div class="g"></div><div class="row"><span class="tm"></span><span class="bag"></span></div><div class="bars"><i class="bc"><b></b></i><i class="bf"><b></b></i></div></div>
    <div class="rr-cap"></div>
    <div class="rr-wp" style="display:none"><i>📍</i><b></b><small></small></div>
    <div class="rr-fade"></div>
    <div class="rr-mres" style="display:none"></div>
    <div class="rr-prog" data-k="prog"></div>
    <div class="rr-mult" data-k="mult">1.00×</div>
    <div class="rr-pop" data-k="pop"></div>
    <div class="rr-center" data-k="center"></div>
    <div class="rr-ctl" data-k="ctl">
      <button class="rr-btn brake" data-b="brake">BRAKE</button>
      <button class="rr-btn nitro" data-b="nitro">NITRO</button>
    </div>
    <div class="rr-steer" data-k="steer"><i class="l"><span>◀</span></i><i class="r"><span>▶</span></i></div>
    <div class="rr-hint" data-k="hint">← → STEER · SPACE NITRO · ↓ BRAKE</div>
    <div class="rr-nitro">NITRO<div class="rr-bar"><i data-k="nitro"></i></div></div>`;
  container.appendChild(hud);
  const $ = (k: string) => hud.querySelector(`[data-k="${k}"]`) as HTMLElement;
  const btn = (b: string) => hud.querySelector(`[data-b="${b}"]`) as HTMLElement;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch) { $("ctl").classList.add("touch"); $("steer").classList.add("touch"); $("hint").style.display = "none"; }
  const flash = hud.querySelector(".rr-flash") as HTMLElement;
  const boostFx = hud.querySelector(".rr-boost") as HTMLElement;
  const linesFx = hud.querySelector(".rr-lines") as HTMLElement;
  const pingEl = hud.querySelector(".rr-ping") as HTMLElement;
  (hud.querySelector(".rr-env") as HTMLElement).textContent = demo ? "" : `${envLabel(envSel)} · ${map.name.toUpperCase()}`;
  (hud.querySelector(".rr-drops") as HTMLElement).style.opacity = weather.rainLevel > 0 && !demo ? "0.8" : "0";

  let popTimer = 0;
  const popup = (text: string, color = "#7dffb2") => {
    const el = $("pop");
    el.textContent = text; el.style.color = color;
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    popTimer = 1.1;
  };

  // ---------- input ----------
  const input = { left: false, right: false, brake: false, nitro: false };
  const keyMap: Record<string, keyof typeof input> = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    ArrowDown: "brake", KeyS: "brake", Space: "nitro", KeyN: "nitro", ArrowUp: "nitro", KeyW: "nitro"
  };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const k = keyMap[e.code];
    if (!k) return;
    input[k] = down; e.preventDefault(); startAudio();
  };
  const kd = onKey(true), ku = onKey(false);
  window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
  const bindBtn = (name: string, key: keyof typeof input) => {
    const el = btn(name);
    const set = (v: boolean) => (e: Event) => { e.preventDefault(); e.stopPropagation(); input[key] = v; el.classList.toggle("on", v); if (v) startAudio(); };
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); set(true)(e); });
    el.addEventListener("pointerup", set(false)); el.addEventListener("pointercancel", set(false));
  };
  bindBtn("nitro", "nitro"); bindBtn("brake", "brake");
  // STEERING: the whole lower half of the screen is one big touch zone (left half = left, right half = right).
  // Reacts on touch-down (no click delay), supports sliding between halves, and several fingers at once.
  {
    const zone = $("steer");
    const li = zone.querySelector("i.l") as HTMLElement, ri = zone.querySelector("i.r") as HTMLElement;
    const active = new Map<number, "l" | "r">();
    const apply = () => {
      const vals = [...active.values()];
      input.left = vals.includes("l"); input.right = vals.includes("r");
      li.classList.toggle("on", input.left); ri.classList.toggle("on", input.right);
    };
    const side = (e: PointerEvent): "l" | "r" => (e.clientX < zone.getBoundingClientRect().left + zone.clientWidth / 2 ? "l" : "r");
    zone.addEventListener("pointerdown", (e) => {
      e.preventDefault(); zone.setPointerCapture(e.pointerId);
      active.set(e.pointerId, side(e)); apply(); startAudio();
      try { navigator.vibrate?.(6); } catch { /* not supported */ }
    });
    zone.addEventListener("pointermove", (e) => { if (active.has(e.pointerId)) { active.set(e.pointerId, side(e)); apply(); } });
    const end = (e: PointerEvent) => { if (active.delete(e.pointerId)) apply(); };
    zone.addEventListener("pointerup", end); zone.addEventListener("pointercancel", end); zone.addEventListener("lostpointercapture", end);
  }
  const cv = renderer.domElement;

  // ---------- audio (Afrobeats groove, engine, horns, Lagos ambience; see audio.ts) ----------
  const audio = new GameAudio();
  const voices = new VoiceBox(audio);
  const langMode = getLangMode();
  function startAudio() { if (!demo) audio.start(); }
  const unlockAudio = () => startAudio();
  window.addEventListener("pointerdown", unlockAudio); window.addEventListener("keydown", unlockAudio);
  weather.onThunder = (delay) => audio.thunder(delay);
  const muteBtn = hud.querySelector(".rr-mute") as HTMLButtonElement;
  muteBtn.textContent = audio.isMuted() ? "🔇" : "🔊";
  const gfxBtn = hud.querySelector(".rr-gfx") as HTMLButtonElement;
  gfxBtn.textContent = `GFX ${gfxSetting === "auto" ? "AUTO·" + gfxTier.toUpperCase().slice(0, 1) : gfxSetting.toUpperCase()}`;
  gfxBtn.addEventListener("click", () => {
    const order: GfxSetting[] = ["auto", "low", "medium", "high"];
    setGfxSetting(order[(order.indexOf(gfxSetting) + 1) % order.length]);
    window.location.reload();
  });
  muteBtn.addEventListener("click", () => { audio.start(); audio.setMuted(!audio.isMuted()); muteBtn.textContent = audio.isMuted() ? "🔇" : "🔊"; });

  // ---------- racers ----------
  const racers: Racer[] = [];
  const loadout = (() => {
    const g = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
    return { bike: g("aboki:bike"), rider: g("aboki:rider"), difficulty: g("aboki:difficulty") };
  })();
  const diff = { easy: 0.9, normal: 0.97, hard: 1.04 }[getDifficulty(loadout.difficulty)];

  const makeRacer = (id: string, name: string, bikeId: string, riderId: string, human: boolean, remote: boolean, color: string): Racer => {
    const def = getBike(bikeId);
    const model = buildRacer(def.id, RIDER_LOOKS[riderId] ? riderId : getRider(riderId).id);
    model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    weather.registerBeam(model.bike.beam);
    const blob = blobShadow(1.15, 2.6, 0.6); blob.position.y = 0.035; blob.name = "blob";
    model.root.add(blob);
    scene.add(model.root);
    return {
      id, name, human, remote, model, x: 0, dist: 0, v: 0, vx: 0,
      vmax: def.topSpeed / 3.6, accel: def.acceleration, handling: def.handling,
      nitro: 0.6, boosting: false, skill: human ? 1 : 0.9 + rnd() * 0.1,
      laneT: 0, laneTimer: rnd() * 2, hit: 0, hitCool: 0, finished: false, place: 0, finishT: 0,
      roll: 0, steerAng: 0, pitch: 0, mult: 1, bestMult: 1, braking: false, ahead: false, color, lastDist: 0, padT: 0, padCool: 0, active: true, scripted: false
    };
  };

  const slot = (i: number) => {
    const cols = [-3.6, -1.2, 1.2, 3.6];
    return { x: cols[i % 4], dist: -(Math.floor(i / 4) * 6) - (i % 2) * 2.5 };
  };

  let player: Racer | null = null;
  const M = options.mission ?? null;
  const rivalRacers: Racer[] = [];
  if (mode !== "multiplayer" && M) {
    // STORY MISSION: the player's story bike + a hand-picked cast of rivals / pursuers / allies
    player = makeRacer("player", "ABOKI", M.bike, M.rider ?? "aboki", true, false, COLORS[0]);
    racers.push(player);
    M.rivals.forEach((rv, i) => {
      const c = makeRacer(`rv${i}`, rv.rider.toUpperCase(), rv.bike, rv.rider, false, false, COLORS[(i + 1) % COLORS.length]);
      c.skill = rv.skill ?? 0.8;
      if (rv.role === "racer") c.vmax *= c.skill * diff; else { c.scripted = true; c.active = false; c.dist = -5000; c.x = 0; }
      racers.push(c); rivalRacers.push(c);
    });
    // grid: the player in front-middle, racers around; hidden riders are parked far behind until the mission calls them in
    const grid = racers.filter((r) => !r.scripted);
    const slots = [6, 0, 1, 2, 3, 4, 5, 7]; // player on the back row so he sees the pack
    grid.forEach((r, i) => { const s2 = slot(slots[i % slots.length]); r.x = s2.x; r.dist = s2.dist; r.laneT = r.x; r.lastDist = r.dist; });
  } else if (mode !== "multiplayer") {
    const bikeId = demo ? BIKES[Math.floor(rnd() * BIKES.length)].id : loadout.bike ?? "starter";
    const riderId = demo ? "ada" : loadout.rider ?? "main";
    const pdef = getRider(riderId);
    player = makeRacer("player", pdef.name, bikeId, riderId, !demo, false, COLORS[0]);
    player.vmax *= 1.0;
    const order = [6, 0, 1, 2, 3, 4, 5, 7]; // player starts on the back row: clear view of the pack
    // every CPU gets a different character (shuffled, never the player's own)
    const cpuPool = RIDERS.map((r) => r.id).filter((id) => id !== pdef.id);
    for (let i = cpuPool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cpuPool[i], cpuPool[j]] = [cpuPool[j], cpuPool[i]]; }
    racers.push(player);
    for (let i = 0; i < (demo ? 3 : 7); i++) { // the home-screen demo only needs a small pack
      const cb = BIKES[Math.floor(rnd() * BIKES.length)].id;
      const cr = cpuPool[i % cpuPool.length];
      const c = makeRacer(`cpu${i}`, `CPU ${i + 1}`, cb, cr, false, false, COLORS[i + 1]);
      c.vmax *= c.skill * diff;
      racers.push(c);
    }
    racers.forEach((r, i) => { const s = slot(order[i]); r.x = s.x; r.dist = s.dist; r.laneT = r.x; r.lastDist = r.dist; });
  }

  // ---------- traffic + pickups ----------
  const traffic: TrafficCar[] = [];
  const pickups: Pickup[] = [];
  if (mode !== "multiplayer") {
    const kinds: TrafficKind[] = ["danfo", "sedan", "keke", "suv", "truck", "sedan", "danfo"];
    const density = M?.traffic ?? 1;
    for (let d = 150; d < GOAL - 120; d += (55 + rnd() * 60) / Math.max(0.2, density)) {
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      const size = TRAFFIC_SIZE[kind];
      const speedBase = { danfo: 13, sedan: 15, keke: 9, suv: 15, truck: 10.5 }[kind];
      traffic.push({ kind, x: laneX(Math.floor(rnd() * 5)), dist: d, v: speedBase + rnd() * 3, w: size.w, l: size.l, mesh: null, variant: Math.floor(rnd() * 5), passed: false, minDx: 99, hitFlag: false, hornCool: 0 });
    }
    // roadblocks: a line of parked police SUVs across the road with a two-lane gap
    for (const d of M?.roadblocks ?? []) {
      const gap = Math.floor(rnd() * 4);
      for (let lane = 0; lane < 5; lane++) {
        if (lane === gap || lane === gap + 1) continue;
        const size = TRAFFIC_SIZE.suv;
        traffic.push({ kind: "suv", x: laneX(lane), dist: d + (lane % 2) * 3, v: 0, w: size.w, l: size.l, mesh: null, variant: 5, passed: false, minDx: 99, hitFlag: false, hornCool: 0 });
      }
    }
    traffic.sort((a, b) => a.dist - b.dist);
    const padGeo = new THREE.TorusGeometry(0.55, 0.1, 12, 28);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x59a8ff, emissive: 0x2a7bff, emissiveIntensity: 2.2, roughness: 0.3 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb7d6ff, emissiveIntensity: 2.5 });
    for (let d = 190; d < GOAL - 80; d += 140 + rnd() * 120) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(padGeo, padMat), new THREE.Mesh(new THREE.OctahedronGeometry(0.28), coreMat));
      const x = laneX(Math.floor(rnd() * 5));
      track.at(d, x, 1.0, _w, _f); g.position.set(_w.x, _w.y, _w.z); scene.add(g);
      pickups.push({ x, dist: d, taken: false, mesh: g, y0: _w.y });
    }
  }

  // route-knowledge shortcut gates (final ride): a big green gate across the middle lanes
  const gates = (M?.shortcuts ?? []).map((sc) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5), new THREE.MeshBasicMaterial({ color: 0x35ff9a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    track.at(sc.at, 0, 0.03, _w, _f);
    m.rotation.order = "YXZ"; m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.y = -_f.th; m.position.set(_w.x, _w.y, _w.z);
    scene.add(m);
    return { ...sc, dist: sc.at, taken: false, mesh: m };
  });
  let draftT = 0, frameN = 0, steerAxis = 0;
  let mission: Mission | null = null;
  let missionOver = false;
  let gateTick: (() => void) | null = null;

  // traffic cars are pooled (no geometry / material churn while racing)
  const trafficPool = new Map<string, THREE.Group[]>();
  const poolKey = (kind: TrafficKind, variant: number) => `${kind}:${variant % 7}`;
  const acquireTraffic = (kind: TrafficKind, variant: number) => trafficPool.get(poolKey(kind, variant))?.pop() ?? buildTraffic(kind, variant);
  const releaseTraffic = (kind: TrafficKind, variant: number, m: THREE.Group) => {
    const k = poolKey(kind, variant);
    const a = trafficPool.get(k);
    if (a) a.push(m); else trafficPool.set(k, [m]);
  };

  // ---------- state ----------
  type Phase = "wait" | "countdown" | "racing";
  let phase: Phase = mode === "multiplayer" ? "wait" : "countdown";
  let countdown = demo ? 0 : 3.2;
  if (demo) phase = "racing";
  let raceT = 0, finishedCount = 0, shake = 0, resultShown = false, time = 0, camPull = 0;
  const camPos = new THREE.Vector3(0, 3, 8);
  let camInit = false, camRoll = 0, fovCur = 62;
  let remoteState: RealtimeState | null = null;
  let lastSend = 0;
  let sent = { steer: 0, brake: false, nitro: false };
  const pred = { init: false, lane: 0.5, speed: 5.4, dist: 0 };
  const NET_BASE = 5.4; // keep in sync with BASE_SPEED in server/src/room.ts
  const client = mode === "multiplayer" ? getSharedRealtimeClient() : null;
  const localId = options.player ?? "";

  const syncRemote = (s: RealtimeState) => {
    remoteState = s;
    for (const p of s.players) {
      let r = racers.find((q) => q.id === p.id);
      if (!r) {
        const i = racers.length;
        r = makeRacer(p.id, p.name, p.bikeId, p.riderId, p.id === localId, p.id !== localId, COLORS[i % COLORS.length]);
        r.x = (p.lane - 0.5) * ROAD_HALF * 2.3; r.dist = p.distance; r.lastDist = r.dist;
        racers.push(r);
        if (p.id === localId) player = r;
      }
    }
    if (!player && racers.length) player = racers[0];
    if (s.status === "countdown") { phase = "countdown"; countdown = (s.countdownMs ?? 3000) / 1000; }
    else if (s.status === "racing" && phase !== "racing") { phase = "racing"; raceT = 0; }
  };
  const unsub = client?.onState(syncRemote);
  if (client) {
    void client.connect().catch(() => popup("REALTIME OFFLINE", "#ff7b7b"));
  }

  // ---------- helpers ----------
  const poseRacer = (r: Racer, dt: number) => {
    const m = r.model;
    m.root.visible = r.active;
    if (!r.active) return;
    const rollT = clamp(-r.vx * 0.06, -0.55, 0.55) + (r.hit > 0 ? Math.sin(time * 40) * 0.08 * r.hit : 0);
    r.roll = damp(r.roll, rollT, 9, dt);
    r.steerAng = damp(r.steerAng, clamp(-r.vx * 0.035, -0.35, 0.35), 12, dt);
    const accelHint = r.boosting ? 0.07 : 0;
    r.pitch = damp(r.pitch, accelHint - (r.braking ? 0.04 : 0), 6, dt);
    // ground the bike on BOTH wheels: height = average under the two contact patches, pitch = slope between them
    const WB = 0.95; // half wheelbase (m)
    track.at(r.dist, r.x, 0, _w, _f);
    const hF = track.height(r.dist + WB), hR = track.height(r.dist - WB), slope = Math.atan2(hF - hR, WB * 2);
    m.root.position.set(_w.x, (hF + hR) / 2, _w.z);
    m.root.rotation.y = -_f.th - r.vx * 0.018; // heading of the road + a little yaw from lateral motion
    m.pivot.rotation.z = r.roll;
    m.pivot.rotation.x = r.pitch + slope;
    const blob = m.root.getObjectByName("blob");
    if (blob) { blob.rotation.x = -Math.PI / 2 + slope; blob.rotation.z = 0; (blob.position as THREE.Vector3).y = 0.035; (blob as THREE.Mesh).scale.x = 1.0 + Math.abs(r.roll) * 0.8; }
    const bob = Math.sin(time * (8 + r.v * 0.4)) * 0.004 * clamp(r.v / 30, 0, 1);
    m.pivot.position.y = bob + (r.boosting ? 0.02 : 0);
    const spin = (r.v / m.bike.wheelR) * dt;
    m.bike.frontWheel.rotation.x -= spin; m.bike.rearWheel.rotation.x -= spin;
    const focus = player ?? racers[0];
    if (r.human || !focus || Math.abs(r.dist - focus.dist) < 40 || (frameN + r.id.length) % 3 === 0) m.rider.update(r.steerAng, r.boosting ? 1 : 0);
    m.bike.brakeLight.emissiveIntensity = r.braking ? 3.2 : 0.45;
    const fm = m.bike.flame.material as THREE.MeshBasicMaterial;
    fm.opacity = r.boosting ? 0.75 + Math.random() * 0.25 : 0;
    m.bike.flame.scale.z = r.boosting ? 0.8 + Math.random() * 0.8 : 0.01;
  };

  const obstacles = () => {
    const list: { x: number; dist: number; v: number; w: number; l: number; self?: Racer }[] = [];
    for (const t of traffic) if (Math.abs(t.dist - (player?.dist ?? 0)) < 420) list.push({ x: t.x, dist: t.dist, v: t.v, w: t.w, l: t.l });
    for (const r of racers) list.push({ x: r.x, dist: r.dist, v: r.v, w: 0.8, l: 2, self: r });
    return list;
  };

  const driveCPU = (r: Racer, dt: number, obs: ReturnType<typeof obstacles>) => {
    r.laneTimer -= dt;
    let blocked = false, gap = 99, blockV = 0;
    for (const o of obs) {
      if (o.self === r) continue;
      const g = o.dist - r.dist - (o.l / 2 + 1.2);
      if (g > -0.5 && g < 20 + r.v * 0.45 && Math.abs(o.x - r.x) < o.w / 2 + 0.95 && g < gap) { blocked = true; gap = g; blockV = o.v; }
    }
    if (blocked && r.laneTimer <= 0) {
      let best = r.x, bestScore = -1e9;
      for (let l = 0; l < 5; l++) {
        const lx = laneX(l);
        let clear = 60;
        for (const o of obs) {
          if (o.self === r) continue;
          const dz = o.dist - r.dist;
          if (Math.abs(o.x - lx) < o.w / 2 + 1.0 && dz > -9 && dz < clear) clear = Math.max(dz, -9) < 0 ? 0 : dz;
        }
        const score = clear - Math.abs(lx - r.x) * 3 + rnd();
        if (score > bestScore) { bestScore = score; best = lx; }
      }
      r.laneT = best; r.laneTimer = 0.8 + rnd() * 0.9;
    } else if (!blocked && r.laneTimer <= 0 && rnd() < dt * 0.25) {
      r.laneT = clamp(r.x + (rnd() > 0.5 ? 1 : -1) * 2.4, -4.8, 4.8); r.laneTimer = 1.5 + rnd() * 2;
    }
    const steer = clamp((r.laneT - r.x) * 0.9 - r.vx * 0.22, -1, 1);
    const brake = blocked && gap < 7 && r.v > blockV * 1.02;
    if (!r.boosting && r.nitro > 0.6 && !blocked && rnd() < dt * 0.25) r.boosting = true;
    if (r.boosting && r.nitro <= 0.05) r.boosting = false;
    drive(r, dt, steer, brake);
  };

  const drive = (r: Racer, dt: number, steerCmd: number, brake: boolean) => {
    // boost: a boost pad gives a free burst (padT); nitro drains slower, refills faster and hits harder than before
    const padOn = r.padT > 0;
    if (padOn) { r.padT = Math.max(0, r.padT - dt); r.boosting = true; }
    const boost = r.boosting && (r.nitro > 0 || padOn);
    if (boost && !padOn) { r.nitro -= dt * 0.2; if (r.nitro <= 0) { r.nitro = 0; r.boosting = false; } }
    else if (!boost) r.nitro = Math.min(1, r.nitro + dt * 0.05);
    let vm = r.vmax * (boost ? 1.32 : 1);
    if (r.hit > 0) vm *= 0.6;
    if (r.finished) vm = markerMode && r.human ? 0 : 12;
    const acc = (4 + r.accel * 0.9) * (boost ? 2.4 : 1);
    let a = acc * Math.max(0, 1 - Math.pow(r.v / vm, 1.6));
    if (r.v > vm) a = -(r.v - vm) * 1.6;
    if (brake || r.finished) a = brake ? -26 : Math.min(a, markerMode && r.human ? -14 : -3);
    r.braking = brake;
    r.v = Math.max(0, r.v + a * dt);
    const grip = clamp(r.v / 10, 0, 1);
    const lat = (5.9 + r.handling * 0.42) * grip * (1 - 0.2 * (r.v / r.vmax));
    // the player's bike reacts almost instantly (high response rate + an initial kick when the direction changes)
    if (r.human && steerCmd !== 0 && Math.sign(r.vx) !== Math.sign(steerCmd)) r.vx += steerCmd * lat * 0.35;
    r.vx = damp(r.vx, steerCmd * lat, r.human ? 20 : 9, dt);
    r.x += r.vx * dt;
    if (Math.abs(r.x) > ROAD_LIMIT) { r.x = Math.sign(r.x) * ROAD_LIMIT; r.vx *= 0.2; if (r.human && r.v > 15) r.v *= 1 - dt * 0.8; }
    r.dist += r.v * dt;
    r.hit = Math.max(0, r.hit - dt); r.hitCool = Math.max(0, r.hitCool - dt);
  };

  const crash = (r: Racer, pushDir: number, v: number) => {
    if (r.hitCool > 0) return;
    r.hit = 1; r.hitCool = 1.1; r.v = Math.min(r.v, v * 0.7); r.vx += pushDir * 4; r.boosting = false; r.padT = 0;
    if (r.human) {
      shake = 1; r.mult = Math.max(1, r.mult * 0.6);
      flash.style.opacity = "1"; setTimeout(() => (flash.style.opacity = "0"), 120);
      popup("CRASH!", "#ff7b7b");
      audio.crash();
      mission?.onCrash();
    }
  };

  // ---------- camera rig ----------
  const updateCamera = (dt: number, target: Racer, w: number, h: number) => {
    // Chase cam in the style of mobile arcade racers: behind and above the bike, bike in the lower third,
    // far road + traffic ahead clearly visible, and it tracks sideways so the edge lanes stay framed.
    const portrait = w < h;
    const sp = clamp(target.v / (target.vmax * 1.2), 0, 1);
    const hero = phase === "countdown" ? clamp(countdown / 3.2, 0, 1) : 0;
    camPull = damp(camPull, target.boosting ? 1 : 0, 3, dt);
    const edge = ROAD_HALF - 1.0; // never let the camera slide off the tarmac
    const dx = clamp(target.x * 0.95, -edge, edge);
    const dy = (portrait ? 2.9 : 2.35) + sp * 0.25 + hero * 0.7 - (target.braking ? 0.1 : 0);
    const back = (portrait ? 7.0 : 5.9) + sp * 1.5 + camPull * 0.9 + hero * 2.8 + (target.braking ? 0.3 : 0);
    track.at(target.dist - back, dx, dy, _w, _f); // the camera hangs behind the bike ON the route (curves + flyovers)
    if (!camInit) { camPos.set(_w.x, _w.y, _w.z); camInit = true; }
    camPos.x = damp(camPos.x, _w.x, 9, dt);
    camPos.y = damp(camPos.y, _w.y, 7, dt);
    camPos.z = damp(camPos.z, _w.z, 9, dt);
    const sh = (0.004 + sp * 0.012 + camPull * 0.01 + shake * 0.12) * (target.v > 1 ? 1 : 0);
    camera.position.set(
      camPos.x + (Math.sin(time * 53) + Math.sin(time * 31.7)) * sh,
      camPos.y + (Math.sin(time * 47.3) + Math.cos(time * 29)) * sh,
      camPos.z
    );
    // look well down the road (not at the bike) so the bike sits low in frame and the road ahead is visible
    track.at(target.dist + (portrait ? 9 : 11) + sp * 8, clamp(target.x * 0.97, -edge, edge) * 0.9, portrait ? 2.0 : 1.4, _w2, _f);
    camera.lookAt(_w2.x, _w2.y, _w2.z);
    const bank = clamp(track.curvature(target.dist) * target.v * 0.4, -0.16, 0.16); // lean the view into corners
    camRoll = damp(camRoll, -target.vx * 0.008 + target.roll * 0.18 + bank, 5, dt);
    camera.rotateZ(camRoll);
    // vertical FOV: wide enough in portrait that the lanes beside the bike remain visible
    const baseFov = (portrait ? 72 : 47) + sp * 9 + camPull * 6;
    fovCur = damp(fovCur, baseFov, 5, dt);
    camera.fov = fovCur; camera.aspect = w / h; camera.updateProjectionMatrix();
    shake = Math.max(0, shake - dt * 2.2);
  };

  // ---------- resize ----------
  let W = 1, H = 1;
  const resize = () => {
    const r = container.getBoundingClientRect();
    W = Math.max(2, Math.floor(r.width)); H = Math.max(2, Math.floor(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // progress dots
  const dotEls = new Map<string, HTMLElement>();
  const ensureDot = (r: Racer) => {
    if (dotEls.has(r.id)) return;
    const d = document.createElement("i"); d.className = "rr-dot"; d.style.background = r.human ? "#ffd24d" : r.color;
    if (r.human) d.style.zIndex = "2";
    $("prog").appendChild(d); dotEls.set(r.id, d);
  };

  // ---------- main step ----------
  const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
  const step = (dt: number) => {
    time += dt; frameN++;
    const lead = player ?? racers[0];
    if (!lead) return;

    if (phase === "countdown") {
      const prev = Math.ceil(countdown);
      countdown -= dt;
      if (mode !== "multiplayer" && countdown <= 0) { phase = "racing"; raceT = 0; audio.go(); $("center").innerHTML = `<div class="rr-count">GO!</div>`; setTimeout(() => { $("center").innerHTML = ""; }, 700); }
      else if (Math.ceil(countdown) !== prev || !$("center").firstChild) {
        const n = Math.max(1, Math.ceil(countdown));
        if (!demo && n <= 3) audio.beep(n);
        if (!demo) $("center").innerHTML = `<div class="rr-count">${n > 3 ? 3 : n}</div>`;
      }
      if (mode === "multiplayer" && remoteState?.status === "racing") { phase = "racing"; $("center").innerHTML = `<div class="rr-count">GO!</div>`; setTimeout(() => { $("center").innerHTML = ""; }, 700); }
    } else if (phase === "racing") raceT += dt;
    if (phase === "wait") $("center").innerHTML = `<div class="rr-wait">CONNECTING…</div>`;
    else if (phase === "racing" && $("center").querySelector(".rr-wait")) $("center").innerHTML = "";

    const racing = phase === "racing";
    const obs = mode === "multiplayer" ? [] : obstacles();

    // traffic
    for (const t of traffic) {
      if (racing) t.dist += t.v * dt;
      const near = t.dist - lead.dist > -40 && t.dist - lead.dist < 300;
      if (near && !t.mesh) {
        t.mesh = acquireTraffic(t.kind, t.variant); t.mesh.rotation.order = "YXZ";
        if (!t.mesh.getObjectByName("blob")) { const b = blobShadow(t.w * 1.3, t.l * 1.12, 0.55); b.name = "blob"; b.position.y = 0.03; t.mesh.add(b); }
        scene.add(t.mesh);
      }
      if (!near && t.mesh) { scene.remove(t.mesh); releaseTraffic(t.kind, t.variant, t.mesh); t.mesh = null; }
      if (t.mesh) {
        const hb = t.l * 0.36;
        track.at(t.dist, t.x, 0, _w, _f);
        const hF = track.height(t.dist + hb), hR = track.height(t.dist - hb);
        t.mesh.position.set(_w.x, (hF + hR) / 2, _w.z); t.mesh.rotation.y = -_f.th; t.mesh.rotation.x = Math.atan2(hF - hR, hb * 2);
      }
    }

    for (const r of racers) {
      if (r.remote || (mode === "multiplayer" && r !== lead)) {
        const p = remoteState?.players.find((q) => q.id === r.id);
        if (p) {
          const tx = (p.lane - 0.5) * ROAD_HALF * 2.3;
          const nd = damp(r.dist, p.distance, 8, dt);
          r.v = Math.max(0, (nd - r.dist) / Math.max(dt, 1e-3)); r.dist = nd;
          const px = r.x; r.x = damp(r.x, tx, 8, dt); r.vx = (r.x - px) / Math.max(dt, 1e-3);
          r.mult = p.multiplier; r.finished = p.finishPosition !== null; r.place = p.finishPosition ?? 0;
        }
        continue;
      }
      if (mode === "multiplayer") {
        const p = remoteState?.players.find((q) => q.id === r.id);
        if (p) {
          const age = Math.min(0.3, Math.max(0, (performance.now() - (remoteState?.at ?? performance.now())) / 1000));
          const px = r.x;
          if (r.human && racing && p.finishPosition === null) {
            // CLIENT-SIDE PREDICTION: run the same simple model as the server locally, so steering/braking respond
            // instantly instead of after a network round trip; then reconcile gently with the authoritative state.
            const rtt = (client?.getRtt() ?? 0) / 1000;
            if (!pred.init) { pred.init = true; pred.lane = p.lane; pred.speed = p.speed; pred.dist = p.distance; }
            const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
            pred.speed += ((input.brake ? NET_BASE * 0.56 : NET_BASE) - pred.speed) * Math.min(1, dt * 5);
            pred.lane = clamp(pred.lane + steer * dt * 0.9, 0.17, 0.83);
            pred.dist = Math.min(GOAL, pred.dist + pred.speed * dt * 9);
            const sd = p.distance + p.speed * 9 * (age + rtt / 2); // server state extrapolated to "now"
            const e = sd - pred.dist;
            if (Math.abs(e) > 25) pred.dist = sd; else pred.dist += e * Math.min(1, dt * 4);
            const le = p.lane - pred.lane; // server lane lags our steering by ~RTT: only correct real drift
            pred.lane += le * Math.min(1, dt * (Math.abs(le) > 0.12 ? 6 : 0.6));
            pred.speed += (p.speed - pred.speed) * Math.min(1, dt * 1.5);
            r.dist = pred.dist; r.v = pred.speed * 9;
            r.x = damp(r.x, (pred.lane - 0.5) * ROAD_HALF * 2.3, 24, dt);
          } else {
            // other riders: dead-reckon from the last update (position + speed * age) and smooth, so 20 Hz updates look fluid
            const tx = (p.lane - 0.5) * ROAD_HALF * 2.3;
            r.dist = damp(r.dist, Math.min(GOAL, p.distance + p.speed * 9 * age), 14, dt);
            r.v = p.speed * 9;
            r.x = damp(r.x, tx, 12, dt);
            if (r.human) pred.init = false;
          }
          r.vx = (r.x - px) / Math.max(dt, 1e-3);
          r.mult = p.multiplier; r.finished = p.finishPosition !== null; r.place = p.finishPosition ?? 0;
          r.boosting = input.nitro; r.braking = input.brake;
        }
        continue;
      }
      if (!racing) { r.v = 0; r.braking = false; r.boosting = false; continue; }
      if (r.human) {
        // steering axis: jumps to 55% the moment a side is touched (instant response), then ramps to full lock;
        // letting go recentres quickly, so short taps make small lane corrections
        const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (want === 0) steerAxis = damp(steerAxis, 0, 18, dt);
        else {
          if (Math.sign(steerAxis) !== want) steerAxis = want * 0.55;
          steerAxis = clamp(steerAxis + want * dt * 5.5, -1, 1);
        }
        const steer = Math.abs(steerAxis) < 0.02 ? 0 : steerAxis;
        if (input.nitro && r.nitro > 0.04 && !r.finished) r.boosting = true; else if (!input.nitro && r.padT <= 0) r.boosting = false;
        drive(r, dt, r.finished || missionOver ? clamp(-r.x * 0.5, -1, 1) : steer, (input.brake && !r.finished) || missionOver);
      } else if (r.scripted) { /* driven by the mission rules */ } else driveCPU(r, dt, obs);

      // marker missions: start braking early enough that the bike rolls to a stop inside the ring (brake decel is 26 m/s²)
      const arriveAt = markerMode && r.human ? GOAL - r.v * r.v / 52 + 2 : GOAL;
      if (!r.finished && !r.scripted && r.dist >= arriveAt) {
        r.finished = true; r.place = ++finishedCount; r.finishT = raceT; r.boosting = false; r.padT = 0;
        if (r.human) { if (mission) mission.onFinish(raceT); else audio.finish(); }
      }
    }
    if (mission && player) { mission.tick(dt, raceT, racing && !player.finished && !missionOver); gateTick?.(); }
    // demo: the "player" is driven by the CPU brain
    if (demo && player && racing) {
      /* handled via human=false => driveCPU above */
    }

    if (mode !== "multiplayer") {
      // collisions & scoring
      for (const r of racers) {
        if (r.scripted) continue;
        for (const t of traffic) {
          const dz = t.dist - r.dist;
          if (Math.abs(dz) > t.l / 2 + 2.5) continue;
          const dx = r.x - t.x;
          const tooClose = r.dist + 1.0 > t.dist - t.l / 2 && r.dist - 1.0 < t.dist + t.l / 2 && Math.abs(dx) < t.w / 2 + 0.38;
          if (r.human) t.minDx = Math.min(t.minDx, Math.abs(dx) - t.w / 2);
          if (tooClose) {
            if (r.dist < t.dist) r.dist = Math.min(r.dist, t.dist - t.l / 2 - 1.0);
            crash(r, dx >= 0 ? 1 : -1, t.v);
            if (r.human) t.hitFlag = true;
          }
        }
        for (const o of racers) {
          if (o === r || o.scripted) continue;
          const dz = o.dist - r.dist, dx = r.x - o.x;
          if (Math.abs(dz) < 1.9 && Math.abs(dx) < 0.85) { const push = (dx >= 0 ? 1 : -1) * 3.2 * dt; r.x += push; r.vx += push * 2; }
        }
        for (const p of pickups) {
          if (p.taken) continue;
          if (Math.abs(p.dist - r.dist) < 1.6 && Math.abs(p.x - r.x) < 1.3) {
            p.taken = true; p.mesh.visible = false; r.nitro = Math.min(1, r.nitro + 0.5);
            if (r.human) { popup("+NITRO", "#8fc2ff"); audio.pickup(); }
          }
        }
        r.padCool = Math.max(0, r.padCool - dt);
        for (const pd of world.pads) {
          if (r.padCool > 0) break;
          if (Math.abs(pd.dist - r.dist) < 2.8 && Math.abs(pd.x - r.x) < 1.25) {
            r.padT = 1.7; r.padCool = 1.0; r.nitro = Math.min(1, r.nitro + 0.15);
            if (r.human) { popup("BOOST PAD!", "#ffd24d"); audio.pad(); shake = Math.max(shake, 0.3); }
          }
        }
      }
      if (player?.human) {
        for (const t of traffic) {
          if (!t.passed && player.dist > t.dist + t.l / 2 + 1) {
            t.passed = true;
            if (!t.hitFlag && t.minDx < 1.0) {
              player.mult += 0.05; player.nitro = Math.min(1, player.nitro + 0.1); popup("CLOSE CALL +0.05×", "#7dffb2");
              audio.closeCall(); if (t.kind === "danfo") audio.voice();
            }
          }
        }
        for (const o of racers) {
          if (o === player) continue;
          const ahead = o.dist > player.dist;
          if (o.ahead && !ahead && racing) { player.mult += 0.03; player.nitro = Math.min(1, player.nitro + 0.05); popup("OVERTAKE +0.03×", "#ffd24d"); audio.overtake(); }
          o.ahead = ahead;
        }
        // traffic honks when you tailgate it; slipstream behind traffic refills nitro
        let drafting = false;
        for (const t of traffic) {
          t.hornCool = Math.max(0, t.hornCool - dt);
          const dz = t.dist - player.dist, adx = Math.abs(t.x - player.x);
          if (!racing || dz < 3 || dz > 22 || adx > 1.4) continue;
          if (dz < 16 && adx < 1.1 && player.v > player.vmax * 0.55) drafting = true;
          if (t.hornCool <= 0 && player.v > t.v + 1 && rnd() < dt * 0.8) { audio.horn(t.kind, clamp((t.x - player.x) / 5, -1, 1), 0.9); t.hornCool = 3 + rnd() * 3; }
        }
        if (drafting) {
          player.nitro = Math.min(1, player.nitro + dt * 0.08); draftT += dt;
          if (draftT > 1.4) { popup("SLIPSTREAM +NITRO", "#8fc2ff"); draftT = -3; }
        } else draftT = Math.max(0, draftT - dt);
        player.bestMult = Math.max(player.bestMult, player.mult);
      }
    }
    for (const p of pickups) if (!p.taken) { p.mesh.rotation.y += dt * 2.4; p.mesh.position.y = p.y0 + Math.sin(time * 3 + p.dist) * 0.12; }

    // standings
    const order = racers.filter((r) => !r.scripted).sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.dist - a.dist));
    const myPlace = player ? order.indexOf(player) + 1 : 1;

    // poses + camera
    for (const r of racers) poseRacer(r, dt);
    track.at(lead.dist, lead.x, 0, _w, _f);
    world.followPlayer(_w.x, _w.z);
    weather.update(dt, camera.position);
    world.sky.position.copy(camera.position);
    updateCamera(dt, lead, W, H);
    if (marker && player) {
      marker.update(dt, time, player.dist);
      const wp = hud.querySelector(".rr-wp") as HTMLElement;
      const rem = Math.max(0, GOAL - player.dist);
      if (!missionOver && !player.finished) {
        _wp.copy(marker.pos).project(camera);
        const vis = _wp.z < 1 && Math.abs(_wp.x) < 1.15;
        wp.style.display = vis ? "block" : "none";
        if (vis) {
          const sx = clamp(_wp.x, -0.85, 0.85), sy = clamp(_wp.y, -0.3, 0.8);
          wp.style.left = `${(sx * 0.5 + 0.5) * 100}%`; wp.style.top = `${(0.5 - sy * 0.5) * 100}%`;
          (wp.querySelector("b") as HTMLElement).textContent = `${rem >= 1000 ? (rem / 1000).toFixed(1) + " KM" : Math.round(rem / 5) * 5 + " M"}`;
          (wp.querySelector("small") as HTMLElement).textContent = M?.goalText ?? "";
        }
      } else wp.style.display = "none";
    }

    // audio
    if (!demo) { audio.update(lead.v / lead.vmax, lead.boosting, phase === "racing"); if (frameN % 45 === 0) audio.setRain(weather.rainLevel); }
    world.tick(dt, time);

    // HUD
    if (!demo) {
      $("time").textContent = fmt(raceT);
      $("pos").textContent = String(myPlace);
      $("total").textContent = String(order.length);
      $("speed").textContent = String(Math.round(lead.v * 3.6));
      $("mult").textContent = `${(player?.mult ?? 1).toFixed(2)}×`;
      ($("nitro") as HTMLElement).style.width = `${Math.round((player?.nitro ?? 0) * 100)}%`;
      boostFx.style.opacity = lead.boosting ? "1" : "0";
      linesFx.style.opacity = lead.boosting ? "1" : "0";
      if (client && frameN % 30 === 0) {
        const ms = Math.round(client.getRtt());
        pingEl.textContent = ms ? `PING ${ms}ms` : "";
        pingEl.style.color = ms < 90 ? "#7dffb2" : ms < 180 ? "#ffd24d" : "#ff7b7b";
      }
      for (const r of racers) { ensureDot(r); dotEls.get(r.id)!.style.left = `${clamp(r.dist / GOAL, 0, 1) * 100}%`; }
      if (!M && player && player.finished && !resultShown && (mode === "multiplayer" || raceT - player.finishT > 1.2)) {
        resultShown = true;
        const score = Math.round(10000 * player.bestMult / Math.max(1, player.place));
        const res = document.createElement("div");
        res.className = "rr-result";
        res.innerHTML = `<div class="rr-card"><h2>${ordinal(player.place)} PLACE</h2>
          <p>TIME ${fmt(player.finishT || raceT)}</p><p>BEST MULTIPLIER ${player.bestMult.toFixed(2)}×</p><p>SCORE ${score.toLocaleString()}</p>
          <button data-a="again">RACE AGAIN</button><a class="alt" href="/garage">GARAGE</a><a class="alt" href="/">HOME</a></div>`;
        res.querySelector("[data-a=again]")!.addEventListener("click", () => window.location.reload());
        hud.appendChild(res);
      }
    }
    if (popTimer > 0) popTimer -= dt;

    // multiplayer input
    if (client && player && remoteState) {
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const changed = steer !== sent.steer || input.brake !== sent.brake || input.nitro !== sent.nitro;
      // only talk when something changed (plus a slow heartbeat): far less upstream traffic on mobile data
      if ((changed && time - lastSend > 0.03) || time - lastSend > 0.4) {
        lastSend = time; sent = { steer, brake: input.brake, nitro: input.nitro };
        try {
          client.sendInput(remoteState.roomId, localId, { steering: steer, braking: input.brake, useItem: input.nitro });
        } catch { /* socket closed */ }
      }
    }
  };

  // ---------- loop ----------
  let last = performance.now(), first = true;
  const loop = () => {
    if (disposed) return;
    const now = performance.now();
    const raw = (now - last) / 1000;
    if (Q.fpsCap && raw < 1 / Q.fpsCap - 0.004) return; // weak devices: steady 30 fps beats a stuttery 45
    last = now;
    const dt = Math.min(0.05, raw);
    const np = dyn.sample(raw);
    if (np !== null) { renderer.setPixelRatio(np); renderer.setSize(W, H, false); }
    const sub = (window as unknown as { __RR_SUB?: number }).__RR_SUB ?? 1;
    for (let i = 0; i < sub; i++) step(dt);
    renderer.render(scene, camera);
    if (first) { first = false; resolveReady(); }
  };
  // ---------- STORY MISSION: objective rules, radio comms, result card ----------
  if (M && player) {
    const panel = hud.querySelector(".rr-mis") as HTMLElement; panel.style.display = "block";
    const gEl = panel.querySelector(".g") as HTMLElement, tmEl = panel.querySelector(".tm") as HTMLElement, bagEl = panel.querySelector(".bag") as HTMLElement;
    const bc = panel.querySelector(".bc") as HTMLElement, bf = panel.querySelector(".bf") as HTMLElement;
    const capEl = hud.querySelector(".rr-cap") as HTMLElement, resEl = hud.querySelector(".rr-mres") as HTMLElement;
    let capTimer = 0;
    const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const showResult = (res: MissionResult) => {
      const attempt = options.attempt ?? 1;
      const canSkip = !res.ok && !!M.skipAfter && attempt >= M.skipAfter;
      const done = (extra: Partial<MissionOutcome>) => options.onMissionEnd?.({ ...res, reward: res.ok ? M.reward : 0, time: raceT, ...extra });
      resEl.style.display = "flex";
      resEl.innerHTML = `<h2 style="color:${res.ok ? "#7dffb2" : "#ff7b7b"}">${res.ok ? (M.objective === "race" ? "RACE WON" : "MISSION COMPLETE") : "MISSION FAILED"}</h2><p>${res.reason}</p>${res.ok && M.reward ? `<div class="rw">+₦${M.reward.toLocaleString()}</div>` : ""}<div></div>`;
      const row = resEl.lastElementChild as HTMLElement;
      const add = (label: string, cls: string, fn: () => void) => { const b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.addEventListener("click", fn); row.appendChild(b); };
      if (res.ok) add("CONTINUE ▸", "", () => done({}));
      else { add("RETRY", "", () => done({ retry: true })); if (canSkip) add("SKIP MISSION", "alt", () => done({ skipped: true, ok: true })); }
    };
    const host: Host = {
      player, goal: GOAL,
      place: () => player!.place || 1,
      popup: (t, c) => popup(t, c ?? "#fff"),
      caption: (who, text, ms, alt) => {
        const sp = SPEAKERS[who] ?? { name: who.toUpperCase(), color: "#fff" };
        const fl = flavor(who, text, langMode, alt, who !== "aboki");
        capEl.textContent = "";
        const nameEl = document.createElement("b"); nameEl.style.color = sp.color; nameEl.textContent = sp.name;
        capEl.append(nameEl, document.createTextNode(fl.text));
        if (fl.gloss) { const g = document.createElement("i"); g.className = "gl"; g.textContent = fl.gloss; capEl.appendChild(g); }
        capEl.classList.add("on");
        window.clearTimeout(capTimer); capTimer = window.setTimeout(() => capEl.classList.remove("on"), ms + (fl.gloss ? 600 : 0));
        voices.speak(who, fl.say, { radio: who !== "aboki", shown: fl.text });
      },
      sfx: (n) => {
        if (n === "start") audio.missionStart(); else if (n === "warn") audio.warnTick(false); else if (n === "urgent") audio.warnTick(true);
        else if (n === "bag") audio.bagHit(); else if (n === "ally") audio.allyJoin(); else if (n === "caught") audio.caught(); else if (n === "block") audio.roadblock(); else audio.objective();
      },
      music: (m) => audio.setMusicMode(m),
      siren: (on) => audio.siren(on),
      setEnv: (e) => { weather.set(e); (hud.querySelector(".rr-env") as HTMLElement).textContent = `${envLabel(e)} · ${map.name.toUpperCase()}`; (hud.querySelector(".rr-drops") as HTMLElement).style.opacity = weather.rainLevel > 0 ? "0.8" : "0"; audio.setRain(weather.rainLevel); },
      hud: (h) => {
        gEl.textContent = h.goal;
        tmEl.style.display = h.time === undefined ? "none" : "inline"; if (h.time !== undefined) { tmEl.textContent = `⏱ ${fmtT(Math.max(0, h.time))}`; tmEl.classList.toggle("low", h.time < 12); }
        bagEl.style.display = h.integrity === undefined ? "none" : "inline"; if (h.integrity !== undefined) bagEl.textContent = `📦 ${Math.round(h.integrity)}%`;
        bc.style.display = h.caught === undefined ? "none" : "block"; if (h.caught !== undefined) (bc.firstElementChild as HTMLElement).style.width = `${Math.min(100, h.caught)}%`;
        bf.style.display = h.follow === undefined ? "none" : "block"; if (h.follow !== undefined) (bf.firstElementChild as HTMLElement).style.width = `${Math.round(h.follow * 100)}%`;
      },
      end: (res) => {
        if (missionOver) return;
        missionOver = true; audio.siren(false);
        if (res.ok) audio.missionWin(); else audio.missionFail();
        if (res.ok && markerMode) {
          // GTA style: arrive, the screen fades, the cutscene takes over (no result card)
          popup(`ARRIVED${M.reward ? `  +₦${M.reward.toLocaleString()}` : ""}`, "#ffd24d");
          const fade = hud.querySelector(".rr-fade") as HTMLElement;
          window.setTimeout(() => { fade.style.opacity = "1"; }, 1100);
          window.setTimeout(() => options.onMissionEnd?.({ ...res, reward: M.reward, time: raceT }), 2100);
        } else window.setTimeout(() => showResult(res), res.ok ? 700 : 900);
      },
      nudge: (vx, mul) => { player!.vx += vx * 0.35; player!.v *= mul; }
    };
    mission = new Mission(M, host, rivalRacers.map((r, i) => ({ id: `rv${i}`, r })));
    if (M.noCountdown) { phase = "racing"; countdown = 0; }
    if (M.minimalHud) hud.classList.add("min");
    host.hud({ goal: M.goalText, time: M.timeLimit, integrity: M.integrity ? 100 : undefined });
    // shortcut gates
    const gateCheck = () => { for (const g of gates) if (!g.taken && player && Math.abs(g.dist - player.dist) < 3.5 && Math.abs(player.x) < 3.9) { g.taken = true; g.mesh.visible = false; mission?.onShortcut(g.label); } };
    gateTick = gateCheck;
  }

  // pre-build the traffic the first seconds will need and compile every shader now, so nothing hitches mid-race
  {
    const seenK = new Set<string>();
    for (const t of traffic) {
      if (t.dist > 800) break;
      const k = poolKey(t.kind, t.variant);
      if (seenK.has(k)) continue;
      seenK.add(k); releaseTraffic(t.kind, t.variant, buildTraffic(t.kind, t.variant));
    }
    const tmp: THREE.Object3D[] = [];
    for (const arr of trafficPool.values()) for (const m of arr) { scene.add(m); tmp.push(m); }
    try { renderer.compile(scene, camera); } catch { /* older drivers: compile lazily */ }
    for (const m of tmp) scene.remove(m);
  }
  renderer.setAnimationLoop(loop);

  const destroy = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    unsub?.();
    ro.disconnect();
    window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
    window.removeEventListener("pointerdown", unlockAudio); window.removeEventListener("keydown", unlockAudio);
    voices.stop();
    audio.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh || (o as THREE.InstancedMesh).isInstancedMesh) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
          const mm = x as THREE.MeshStandardMaterial;
          mm?.map?.dispose(); x?.dispose();
        });
      }
    });
    weather.dispose();
    for (const arr of trafficPool.values()) for (const m of arr) disposeTree(m);
    envTex.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss(); // browsers cap live WebGL contexts; free ours immediately
    renderer.domElement.remove(); hud.remove(); style.remove();
  };

  return { destroy, ready };
}
