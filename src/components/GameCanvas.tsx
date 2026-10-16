"use client";

import { useEffect, useRef, useState } from "react";

import type { Env } from "../game/weather";
import type { MissionCfg } from "../game/story/types";
import type { MissionOutcome } from "../game/threeRace";

export default function GameCanvas({
  mode = "solo",
  room,
  player,
  map,
  env,
  mission,
  attempt,
  onMissionEnd
}: {
  mode?: "solo" | "multiplayer" | "demo";
  room?: string;
  player?: string;
  map?: string;
  env?: Env;
  mission?: MissionCfg;
  attempt?: number;
  onMissionEnd?: (o: MissionOutcome) => void;
}) {
  const endRef = useRef(onMissionEnd);
  endRef.current = onMissionEnd;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let game: { destroy: () => void; ready: Promise<void> } | undefined;
    let disposed = false;

    const boot = async () => {
      try {
        // download the baked model pack in parallel with the game code (falls back to generating meshes if it fails)
        const [{ createThreeRace }] = await Promise.all([import("../game/threeRace"), import("../game/models/loadPack").then((m) => m.loadModelPack())]);
        if (disposed || !mountRef.current) return;
        game = createThreeRace(mountRef.current, { mode, room, player, map, env, mission, attempt, onMissionEnd: (o) => endRef.current?.(o) });
        await game.ready;
        if (!disposed) setLoading(false);
      } catch (cause) {
        if (disposed) return;
        console.error(cause);
        setLoading(false);
        setError("The 3D race could not start on this device (WebGL needed).");
      }
    };
    void boot();

    return () => {
      disposed = true;
      game?.destroy();
    };
  }, [mode, room, player, map, mission?.id, attempt]);

  return (
    <div className="game-canvas-shell">
      <div ref={mountRef} className="game-canvas" aria-label="Aboki Riders 3D race" />
      {loading && (
        <div className="game-loading" role="status" aria-live="polite">
          <strong>ABOKI RIDERS</strong>
          <span>LOADING RACE WORLD</span>
        </div>
      )}
      {error && !loading && <div className="game-load-notice" role="status">{error}</div>}
    </div>
  );
}
