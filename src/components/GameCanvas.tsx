"use client";

import { useEffect, useRef } from "react";
import type { createGame } from "../game/createGame";

export default function GameCanvas({ mode = "solo" }: { mode?: "solo" | "multiplayer" }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: ReturnType<typeof createGame> | undefined;
    let disposed = false;

    void import("../game/createGame").then(({ createGame: startGame }) => {
      if (!mountRef.current || disposed) return;
      game = startGame(mountRef.current, { mode });
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [mode]);

  return <div ref={mountRef} className="game-canvas" aria-label="Aboki Riders preview" />;
}
