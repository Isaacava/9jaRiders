import * as THREE from "three";
import { Character } from "../models/character";
import { buildRacer, disposeTree, type Racer3D } from "../models/racer";
import { lightingFor, makeSky, Rain } from "../weather";
import type { GameAudio } from "../audio";
import { VoiceBox } from "../voice";
import { flavor, getLangMode } from "./lang";
import { buildStage, type Stage } from "./stages";
import { SPEAKERS, type Act, type Cast, type CamSpec, type Cutscene, type Line, type Shot } from "./types";

type Actor = {
  id: string; char: Character | null; bike: Racer3D | null; group: THREE.Group;
  walk?: { to: THREE.Vector3; speed: number; after: Cast["pose"] };
  ride?: { from: THREE.Vector3; to: THREE.Vector3; t: number; e: number };
  pending: Array<{ at: number; act: Act }>;
};

const CSS = `
.cs{position:absolute;inset:0;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation;font-family:system-ui,sans-serif}
.cs canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cs .bar{position:absolute;left:0;right:0;height:11%;background:#000;z-index:3;pointer-events:none}
.cs .bar.t{top:0}.cs .bar.b{bottom:0}
.cs .fade{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .7s;z-index:6;pointer-events:none}
.cs .flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:5;pointer-events:none}
.cs .box{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(11% + 14px);width:min(760px,92%);z-index:4;background:linear-gradient(180deg,rgba(10,12,16,.82),rgba(10,12,16,.92));border:2px solid rgba(255,255,255,.18);border-radius:14px;padding:12px 16px 14px;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5);min-height:78px}
.cs .who{font:900 12px/1 system-ui,sans-serif;letter-spacing:.14em;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.cs .txt{font:600 clamp(15px,2.6vw,19px)/1.42 system-ui,sans-serif;min-height:2.6em}
.cs .nx{position:absolute;right:14px;bottom:8px;font-size:12px;opacity:.7;animation:csb 1s infinite}
@keyframes csb{50%{transform:translateY(3px);opacity:.3}}
.cs .skip{position:absolute;right:12px;top:calc(11% + 8px);z-index:7;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:16px;padding:6px 14px;font:800 11px system-ui,sans-serif;letter-spacing:.08em}
.cs .title{position:absolute;inset:0;z-index:4;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;pointer-events:none}
.cs .title b{font:900 clamp(34px,9vw,84px)/1 Impact,Arial Black,sans-serif;letter-spacing:.04em;text-shadow:0 4px 24px rgba(0,0,0,.7)}
.cs .title i{font:700 clamp(12px,2.6vw,20px)/1.4 system-ui,sans-serif;letter-spacing:.3em;opacity:.85;margin-top:10px;font-style:normal}
.cs .gl{font:italic 600 12px/1.3 system-ui,sans-serif;color:#ffd9a0;opacity:.8;margin-top:5px;min-height:1em}
.cs .vo{position:absolute;left:12px;top:calc(11% + 8px);z-index:7;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:16px;padding:6px 12px;font:800 11px system-ui,sans-serif;letter-spacing:.08em}
.cs .loc{position:absolute;left:16px;top:calc(11% + 52px);z-index:4;color:#fff;opacity:.6;font:800 10px system-ui,sans-serif;letter-spacing:.2em}
`;

export type CutsceneHandle = { destroy: () => void };

