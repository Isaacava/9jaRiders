"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "./GameCanvas";
import { CUTSCENES, MISSIONS, SEQUENCE } from "../game/story/script";
import { DOSSIER_ORDER, PERSONAS, TONGUE_NAME } from "../game/story/cast";
import { RIDER_LOOKS } from "../game/models/riderShape";
import { SPEAKERS } from "../game/story/types";
import { getLangMode, setLangMode, type LangMode } from "../game/story/lang";
import { getVoiceMode, setVoiceMode, speechAvailable, type VoiceMode } from "../game/voice";
import { loadStory, resetStory, saveStory, type StorySave } from "../game/story/save";
import { envLabel } from "../game/weather";
import { getMap } from "../game/maps";
import { getBike } from "../game/loadout";
import type { MissionOutcome } from "../game/threeRace";
import type { GameAudio } from "../game/audio";

type View = { k: "menu" } | { k: "cast" } | { k: "settings" } | { k: "chapters" } | { k: "chapter"; step: number } | { k: "cutscene"; step: number } | { k: "brief"; step: number } | { k: "mission"; step: number; attempt: number } | { k: "end" };

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

  const audioRef = useRef<GameAudio | null>(null);
  const [langMode, setLang] = useState<LangMode>("mix");
  const [voiceMode, setVoice] = useState<VoiceMode>("speech");
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { setSave(loadStory(SEQUENCE)); setLang(getLangMode()); setVoice(getVoiceMode()); }, []);
  /** menu sounds + voice previews (created on the first tap, because browsers only allow audio after a gesture) */
  const ensureAudio = useCallback(async () => {
    if (audioRef.current) { audioRef.current.start(); return audioRef.current; }
    const { GameAudio: GA } = await import("../game/audio");
    const a = new GA(); a.start(); a.setMusicMode("off"); audioRef.current = a; return a;
  }, []);
  useEffect(() => () => { audioRef.current?.dispose(); audioRef.current = null; }, []);
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
    const here = SEQUENCE[from];
    update((s) => ({ ...s, step: Math.min(next, SEQUENCE.length), unlocked: Math.max(s.unlocked, next), seen: here?.type === "cutscene" && !s.seen.includes(here.id) ? [...s.seen, here.id] : s.seen }));
    go(next);
  }, [go, update]);

  // chapter title cards advance by themselves
  useEffect(() => {
    if (view.k !== "chapter") return;
    void ensureAudio().then((a) => a.chapter()).catch(() => undefined);
    const t = window.setTimeout(() => advance(view.step), 2600);
    return () => window.clearTimeout(t);
  }, [view, advance, ensureAudio]);

  const onMissionEnd = useCallback((step: number, attempt: number, o: MissionOutcome) => {
    const node = SEQUENCE[step];
    if (node.type !== "mission") return;
    if (o.retry) { update((s) => ({ ...s, attempts: { ...s.attempts, [node.id]: attempt } })); setView({ k: "mission", step, attempt: attempt + 1 }); return; }
    update((s) => ({ ...s, cash: s.cash + (o.skipped ? 0 : o.reward), done: s.done.includes(node.id) ? s.done : [...s.done, node.id] }));
    advance(step);
  }, [advance, update]);

  if (!save) return <div className="st-screen"><div className="st-card"><b>LOADING…</b></div></div>;

  if (view.k === "cutscene" || view.k === "mission") { /* the menu audio must not compete with the scene / race audio */ if (audioRef.current) { audioRef.current.dispose(); audioRef.current = null; } }
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
          <p className="st-note">{m.blurb}</p>
          <ul>
            <li><span>OBJECTIVE</span>{cfg.goalText}</li>
            <li><span>ROUTE</span>{m.name} · {(m.length / 1000).toFixed(1)} km</li>
            <li><span>DISTRICT</span>{m.district}</li>
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
  if (view.k === "settings") {
    const cycleVoice = () => {
      const order: VoiceMode[] = speechAvailable() ? ["speech", "blips", "off"] : ["blips", "off"];
      const next = order[(order.indexOf(voiceMode) + 1) % order.length];
      setVoiceMode(next); setVoice(next);
    };
    const toggleLang = () => { const n: LangMode = langMode === "mix" ? "pidgin" : "mix"; setLangMode(n); setLang(n); };
    const hear = async (who: string) => {
      const a = await ensureAudio();
      const { VoiceBox } = await import("../game/voice");
      const { flavor } = await import("../game/story/lang");
      const vb = new VoiceBox(a);
      const p = PERSONAS[who];
      const fl = flavor(who, p.quote, langMode, undefined);
      vb.speak(who, fl.say, { shown: fl.text });
    };
    return (
      <div className="st-screen">
        <div className="st-card wide">
          <small>VOICES & LANGUAGE</small>
          <h2>9JA VIBES</h2>
          <button className="st-btn alt" onClick={cycleVoice}>VOICES: {voiceMode === "speech" ? "DEVICE SPEECH (different voice per character)" : voiceMode === "blips" ? "SYNTH VOICES (works offline everywhere)" : "OFF (read the subtitles)"}</button>
          <button className="st-btn alt" onClick={toggleLang}>LANGUAGE: {langMode === "mix" ? "9JA MIX · Pidgin + Yoruba, Igbo, Hausa" : "PIDGIN ONLY"}</button>
          <p className="st-note">MIX: each character falls back on their own mother tongue (Yoruba, Igbo, Hausa) with the English meaning shown underneath. Device speech can only read the words phonetically, because Nigerian-language voices are rare on phones.</p>
          <div className="st-list">
            {["aboki", "kelechi", "bisi", "boss", "zara", "mama", "ayo", "titi"].map((id) => (
              <button key={id} className="st-row" onClick={() => void hear(id)}><b style={{ color: SPEAKERS[id]?.color }}>{PERSONAS[id].name.toUpperCase()}</b><span>▶ hear · {TONGUE_NAME[PERSONAS[id].tongue]}</span></button>
            ))}
          </div>
          <button className="st-btn alt" onClick={() => setView({ k: "menu" })}>BACK</button>
        </div>
      </div>
    );
  }
  if (view.k === "cast") {
    const unlocked = (id: string) => { const f = PERSONAS[id].first; return f === "-" || save.seen.includes(f) || save.done.includes(f); };
    const finished = save.done.includes("m11");
    const open = openId ? PERSONAS[openId] : null;
    const hearLine = async (id: string) => {
      const a = await ensureAudio();
      const { VoiceBox } = await import("../game/voice");
      const { flavor } = await import("../game/story/lang");
      const fl = flavor(id, PERSONAS[id].quote, langMode);
      new VoiceBox(a).speak(id, fl.say, { shown: fl.text });
    };
    const Avatar = ({ id }: { id: string }) => {
      const lk = RIDER_LOOKS[PERSONAS[id].look] ?? RIDER_LOOKS.main;
      const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
      return (
        <span className="st-ava" style={{ background: hex(lk.jacket), borderColor: SPEAKERS[id]?.color ?? "#fff" }}>
          <i className="hd" style={{ background: hex(lk.skin) }}><i className="hr" style={{ background: hex(lk.hair) }} /></i>
          <i className="tr" style={{ background: hex(lk.trim) }} />
        </span>
      );
    };
    return (
      <div className="st-screen">
        <div className="st-card wide">
          <small>THE CAST</small>
          {open ? (
            <>
              <div className="st-dos">
                <Avatar id={open.id} />
                <div><h2>{open.name}</h2><b>{open.role} · {open.age ? `${open.age} · ` : ""}{open.from}</b><em>speaks {TONGUE_NAME[open.tongue]} (and Pidgin)</em></div>
              </div>
              <p>{open.bio}</p>
              <p><b className="st-k">TRAITS</b> {open.traits.join(" · ")}</p>
              <p><b className="st-k">WANTS</b> {open.wants}</p>
              {open.secret && <p><b className="st-k">SECRET</b> {finished ? open.secret : "▒▒▒▒▒▒▒▒▒▒ (finish the story)"}</p>}
              <p className="st-q">“{open.quote}”</p>
              <button className="st-btn" onClick={() => void hearLine(open.id)}>▶ HEAR THEM</button>
              <button className="st-btn alt" onClick={() => setOpenId(null)}>ALL CHARACTERS</button>
            </>
          ) : (
            <>
              <div className="st-cast">
                {DOSSIER_ORDER.map((id) => unlocked(id) ? (
                  <button key={id} className="st-person" onClick={() => setOpenId(id)}><Avatar id={id} /><b>{PERSONAS[id].name}</b><span>{PERSONAS[id].role}</span></button>
                ) : (
                  <div key={id} className="st-person lock"><span className="st-ava lk">?</span><b>???</b><span>Not met yet</span></div>
                ))}
              </div>
              <button className="st-btn alt" onClick={() => setView({ k: "menu" })}>BACK</button>
            </>
          )}
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
        <button className="st-btn" onClick={() => { void ensureAudio().then((a) => a.tap()); go(started ? Math.min(save.step, SEQUENCE.length - 1) : 0); }}>{started ? "CONTINUE" : "START STORY"}</button>
        {started && <button className="st-btn alt" onClick={() => setView({ k: "chapters" })}>CHAPTERS</button>}
        <button className="st-btn alt" onClick={() => { void ensureAudio(); setView({ k: "cast" }); }}>THE CAST</button>
        <button className="st-btn alt" onClick={() => { void ensureAudio(); setView({ k: "settings" }); }}>VOICES & LANGUAGE</button>
        {started && (confirmNew
          ? <button className="st-btn danger" onClick={() => { setSave(resetStory()); setConfirmNew(false); }}>TAP AGAIN: ERASE PROGRESS</button>
          : <button className="st-btn alt" onClick={() => setConfirmNew(true)}>NEW STORY</button>)}
        <Link className="st-link" href="/">← ABOKI RIDERS</Link>
        <p className="st-note">Works offline · Progress is saved on this device</p>
      </div>
    </div>
  );
}
