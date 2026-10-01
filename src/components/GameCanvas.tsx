"use client";

import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("../game/createGame").then(({ createGame }) => {
      if (!mountRef.current || disposed) return;
      game = createGame(mountRef.current);
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={mountRef} className="game-canvas" aria-label="Aboki Riders preview" />;
}
