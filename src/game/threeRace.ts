import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BIKES, RIDERS, getBike, getDifficulty, getRider } from "./loadout";
import { buildRacer, disposeTree, type Racer3D } from "./models/racer";
import { buildTraffic, TRAFFIC_SIZE, type TrafficKind } from "./models/traffic";
import { mulberry32 } from "./models/util";
import { getSharedRealtimeClient, type RealtimeState } from "./multiplayer";
import { buildWorld, GOAL, ROAD_HALF, laneX } from "./world";
import { GameAudio } from "./audio";
import { DynamicRes, qualityFor, resolveTier, setGfxSetting, type GfxSetting } from "./quality";

export type RaceMode = "solo" | "multiplayer" | "demo";
export type RaceOptions = { mode: RaceMode; room?: string; player?: string };

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
};

type TrafficCar = {
  kind: TrafficKind; x: number; dist: number; v: number; w: number; l: number;
  mesh: THREE.Group | null; variant: number; passed: boolean; minDx: number; hitFlag: boolean; hornCool: number;
};

type Pickup = { x: number; dist: number; taken: boolean; mesh: THREE.Group };

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
.rr-ctl{position:absolute;left:0;right:0;bottom:calc(52px + env(safe-area-inset-bottom));display:none;justify-content:space-between;padding:0 14px;pointer-events:none}
.rr-ctl.touch{display:flex}
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
.rr-ping{position:absolute;right:12px;top:calc(max(10px,env(safe-area-inset-top)) + 78px);font:700 11px/1 system-ui,sans-serif;letter-spacing:.05em;color:#7dffb2;text-shadow:0 1px 2px #000;pointer-events:none}
.rr-lines{position:absolute;inset:0;opacity:0;transition:opacity .2s;pointer-events:none;background:repeating-conic-gradient(from 0deg at 50% 60%,rgba(255,255,255,0) 0deg 5deg,rgba(255,255,255,.16) 5deg 5.8deg);-webkit-mask:radial-gradient(circle at 50% 60%,transparent 26%,#000 72%);mask:radial-gradient(circle at 50% 60%,transparent 26%,#000 72%);animation:rrspin 1.1s linear infinite}
@keyframes rrspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.rr-gfx{left:62px;font-size:11px;letter-spacing:.04em;width:auto;padding:0 10px;border-radius:21px}
.rr-mute{position:absolute;left:12px;top:calc(max(10px,env(safe-area-inset-top)) + 78px);pointer-events:auto;width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,14,18,.6);color:#fff;font-size:18px;display:grid;place-items:center}
`;

const ordinal = (n: number) => `${n}${["TH", "ST", "ND", "RD"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "TH"}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function createThreeRace(container: HTMLElement, options: RaceOptions) {
  const mode = options.mode;
  const demo = mode === "demo";
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
  const world = buildWorld(scene, { crowd: Q.crowd, shadows: Q.shadows, shadowSize: Q.shadowSize });

  // ---------- HUD ----------
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const hud = document.createElement("div");
  hud.className = "rr-hud";
  hud.style.display = demo ? "none" : "block";
  hud.innerHTML = `
    <div class="rr-flash"></div><div class="rr-boost"></div><div class="rr-lines"></div>
    <div class="rr-ping"></div>
    <button class="rr-mute" data-k="mute" aria-label="sound">🔊</button>
    <button class="rr-mute rr-gfx" data-k="gfx" aria-label="graphics quality">GFX</button>
    <div class="rr-top">
      <div class="rr-chip"><small>TIME</small><b data-k="time">0:00.0</b></div>
      <div class="rr-chip rr-pos"><small>POSITION</small><b data-k="pos">1</b>/<span data-k="total">8</span></div>
      <div class="rr-chip rr-speed"><small>KM/H</small><b data-k="speed">0</b></div>
    </div>
    <div class="rr-prog" data-k="prog"></div>
    <div class="rr-mult" data-k="mult">1.00×</div>
    <div class="rr-pop" data-k="pop"></div>
    <div class="rr-center" data-k="center"></div>
    <div class="rr-ctl" data-k="ctl">
      <div class="rr-pair"><button class="rr-btn" data-b="left">◀</button><button class="rr-btn" data-b="right">▶</button></div>
      <button class="rr-btn nitro" data-b="nitro">NITRO</button>
    </div>
    <div class="rr-hint" data-k="hint">← → STEER · SPACE NITRO · ↓ BRAKE</div>
    <div class="rr-nitro">NITRO<div class="rr-bar"><i data-k="nitro"></i></div></div>`;
  container.appendChild(hud);
  const $ = (k: string) => hud.querySelector(`[data-k="${k}"]`) as HTMLElement;
  const btn = (b: string) => hud.querySelector(`[data-b="${b}"]`) as HTMLElement;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch) { $("ctl").classList.add("touch"); $("hint").style.display = "none"; }
  const flash = hud.querySelector(".rr-flash") as HTMLElement;
  const boostFx = hud.querySelector(".rr-boost") as HTMLElement;
  const linesFx = hud.querySelector(".rr-lines") as HTMLElement;
  const pingEl = hud.querySelector(".rr-ping") as HTMLElement;

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
    const set = (v: boolean) => (e: Event) => { e.preventDefault(); input[key] = v; el.classList.toggle("on", v); if (v) startAudio(); };
    el.addEventListener("pointerdown", set(true)); el.addEventListener("pointerup", set(false));
    el.addEventListener("pointercancel", set(false)); el.addEventListener("pointerleave", set(false));
  };
  bindBtn("left", "left"); bindBtn("right", "right"); bindBtn("nitro", "nitro");
  // drag-to-steer on the canvas (touch): left/right of the touch start point
  let dragId = -1, dragX = 0;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { if (demo || e.pointerType === "mouse") return; dragId = e.pointerId; dragX = e.clientX; startAudio(); });
  cv.addEventListener("pointermove", (e) => {
    if (e.pointerId !== dragId) return;
    const dx = e.clientX - dragX;
    input.left = dx < -12; input.right = dx > 12;
  });
  const endDrag = (e: PointerEvent) => { if (e.pointerId === dragId) { dragId = -1; input.left = input.right = false; } };
  cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);

  // ---------- audio (Afrobeats groove, engine, horns, Lagos ambience; see audio.ts) ----------
  const audio = new GameAudio();
  function startAudio() { if (!demo) audio.start(); }
  const unlockAudio = () => startAudio();
  window.addEventListener("pointerdown", unlockAudio); window.addEventListener("keydown", unlockAudio);
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
    const model = buildRacer(def.id, getRider(riderId).id);
    model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    scene.add(model.root);
    return {
      id, name, human, remote, model, x: 0, dist: 0, v: 0, vx: 0,
      vmax: def.topSpeed / 3.6, accel: def.acceleration, handling: def.handling,
      nitro: 0.6, boosting: false, skill: human ? 1 : 0.9 + rnd() * 0.1,
      laneT: 0, laneTimer: rnd() * 2, hit: 0, hitCool: 0, finished: false, place: 0, finishT: 0,
      roll: 0, steerAng: 0, pitch: 0, mult: 1, bestMult: 1, braking: false, ahead: false, color, lastDist: 0, padT: 0, padCool: 0
    };
  };

  const slot = (i: number) => {
    const cols = [-3.6, -1.2, 1.2, 3.6];
    return { x: cols[i % 4], dist: -(Math.floor(i / 4) * 6) - (i % 2) * 2.5 };
  };

  let player: Racer | null = null;
  if (mode !== "multiplayer") {
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
    for (let d = 150; d < GOAL - 120; d += 55 + rnd() * 60) {
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      const size = TRAFFIC_SIZE[kind];
      const speedBase = { danfo: 13, sedan: 15, keke: 9, suv: 15, truck: 10.5 }[kind];
      traffic.push({ kind, x: laneX(Math.floor(rnd() * 5)), dist: d, v: speedBase + rnd() * 3, w: size.w, l: size.l, mesh: null, variant: Math.floor(rnd() * 5), passed: false, minDx: 99, hitFlag: false, hornCool: 0 });
    }
    const padGeo = new THREE.TorusGeometry(0.55, 0.1, 12, 28);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x59a8ff, emissive: 0x2a7bff, emissiveIntensity: 2.2, roughness: 0.3 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xb7d6ff, emissiveIntensity: 2.5 });
    for (let d = 190; d < GOAL - 80; d += 140 + rnd() * 120) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(padGeo, padMat), new THREE.Mesh(new THREE.OctahedronGeometry(0.28), coreMat));
      const x = laneX(Math.floor(rnd() * 5));
      g.position.set(x, 1.0, -d); scene.add(g);
      pickups.push({ x, dist: d, taken: false, mesh: g });
    }
  }

  let draftT = 0, frameN = 0;

  // traffic cars are pooled (no geometry / material churn while racing)
  const trafficPool = new Map<string, THREE.Group[]>();
  const poolKey = (kind: TrafficKind, variant: number) => `${kind}:${variant % 5}`;
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
    const rollT = clamp(-r.vx * 0.06, -0.55, 0.55) + (r.hit > 0 ? Math.sin(time * 40) * 0.08 * r.hit : 0);
    r.roll = damp(r.roll, rollT, 9, dt);
    r.steerAng = damp(r.steerAng, clamp(-r.vx * 0.035, -0.35, 0.35), 12, dt);
    const accelHint = r.boosting ? 0.07 : 0;
    r.pitch = damp(r.pitch, accelHint - (r.braking ? 0.04 : 0), 6, dt);
    m.root.position.set(r.x, 0, -r.dist);
    m.root.rotation.y = -r.vx * 0.018;
    m.pivot.rotation.z = r.roll;
    m.pivot.rotation.x = r.pitch;
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
    if (r.finished) vm = 12;
    const acc = (4 + r.accel * 0.9) * (boost ? 2.4 : 1);
    let a = acc * Math.max(0, 1 - Math.pow(r.v / vm, 1.6));
    if (r.v > vm) a = -(r.v - vm) * 1.6;
    if (brake || r.finished) a = brake ? -26 : Math.min(a, -3);
    r.braking = brake;
    r.v = Math.max(0, r.v + a * dt);
    const grip = clamp(r.v / 10, 0, 1);
    const lat = (5.2 + r.handling * 0.38) * grip * (1 - 0.22 * (r.v / r.vmax));
    r.vx = damp(r.vx, steerCmd * lat, 9, dt);
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
    const dz = -target.dist + back;
    if (!camInit) { camPos.set(dx, dy, dz); camInit = true; }
    camPos.x = damp(camPos.x, dx, 6.5, dt);
    camPos.y = damp(camPos.y, dy, 6, dt);
    camPos.z = damp(camPos.z, dz, 9, dt);
    const sh = (0.004 + sp * 0.012 + camPull * 0.01 + shake * 0.12) * (target.v > 1 ? 1 : 0);
    camera.position.set(
      camPos.x + (Math.sin(time * 53) + Math.sin(time * 31.7)) * sh,
      camPos.y + (Math.sin(time * 47.3) + Math.cos(time * 29)) * sh,
      camPos.z
    );
    // look well down the road (not at the bike) so the bike sits low in frame and the road ahead is visible
    const look = new THREE.Vector3(clamp(target.x * 0.97, -edge, edge) * 0.9, portrait ? 2.0 : 1.4, -target.dist - (portrait ? 9 : 11) - sp * 8);
    camera.lookAt(look);
    camRoll = damp(camRoll, -target.vx * 0.008 + target.roll * 0.18, 5, dt);
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
      if (near && !t.mesh) { t.mesh = acquireTraffic(t.kind, t.variant); scene.add(t.mesh); }
      if (!near && t.mesh) { scene.remove(t.mesh); releaseTraffic(t.kind, t.variant, t.mesh); t.mesh = null; }
      if (t.mesh) t.mesh.position.set(t.x, 0, -t.dist);
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
        const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (input.nitro && r.nitro > 0.04 && !r.finished) r.boosting = true; else if (!input.nitro && r.padT <= 0) r.boosting = false;
        drive(r, dt, r.finished ? clamp(-r.x * 0.5, -1, 1) : steer, input.brake && !r.finished);
      } else driveCPU(r, dt, obs);

      if (!r.finished && r.dist >= GOAL) {
        r.finished = true; r.place = ++finishedCount; r.finishT = raceT; r.boosting = false; r.padT = 0;
        if (r.human) audio.finish();
      }
    }
    // demo: the "player" is driven by the CPU brain
    if (demo && player && racing) {
      /* handled via human=false => driveCPU above */
    }

    if (mode !== "multiplayer") {
      // collisions & scoring
      for (const r of racers) {
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
          if (o === r) continue;
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
    for (const p of pickups) if (!p.taken) { p.mesh.rotation.y += dt * 2.4; p.mesh.position.y = 1.0 + Math.sin(time * 3 + p.dist) * 0.12; }

    // standings
    const order = [...racers].sort((a, b) => (a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.dist - a.dist));
    const myPlace = player ? order.indexOf(player) + 1 : 1;

    // poses + camera
    for (const r of racers) poseRacer(r, dt);
    world.followPlayer(lead.x, -lead.dist);
    world.sky.position.copy(camera.position);
    updateCamera(dt, lead, W, H);

    // audio
    if (!demo) audio.update(lead.v / lead.vmax, lead.boosting, phase === "racing");
    world.tick(dt, time);

    // HUD
    if (!demo) {
      $("time").textContent = fmt(raceT);
      $("pos").textContent = String(myPlace);
      $("total").textContent = String(racers.length);
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
      if (player && player.finished && !resultShown && (mode === "multiplayer" || raceT - player.finishT > 1.2)) {
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
    for (const arr of trafficPool.values()) for (const m of arr) disposeTree(m);
    envTex.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss(); // browsers cap live WebGL contexts; free ours immediately
    renderer.domElement.remove(); hud.remove(); style.remove();
  };

  return { destroy, ready };
}
