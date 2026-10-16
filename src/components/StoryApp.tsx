"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./GameCanvas";
import { CUTSCENES, MISSIONS, SEQUENCE } from "../game/story/script";
import { loadStory, resetStory, saveStory, type StorySave } from "../game/story/save";
import { envLabel } from "../game/weather";
import { getMap } from "../game/maps";
import { getBike } from "../game/loadout";
import type { MissionOutcome } from "../game/threeRace";
import type { GameAudio } from "../game/audio";

type View = { k: "menu" } | { k: "chapters" } | { k: "chapter"; step: number } | { k: "cutscene"; step: number } | { k: "brief"; step: number } | { k: "mission"; step: number; attempt: number } | { k: "end" };

function CutsceneHost({ id, onDone }: { id: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    let handle: { destroy: () => void } | undefined, audio: GameAudio | undefined, dead = false;
    void (async () => {
      const [{ playCutscene }, { GameAudio: GA }, { loadModelPack }] = await Promise.all([import("../game/story/cutscene"), import("../game/audio"), import("../game/models/loadPack")]);
      await loadModelPack();
      if (dead || !ref.current) return;
      audio = new GA(); audio.start();
      handle = playCutscene(ref.current, CUTSCENES[id], audio, () => doneRef.current());
    })();
    return () => { dead = true; handle?.destroy(); audio?.dispose(); };
  }, [id]);
  return <div ref={ref} className="st-cutscene" />;
}

