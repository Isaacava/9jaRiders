"use client";

import { useEffect, useRef, useState } from "react";

export default function GameCanvas({
  mode = "solo"
}: {
  mode?: "solo" | "multiplayer";
  route?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let game: { destroy: () => void; ready?: Promise<unknown> } | undefined;
    let disposed = false;

    const boot = async () => {
      try {
        const { createThreeRace } = await import("../game/threeRace");
        if (disposed || !mountRef.current) return;
        game = createThreeRace(mountRef.current, { mode });
        await game.ready;
        if (disposed) return;
        setLoading(false);
      } catch (cause) {
        if (disposed) return;
        console.error(cause);
        setLoading(false);
        setError("The 3D race renderer could not start.");
      }
    };

    void boot();

    return () => {
      disposed = true;
      game?.destroy();
    };
  }, [mode]);

  return (
    <div className="game-canvas-shell">
      <div ref={mountRef} className="game-canvas" aria-label="Aboki Riders 3D race" />
      {loading && (
        <div className="game-loading" role="status" aria-live="polite">
          <strong>ABOKI RIDERS</strong>
          <span>LOADING RACE WORLD</span>
          <small>3D MODELS · LAGOS WORLD · CACHED</small>
        </div>
      )}
      {error && !loading && (
        <div className="game-load-notice" role="status">
          {error}
        </div>
      )}
    </div>
  );
}