/** Plays a data-driven 3D cutscene inside `container`. Calls onDone when it ends or is skipped. */
export function playCutscene(container: HTMLElement, scene: Cutscene, audio: GameAudio, onDone: () => void): CutsceneHandle {
  const root = document.createElement("div");
  root.className = "cs";
  root.innerHTML = `<style>${CSS}</style><div class="bar t"></div><div class="bar b"></div><div class="loc"></div>
    <div class="title"><b></b><i></i></div><div class="box" style="display:none"><div class="who"></div><div class="txt"></div><div class="gl"></div><div class="nx">TAP ▼</div></div>
    <button class="skip">SKIP ▸▸</button><button class="vo"></button><div class="flash"></div><div class="fade"></div>`;
  container.appendChild(root);
  const $ = (s: string) => root.querySelector(s) as HTMLElement;
  const vb = new VoiceBox(audio);
  const langMode = getLangMode();
  const voLabel = () => { $(".vo").textContent = vb.mode === "speech" ? "🗣 VOICES" : vb.mode === "blips" ? "🗣 BLIPS" : "🔇 NO VOICE"; };
  voLabel();
  let curMood: string | undefined, curWho = "";

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  root.insertBefore(renderer.domElement, root.firstChild);
  const three = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const L = lightingFor(scene.env);
  three.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar);
  renderer.toneMappingExposure = L.exposure;

  // environment: sky dome, lights (same looks as the race), stage, rain
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), new THREE.MeshBasicMaterial({ map: makeSky(scene.env.time, scene.env.weather), side: THREE.BackSide, fog: false, depthWrite: false }));
  three.add(skyMesh);
  const hemi = new THREE.HemisphereLight(new THREE.Color(L.hemiSky), new THREE.Color(L.hemiGround), L.hemiI * 1.1);
  const sun = new THREE.DirectionalLight(new THREE.Color(L.sun), Math.max(0.5, L.sunI * 0.8));
  sun.position.set(L.sunOffset[0], L.sunOffset[1], L.sunOffset[2]);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -16; sc.right = 16; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  three.add(hemi, sun, sun.target);
  // soft "camera" fill light: lifts the shadow side of faces (dark skin tones were going black in close-ups) without flattening the scene
  const fill = new THREE.DirectionalLight(0xfff1de, L.night ? 0.55 : 0.75);
  fill.castShadow = false;
  three.add(fill, fill.target);
  const stage: Stage = buildStage(scene.stage, scene.env);
  three.add(stage.group);
  // keep the stage's own lights from drowning the look: day scenes dim them
  for (const l of stage.lights) l.intensity *= L.night ? 1.2 : 0.35;
  const rain = L.rain > 0 ? new Rain(450) : null;
  if (rain) three.add(rain.lines);
  let flashT = 0, nextBolt = 4 + Math.random() * 4;

  // cast
  const actors = new Map<string, Actor>();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  for (const c of scene.cast) {
    const group = new THREE.Group();
    let char: Character | null = null, bike: Racer3D | null = null;
    if (c.bike) { bike = buildRacer(c.bike, c.look); group.add(bike.root); }
    else { char = new Character(c.look); group.add(char.group); }
    group.position.set(c.pos[0], 0, c.pos[1]);
    group.rotation.y = -((c.yaw ?? 0) * Math.PI) / 180;
    group.visible = !c.hidden;
    three.add(group);
    actors.set(c.id, { id: c.id, char, bike, group, pending: [] });
  }
  for (const c of scene.cast) {
    const a = actors.get(c.id)!;
    if (c.faceTo) faceActor(a, c.faceTo);
    if (c.pose && a.char) a.char.setPose(c.pose, true);
  }
  function posOf(id: string, out: THREE.Vector3) { const a = actors.get(id); if (a) return out.copy(a.group.position); return out.set(0, 0, 0); }
  function faceActor(a: Actor, to: string | number) {
    if (typeof to === "number") { a.group.rotation.y = -(to * Math.PI) / 180; return; }
    const t = actors.get(to); if (!t) return;
    const dx = t.group.position.x - a.group.position.x, dz = t.group.position.z - a.group.position.z;
    a.group.rotation.y = Math.atan2(-dx, -dz);
  }
  const headPos = (id: string, out: THREE.Vector3) => { const a = actors.get(id); if (!a) return out.set(0, 1.6, 0); out.copy(a.group.position); out.y += 1.58 * (a.char?.scale ?? 1); return out; };

  // ----------------------------------------------------------------- camera
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const resolve = (spec: CamSpec, lineIndex = 0): { pos: THREE.Vector3; look: THREE.Vector3; fov: number } => {
    const pos = new THREE.Vector3(), look = new THREE.Vector3();
    let fov = 38;
    if (spec.k === "wide") { pos.set(...spec.from); look.set(...spec.look); fov = spec.fov ?? 46; }
    else if (spec.k === "orbit") { pos.set(spec.look[0] + Math.sin(spec.a0) * spec.r, spec.h, spec.look[2] + Math.cos(spec.a0) * spec.r); look.set(...spec.look); fov = spec.fov ?? 40; }
    else if (spec.k === "close") {
      const a = actors.get(spec.who); headPos(spec.who, look); look.y -= 0.03;
      const yaw = a ? -a.group.rotation.y : 0; // forward = (sin yaw, 0, -cos yaw)
      const d = spec.d ?? 1.25, s = spec.s ?? (lineIndex % 2 ? 0.3 : -0.3);
      pos.set(look.x + Math.sin(yaw) * d + Math.cos(yaw) * s, look.y + (spec.h ?? 0.02), look.z - Math.cos(yaw) * d + Math.sin(yaw) * s);
      fov = 34;
    } else if (spec.k === "over") {
      const a = actors.get(spec.who); posOf(spec.who, pos); const target = posOf(spec.to, tmp2);
      const dir = target.clone().sub(pos); dir.y = 0; dir.normalize();
      const sc2 = a?.char?.scale ?? 1;
      const back = spec.d ?? 1.1;
      look.copy(target); look.y = 1.55 * sc2;
      pos.addScaledVector(dir, -back); pos.y = 1.65 * sc2; pos.x += -dir.z * 0.35; pos.z += dir.x * 0.35;
      fov = 36;
    } else { // two-shot: camera on the viewer's side of the line between a and b
      const pa = posOf(spec.a, tmp), pb = posOf(spec.b, tmp2);
      look.copy(pa).add(pb).multiplyScalar(0.5); look.y = 1.35;
      const dx = pb.x - pa.x, dz = pb.z - pa.z, len = Math.max(0.5, Math.hypot(dx, dz));
      let nx = -dz / len, nz = dx / len; if ((nz < 0) !== !!spec.flip) { nx = -nx; nz = -nz; }
      const d = (spec.d ?? 3.2) + len * 0.6;
      pos.set(look.x + nx * d, spec.h ?? 1.5, look.z + nz * d);
      fov = 40;
    }
    return { pos, look, fov };
  };

  // ----------------------------------------------------------------- shots + dialogue
  let shotIdx = -1, shot: Shot | null = null, shotT = 0, lineIdx = -1, shotLines: Line[] = [];
  let base = resolve(scene.shots[0].cam), blend = 1, from = { pos: base.pos.clone(), look: base.look.clone(), fov: base.fov };
  let typed = 0, fullText = "", lineDone = false, shotFinished = false, ended = false, driftOff = new THREE.Vector3();
  let shake = 0;
  const glEl = $(".gl");
  const box = $(".box"), whoEl = $(".who"), txtEl = $(".txt"), titleEl = $(".title"), fadeEl = $(".fade"), flashEl = $(".flash");
  $(".loc").textContent = scene.title.toUpperCase();

  const cutTo = (spec: CamSpec, li = 0, soft = false) => {
    const r = resolve(spec, li);
    from = soft ? { pos: camPos.clone(), look: camLook.clone(), fov: camera.fov } : { pos: r.pos.clone(), look: r.look.clone(), fov: r.fov };
    base = r; blend = soft ? 0 : 1;
  };
  const sfx = (name?: string) => {
    if (!name) return;
    if (name === "phone") audio.phone(); else if (name === "thunder") audio.thunder(0.1); else if (name === "horn") audio.horn("danfo", 0, 0.7);
    else if (name === "crash") audio.crash(); else if (name === "finish") audio.finish(); else if (name === "motif") audio.motif(); else if (name === "pickup") audio.pickup(); else if (name === "go") audio.go();
  };
  const runAct = (a: Actor, act: Act) => {
    if (act.do === "walk" && a.char) { a.walk = { to: new THREE.Vector3(act.to[0], 0, act.to[1]), speed: act.speed ?? 1.35, after: "stand" }; }
    else if (act.do === "pose" && a.char) a.char.setPose(act.pose);
    else if (act.do === "face") faceActor(a, act.to);
    else if (act.do === "look" && a.char) { if (act.at) { a.char.setLookAt(headPos(act.at, new THREE.Vector3())); } else a.char.setLookAt(null); }
    else if (act.do === "show") a.group.visible = true;
    else if (act.do === "hide") a.group.visible = false;
    else if (act.do === "ride") { a.group.visible = true; a.ride = { from: new THREE.Vector3(act.from[0], 0, act.from[1]), to: new THREE.Vector3(act.to[0], 0, act.to[1]), t: act.t, e: 0 }; a.group.position.copy(a.ride.from); const d = a.ride.to.clone().sub(a.ride.from); a.group.rotation.y = Math.atan2(-d.x, -d.z); }
  };
  const useClose = (i: number) => !!shot && (shot.coverage ?? shotLines.length > 1) && i > 0 && !!shotLines[i] && actors.has(shotLines[i].who) && !shotLines[i].phone;
  const showLine = (i: number) => {
    const ln = shotLines[i]; lineIdx = i;
    const sp = SPEAKERS[ln.who] ?? { name: ln.who.toUpperCase(), color: "#fff" };
    box.style.display = "block";
    whoEl.innerHTML = `<span style="color:${sp.color}">${ln.phone ? "📞 " : ""}${sp.name}</span>`;
    const fl = flavor(ln.who, ln.text, langMode, ln.alt, ln.phone);
    fullText = fl.text; typed = 0; lineDone = false; txtEl.textContent = ""; glEl.textContent = fl.gloss; curMood = ln.mood; curWho = ln.who;
    vb.speak(ln.who, fl.say, { mood: ln.mood, radio: ln.phone, shown: fl.text });
    for (const [id, a] of actors) if (a.char) { a.char.talking = id === ln.who && !ln.phone; a.char.laughing = id === ln.who && ln.mood === "laugh"; }
    // cinematic coverage: cut to a close-up of whoever speaks
    if (useClose(i)) cutTo({ k: "close", who: ln.who }, i, false);
    else if (shot && (i === 0 || ln.phone)) cutTo(shot.cam, 0, false);
    if (ln.mood === "angry") shake = 0.25;
  };
  const startShot = (i: number) => {
    shotIdx = i; shot = scene.shots[i]; shotT = 0; shotFinished = false; driftOff.set(0, 0, 0);
    shotLines = shot.lines ?? []; lineIdx = -1;
    vb.stop();
    box.style.display = "none"; titleEl.style.display = "none";
    for (const a of actors.values()) if (a.char) { a.char.talking = false; a.char.laughing = false; }
    const fx = shot.fx;
    if (fx?.music) audio.setMusicMode(fx.music);
    if (fx?.flash) flashT = 1;
    if (fx?.shake) shake = fx.shake;
    sfx(fx?.sfx);
    if (fx?.fade === "in") fadeEl.style.opacity = "0"; else if (fx?.fade === "out" || fx?.fade === "black") fadeEl.style.opacity = "1";
    if (fx?.title) { titleEl.style.display = "flex"; (titleEl.querySelector("b") as HTMLElement).textContent = fx.title.big; (titleEl.querySelector("i") as HTMLElement).textContent = fx.title.small ?? ""; }
    for (const act of shot.act ?? []) { const a = actors.get(act.who); if (!a) continue; if (act.delay) a.pending.push({ at: shotT + act.delay, act }); else runAct(a, act); }
    cutTo(shot.cam, 0, false);
    if (shotLines.length) showLine(0);
  };
  const advance = () => {
    if (ended) return;
    if (!shotLines.length || lineIdx < 0) return;
    if (!lineDone) { typed = fullText.length; lineDone = true; txtEl.textContent = fullText; return; }
    if (lineIdx + 1 < shotLines.length) showLine(lineIdx + 1); else finishShot();
  };
  const finishShot = () => { shotFinished = true; };
  const nextShot = () => {
    if (shotIdx + 1 >= scene.shots.length) { end(); return; }
    startShot(shotIdx + 1);
  };
  const end = () => {
    if (ended) return; ended = true;
    audio.setMusicMode("calm");
    vb.stop();
    fadeEl.style.opacity = "1";
    window.setTimeout(() => onDone(), 650);
  };
  const onTap = (e: Event) => { const c = (e.target as HTMLElement).classList; if (c.contains("skip") || c.contains("vo")) return; advance(); };
  root.addEventListener("pointerdown", onTap);
  const onKey = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); } else if (e.code === "Escape") end(); };
  window.addEventListener("keydown", onKey);
  $(".skip").addEventListener("click", (e) => { e.stopPropagation(); end(); });
  $(".vo").addEventListener("click", (e) => { e.stopPropagation(); vb.cycleMode(); voLabel(); });
  $(".vo").addEventListener("pointerdown", (e) => e.stopPropagation());

  // ----------------------------------------------------------------- loop
  const resize = () => { const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); window.addEventListener("resize", resize);
  audio.setMusicMode(scene.music ?? "calm");
  fadeEl.style.opacity = "1";
  window.setTimeout(() => { fadeEl.style.opacity = "0"; }, 60);
  startShot(0);
  let last = performance.now(), t = 0, raf = 0, shotAuto = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    shotT += dt;
    // actors
    for (const a of actors.values()) {
      for (let i = a.pending.length - 1; i >= 0; i--) if (shotT >= a.pending[i].at) { runAct(a, a.pending[i].act); a.pending.splice(i, 1); }
      if (a.walk && a.char) {
        tmp.copy(a.walk.to).sub(a.group.position); const d = tmp.length();
        if (d < 0.05) { a.walk = undefined; a.char.walkSpeed = 0; }
        else {
          tmp.normalize(); a.group.position.addScaledVector(tmp, Math.min(d, a.walk.speed * dt));
          const targetYaw = Math.atan2(-tmp.x, -tmp.z); let diff = targetYaw - a.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          a.group.rotation.y += diff * Math.min(1, dt * 8);
          a.char.walkSpeed = a.walk.speed;
        }
      }
      if (a.ride) {
        a.ride.e += dt; const k = Math.min(1, a.ride.e / a.ride.t);
        a.group.position.lerpVectors(a.ride.from, a.ride.to, k);
        const spd = a.ride.from.distanceTo(a.ride.to) / a.ride.t;
        if (a.bike) { a.bike.bike.frontWheel.rotation.x -= (spd * dt) / a.bike.bike.wheelR; a.bike.bike.rearWheel.rotation.x -= (spd * dt) / a.bike.bike.wheelR; }
        if (k >= 1) a.ride = undefined;
      }
      if (a.char) a.char.update(dt, t);
    }
    // typewriter
    if (shotLines.length && lineIdx >= 0 && !lineDone) {
      const before = Math.floor(typed);
      typed += dt * (vb.mode === "speech" ? 30 : 48); // a little slower when a voice is reading along
      if (typed >= fullText.length) { typed = fullText.length; lineDone = true; }
      const now = Math.floor(typed);
      for (let k = before; k < now; k++) vb.typed(curWho, fullText[k], curMood);
      txtEl.textContent = fullText.slice(0, now);
    }
    const hold = shotLines[lineIdx]?.hold;
    if (hold && lineDone && !vb.busy) { shotAuto += dt; if (shotAuto > hold) { shotAuto = 0; if (lineIdx + 1 < shotLines.length) showLine(lineIdx + 1); else finishShot(); } } else shotAuto = 0;
    // shot timing (shots with no lines run for dur)
    const walking = [...actors.values()].some((a) => a.walk || a.ride);
    if (!shotLines.length) { if (shotT >= (shot?.dur ?? 2.5) && !walking) finishShot(); }
    if (shotFinished && !ended) { shotFinished = false; nextShot(); }
    // camera
    blend = Math.min(1, blend + dt * 2.4);
    const e = blend * blend * (3 - 2 * blend);
    if (shot?.cam.k === "orbit") {
      const o = shot.cam, p = Math.min(1, shotT / Math.max(1, shot.dur ?? 6)), a = o.a0 + (o.a1 - o.a0) * p;
      camPos.set(o.look[0] + Math.sin(a) * o.r, o.h, o.look[2] + Math.cos(a) * o.r); camLook.set(...o.look);
    } else if (shotLines.length && lineIdx >= 0 && useClose(lineIdx)) {
      const r = resolve({ k: "close", who: shotLines[lineIdx].who }, lineIdx); // follows the speaker if they move
      base = r;
      camPos.lerpVectors(from.pos, r.pos, e); camLook.lerpVectors(from.look, r.look, e); camera.fov += (r.fov - camera.fov) * Math.min(1, dt * 6);
    } else {
      const r = shot ? resolve(shot.cam, 0) : base;
      camPos.lerpVectors(from.pos, r.pos, e); camLook.lerpVectors(from.look, r.look, e); camera.fov += (r.fov - camera.fov) * Math.min(1, dt * 6);
    }
    if (shot?.drift) { driftOff.set(shot.drift[0], shot.drift[1], shot.drift[2]).multiplyScalar(Math.min(1, shotT / 8)); camPos.add(driftOff); }
    shake = Math.max(0, shake - dt * 1.4);
    camera.position.set(camPos.x + (Math.random() - 0.5) * shake * 0.12, camPos.y + (Math.random() - 0.5) * shake * 0.12, camPos.z);
    camera.lookAt(camLook);
    fill.position.copy(camera.position).add(tmp.set(1.2, 1.4, 0)); fill.target.position.copy(camLook);
    camera.updateProjectionMatrix();
    skyMesh.position.copy(camera.position);
    sun.target.position.set(camLook.x, 0, camLook.z); sun.position.set(camLook.x + L.sunOffset[0], L.sunOffset[1], camLook.z + L.sunOffset[2]); sun.target.updateMatrixWorld();
    stage.tick(dt, t);
    if (rain) rain.update(dt, camera.position, tmp.set(0, 0, 0), L.rain, L.wind);
    if (L.lightning) { nextBolt -= dt; if (nextBolt <= 0) { flashT = 1; nextBolt = 5 + Math.random() * 8; audio.thunder(0.3 + Math.random()); } }
    if (flashT > 0) { flashT = Math.max(0, flashT - dt * 2.6); hemi.intensity = L.hemiI * 1.1 + flashT * 3; flashEl.style.opacity = String(flashT * 0.4); } else if (L.lightning) hemi.intensity = L.hemiI * 1.1;
    renderer.render(three, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    destroy: () => {
      cancelAnimationFrame(raf); ended = true; vb.stop();
      window.removeEventListener("resize", resize); window.removeEventListener("keydown", onKey);
      for (const a of actors.values()) { three.remove(a.group); disposeTree(a.group); }
      disposeTree(stage.group); rain?.lines.geometry.dispose();
      renderer.dispose(); renderer.forceContextLoss(); root.remove();
    }
  };
}