export default function StoryApp() {
  const [save, setSave] = useState<StorySave | null>(null);
  const [view, setView] = useState<View>({ k: "menu" });
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => { setSave(loadStory()); }, []);
  const update = useCallback((fn: (s: StorySave) => StorySave) => {
    setSave((prev) => { const next = fn(prev ?? loadStory()); saveStory(next); return next; });
  }, []);

  const go = useCallback((step: number) => {
    if (step >= SEQUENCE.length) { setView({ k: "end" }); return; }
    const n = SEQUENCE[step];
    if (n.type === "chapter") setView({ k: "chapter", step });
    else if (n.type === "cutscene") setView({ k: "cutscene", step });
    else setView({ k: "brief", step });
  }, []);

  const advance = useCallback((from: number) => {
    const next = from + 1;
    update((s) => ({ ...s, step: Math.min(next, SEQUENCE.length), unlocked: Math.max(s.unlocked, next) }));
    go(next);
  }, [go, update]);

  // chapter title cards advance by themselves
  useEffect(() => {
    if (view.k !== "chapter") return;
    const t = window.setTimeout(() => advance(view.step), 2600);
    return () => window.clearTimeout(t);
  }, [view, advance]);

  const onMissionEnd = useCallback((step: number, attempt: number, o: MissionOutcome) => {
    const node = SEQUENCE[step];
    if (node.type !== "mission") return;
    if (o.retry) { update((s) => ({ ...s, attempts: { ...s.attempts, [node.id]: attempt } })); setView({ k: "mission", step, attempt: attempt + 1 }); return; }
    update((s) => ({ ...s, cash: s.cash + (o.skipped ? 0 : o.reward), done: s.done.includes(node.id) ? s.done : [...s.done, node.id] }));
    advance(step);
  }, [advance, update]);

  if (!save) return <div className="st-screen"><div className="st-card"><b>LOADING…</b></div></div>;

  if (view.k === "cutscene") {
    const n = SEQUENCE[view.step];
    if (n.type !== "cutscene") return null;
    return <CutsceneHost key={n.id} id={n.id} onDone={() => advance(view.step)} />;
  }
  if (view.k === "mission") {
    const n = SEQUENCE[view.step];
    if (n.type !== "mission") return null;
    const cfg = MISSIONS[n.id];
    return (
      <div className="st-mission">
        <GameCanvas mode="solo" map={cfg.map} env={cfg.env} mission={cfg} attempt={view.attempt} onMissionEnd={(o) => onMissionEnd(view.step, view.attempt, o)} />
        <button className="st-exit" onClick={() => { if (window.confirm("Leave this mission and go back to the story menu? Progress is saved.")) setView({ k: "menu" }); }}>✕</button>
      </div>
    );
  }
  if (view.k === "brief") {
    const n = SEQUENCE[view.step];
    if (n.type !== "mission") return null;
    const cfg = MISSIONS[n.id], m = getMap(cfg.map), bike = getBike(cfg.bike);
    return (
      <div className="st-screen">
        <div className="st-card">
          <small>{cfg.chapter}</small>
          <h2>{cfg.title}</h2>
          <p>{cfg.brief}</p>
          <ul>
            <li><span>OBJECTIVE</span>{cfg.goalText}</li>
            <li><span>ROUTE</span>{m.name} · {(m.length / 1000).toFixed(1)} km</li>
            <li><span>CONDITIONS</span>{envLabel(cfg.env)}</li>
            <li><span>BIKE</span>{bike.name}</li>
            {cfg.reward > 0 && <li><span>PAYS</span>₦{cfg.reward.toLocaleString()}</li>}
          </ul>
          <button className="st-btn" onClick={() => setView({ k: "mission", step: view.step, attempt: (save.attempts[n.id] ?? 0) + 1 })}>RIDE ▸</button>
          <button className="st-btn alt" onClick={() => setView({ k: "menu" })}>BACK</button>
        </div>
      </div>
    );
  }
  if (view.k === "chapter") {
    const n = SEQUENCE[view.step];
    if (n.type !== "chapter") return null;
    return (
      <div className="st-screen st-chapter" onClick={() => advance(view.step)}>
        <div><small>{n.title}</small><h2>{n.sub}</h2></div>
      </div>
    );
  }
  if (view.k === "end") {
    return (
      <div className="st-screen">
        <div className="st-card">
          <small>THE END</small>
          <h2>ABOKI RIDERS: THE LAST DELIVERY</h2>
          <p>You finished the story with ₦{save.cash.toLocaleString()}. Lagos has more secrets. Maybe there is another Circuit.</p>
          <button className="st-btn" onClick={() => setView({ k: "menu" })}>MENU</button>
        </div>
      </div>
    );
  }
  if (view.k === "chapters") {
    const items = SEQUENCE.map((n, i) => ({ n, i })).filter((x) => x.n.type === "chapter" && x.i <= save.unlocked);
    return (
      <div className="st-screen">
        <div className="st-card wide">
          <small>CHAPTER SELECT</small>
          <div className="st-list">
            {items.map(({ n, i }) => n.type === "chapter" && (
              <button key={i} className="st-row" onClick={() => { update((s) => ({ ...s, step: i })); go(i); }}>
                <b>{n.title}</b><span>{n.sub || "—"}</span>
              </button>
            ))}
          </div>
          <button className="st-btn alt" onClick={() => setView({ k: "menu" })}>BACK</button>
        </div>
      </div>
    );
  }

  // menu
  const started = save.unlocked > 0;
  return (
    <div className="st-screen st-menu">
      <div className="st-card">
        <small>A LAGOS STORY</small>
        <h1>ABOKI RIDERS</h1>
        <h3>THE LAST DELIVERY</h3>
        <p>One delivery. A bag he must not open. A city that suddenly wants to know who he is.</p>
        <div className="st-cash">₦{save.cash.toLocaleString()}</div>
        <button className="st-btn" onClick={() => go(started ? Math.min(save.step, SEQUENCE.length - 1) : 0)}>{started ? "CONTINUE" : "START STORY"}</button>
        {started && <button className="st-btn alt" onClick={() => setView({ k: "chapters" })}>CHAPTERS</button>}
        {started && (confirmNew
          ? <button className="st-btn danger" onClick={() => { setSave(resetStory()); setConfirmNew(false); }}>TAP AGAIN: ERASE PROGRESS</button>
          : <button className="st-btn alt" onClick={() => setConfirmNew(true)}>NEW STORY</button>)}
        <Link className="st-link" href="/">← ABOKI RIDERS</Link>
        <p className="st-note">Works offline · Progress is saved on this device</p>
      </div>
    </div>
  );
}
