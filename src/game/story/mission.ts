// Mission rules for story mode (pure logic, no three.js): objectives, the package, pursuers / leader / allies,
// radio comms, time limits, shortcuts. threeRace.ts feeds it the live racers and shows what it asks for.
import type { Env } from "../weather";
import type { Comm, MissionCfg, Mood, RivalRole } from "./types";
import type { AltMap } from "./lang";

export type MR = {
  x: number; dist: number; v: number; vmax: number; vx: number;
  boosting: boolean; padT: number; nitro: number; finished: boolean; skill: number;
  /** false = not in the world yet (pursuers/allies before they join) */
  active: boolean;
};
export type MissionResult = { ok: boolean; reason: string };
export type Hud = { goal: string; time?: number; integrity?: number; caught?: number; follow?: number };

export interface Host {
  player: MR;
  goal: number;
  place: () => number;
  popup: (text: string, color?: string) => void;
  caption: (who: string, text: string, ms: number, alt?: AltMap) => void;
  /** mission sound effects: start / warn / urgent / bag / ally / caught / block / obj */
  sfx: (name: "start" | "warn" | "urgent" | "bag" | "ally" | "caught" | "block" | "obj") => void;
  music: (m: Mood) => void;
  siren: (on: boolean) => void;
  setEnv: (e: Env) => void;
  hud: (h: Hud) => void;
  end: (r: MissionResult) => void;
  /** shove the player sideways and scrub speed (a rider ramming him) */
  nudge: (vx: number, speedMul: number) => void;
}

type Rival = { id: string; r: MR; role: RivalRole; at: number; idx: number; heat: number; burst: number; slow: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ROAD = 5.2;

export class Mission {
  integrity = 100;
  caught = 0;
  follow = 0;
  done = false;
  private rivals: Rival[] = [];
  private commIdx = 0;
  private lostT = 0;
  private lastCaughtPopup = -9;
  private sirenOn = false;
  private sirenComm = false;
  private blocks: number[];
  private t = 0;
  private heat = 0;
  private hidden = new Set<string>();
  private started = false;
  private lastSec = -1;
  private warnedBlocks = new Set<number>();

  constructor(readonly cfg: MissionCfg, private host: Host, rivalRefs: Array<{ id: string; r: MR }>) {
    this.blocks = [...(cfg.roadblocks ?? [])];
    cfg.rivals.forEach((rv, i) => {
      const ref = rivalRefs[i];
      if (!ref) return;
      this.rivals.push({ id: ref.id, r: ref.r, role: rv.role, at: rv.at ?? 0, idx: i, heat: 0, burst: 0, slow: 1 });
      if (rv.role === "pursuer" || rv.role === "ally" || rv.role === "watcher") ref.r.active = false;
    });
    this.comms = [...cfg.comms].sort((a, b) => a.at - b.at);
  }
  private comms: Comm[];
  /** true for riders driven by this mission (the normal CPU AI must leave them alone) */
  isScripted(i: number) { const rv = this.cfg.rivals[i]; return !!rv && rv.role !== "racer"; }

  onCrash() {
    if (this.done) return;
    this.heat = Math.min(1, this.heat + 0.35);
    if (this.cfg.integrity) {
      this.integrity = Math.max(0, this.integrity - 24);
      this.host.popup(`PACKAGE ${Math.round(this.integrity)}%`, "#ff9b6b"); this.host.sfx("bag");
      if (this.integrity <= 0) this.finish(false, "The bag is ruined. Whoever was waiting for it is going to be very unhappy.");
    }
  }
  onShortcut(label: string) {
    const p = this.host.player;
    p.padT = Math.max(p.padT, 3.4); p.nitro = Math.min(1, p.nitro + 0.3);
    this.host.popup(`${label}  +BOOST`, "#7dffb2"); this.host.sfx("obj");
  }
  /** called when the player crosses the finish line */
  onFinish(raceT: number) {
    if (this.done) return;
    const c = this.cfg;
    if (c.objective === "race") {
      const pl = this.host.place();
      if (pl <= (c.needPlace ?? 1)) this.finish(true, `Finished ${pl}${pl === 1 ? "st" : pl === 2 ? "nd" : "th"}.`);
      else this.finish(false, `Finished ${pl}${pl === 3 ? "rd" : "th"}. You needed the top ${c.needPlace ?? 1}.`);
    } else if (c.objective === "follow") {
      this.finish(this.follow >= 1, this.follow >= 1 ? "You caught him." : "You never got close enough.");
    } else {
      void raceT;
      this.finish(true, c.objective === "escape" ? "You shook them off." : "Delivered.");
    }
  }

  private finish(ok: boolean, reason: string) {
    if (this.done) return;
    this.done = true;
    this.host.siren(false);
    this.host.end({ ok, reason });
  }

  tick(dt: number, raceT: number, racing: boolean) {
    if (this.done || !racing) return;
    this.t += dt;
    if (!this.started) { this.started = true; this.host.sfx("start"); }
    const P = this.host.player, c = this.cfg;
    this.heat = Math.max(0, this.heat - 0.04 * dt);
    if (P.v < P.vmax * 0.8) this.heat = Math.min(1, this.heat + 0.12 * dt);

    // radio comms
    while (this.commIdx < this.comms.length && P.dist >= this.comms[this.commIdx].at) {
      const m = this.comms[this.commIdx++];
      this.host.caption(m.who, m.text, m.ms ?? 3400, m.alt);
      if (m.music) this.host.music(m.music);
      if (m.siren !== undefined) { this.sirenComm = m.siren; }
      if (m.env) this.host.setEnv(m.env);
    }

    // time limit
    let timeLeft: number | undefined;
    if (c.timeLimit) {
      timeLeft = c.timeLimit - raceT;
      if (timeLeft <= 0) { this.finish(false, "Too late. The customer left."); return; }
      const sec = Math.ceil(timeLeft);
      if (timeLeft < 16 && sec !== this.lastSec) { this.lastSec = sec; this.host.sfx(timeLeft < 7 ? "urgent" : "warn"); }
    }

    // scripted riders
    let pursuerNear = false;
    for (const rv of this.rivals) {
      if (rv.role === "racer") continue;
      const r = rv.r, old = r.x;
      if (rv.role === "pursuer") {
        if (!r.active) { if (P.dist >= rv.at) { r.active = true; r.dist = P.dist - 95; r.x = P.x; r.v = P.v * 1.25; } else continue; }
        const gap = Math.max(2.0, 24 - this.heat * 22 - rv.idx * 2); // slow down or crash and they close right in
        const want = P.dist - gap;
        const top = r.vmax * 1.12 * r.skill * rv.slow;
        r.v = clamp(P.v + (want - r.dist) * 1.5, r.vmax * 0.4, top);
        r.dist += r.v * dt;
        const tx = clamp(P.x + Math.sin(this.t * 0.9 + rv.idx * 2.1) * 1.2, -ROAD, ROAD);
        r.x += clamp(tx - r.x, -4.5 * dt, 4.5 * dt);
        const dz = P.dist - r.dist, dx = P.x - r.x;
        if (dz > 0 && dz < 3.4 && Math.abs(dx) < 1.0) {
          this.caught += 36 * dt;
          this.host.nudge(Math.sign(dx || 1) * 2.8, 1 - 0.5 * dt);
          if (this.t - this.lastCaughtPopup > 3.5) { this.lastCaughtPopup = this.t; this.host.popup("HE'S ON YOU!", "#ff6b6b"); this.host.sfx("caught"); }
        } else if (dz > 7 || dz < 0) this.caught = Math.max(0, this.caught - 8 * dt);
        rv.slow = Math.min(1, rv.slow + 0.4 * dt);
        if (dz > -40 && dz < 60) pursuerNear = true;
      } else if (rv.role === "leader") {
        if (!r.active) { r.active = true; r.dist = P.dist + 45; r.x = P.x; r.v = P.v; }
        rv.burst -= dt;
        if (rv.burst < -8) rv.burst = 2.4;                              // every ~10 s he sprints for 2.4 s
        // he rides at his OWN pace (about a cafe racer's top speed): you only close the gap by boosting or pads
        const top = r.vmax * r.skill * (rv.burst > 0 ? 0.88 : 0.8);
        r.v = top * (1 + Math.sin(this.t * 0.7) * 0.02);
        r.dist = Math.min(this.host.goal - 30, r.dist + r.v * dt);
        const lane = Math.sin(this.t * 0.35 + 1) * 3.2;
        r.x += clamp(lane - r.x, -3.6 * dt, 3.6 * dt);
        const ahead = r.dist - P.dist;
        if (Math.abs(ahead) < 12 && Math.abs(r.x - P.x) < 1.8) { this.follow = Math.min(1, this.follow + dt / 5); }
        else this.follow = Math.max(0, this.follow - dt / 18);
        if (ahead > 220) this.lostT += dt; else this.lostT = Math.max(0, this.lostT - dt);
        if (this.lostT > 6) { this.finish(false, "He's gone. You lost him."); return; }
        if (this.follow >= 1) { this.finish(true, "You caught him."); return; }
      } else if (rv.role === "ally") {
        if (!r.active) { if (P.dist >= rv.at) { r.active = true; r.dist = P.dist - 30; r.x = P.x + (rv.idx % 2 ? 1.8 : -1.8); r.v = P.v * 1.1; this.host.sfx("ally"); } else continue; }
        const want = P.dist + 7 + (rv.idx % 3) * 6;
        r.v = clamp(P.v + (want - r.dist) * 1.3, r.vmax * 0.4, r.vmax * 1.15 * r.skill);
        r.dist += r.v * dt;
        const side = rv.idx % 2 ? 1.9 : -1.9;
        r.x += clamp(clamp(P.x + side, -ROAD, ROAD) - r.x, -4 * dt, 4 * dt);
        for (const o of this.rivals) if (o.role === "pursuer" && o.r.active && Math.abs(o.r.dist - r.dist) < 10 && Math.abs(o.r.x - r.x) < 2) o.slow = 0.86; // allies block for you
      } else if (rv.role === "watcher") {
        if (!r.active) { if (P.dist >= rv.at) { r.active = true; r.dist = P.dist + 75; r.x = P.x; r.v = P.v * 0.96; } else continue; }
        const ahead = r.dist - P.dist;
        r.v = clamp(P.v * (ahead < 40 ? 1.3 : 0.96), r.vmax * 0.4, r.vmax * 1.25);
        r.dist += r.v * dt;
        if (ahead > 420 && !this.hidden.has(rv.id)) { this.hidden.add(rv.id); r.active = false; }
      }
      r.vx = (r.x - old) / Math.max(dt, 1e-3);
    }
    if (this.caught >= 100) { this.finish(false, "He grabbed the bag."); return; }

    // sirens near roadblocks
    for (const b of this.blocks) if (!this.warnedBlocks.has(b) && b - P.dist < 240 && b - P.dist > 0) { this.warnedBlocks.add(b); this.host.sfx("block"); this.host.popup("ROADBLOCK AHEAD", "#ff9b6b"); }
    const nearBlock = this.blocks.some((b) => b - P.dist > -30 && b - P.dist < 320);
    const want = this.sirenComm || nearBlock || (c.objective === "escape" && pursuerNear && false);
    if (want !== this.sirenOn) { this.sirenOn = want; this.host.siren(want); }

    this.host.hud({ goal: c.goalText, time: timeLeft, integrity: c.integrity ? this.integrity : undefined, caught: this.rivals.some((r) => r.role === "pursuer") ? this.caught : undefined, follow: c.objective === "follow" ? this.follow : undefined });
  }
}
