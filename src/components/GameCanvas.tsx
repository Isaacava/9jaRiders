"use client";

import { useEffect, useRef, useState } from "react";
import type { createGame } from "../game/createGame";
import {
  DEFAULT_ROUTE_PACK_ID,
  getAssetPack,
  type AssetPackId
} from "../game/assetPacks";
import { prepareAssetPacks } from "../game/assetCache";

export default function GameCanvas({
  mode = "solo",
  route = DEFAULT_ROUTE_PACK_ID
}: {
  mode?: "solo" | "multiplayer";
  route?: AssetPackId;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("PREPARING RACE KIT");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let game: ReturnType<typeof createGame> | undefined;
    let disposed = false;

    const boot = async () => {
      try {
        const routePack = getAssetPack(route);

        setLoadingText(`LOADING ${routePack.label.toUpperCase()}`);
        await prepareAssetPacks(["core", route]);

        if (disposed || !mountRef.current) return;

        const { createGame: startGame } = await import("../game/createGame");
        if (disposed || !mountRef.current) return;

        game = startGame(mountRef.current, { mode });
        setLoading(false);
      } catch {
        if (disposed) return;

        setError("Asset preparation skipped. Starting with the local fallback kit.");
        setLoadingText("STARTING RACE");

        try {
          const { createGame: startGame } = await import("../game/createGame");
          if (!disposed && mountRef.current) {
            game = startGame(mountRef.current, { mode });
            setLoading(false);
          }
        } catch {
          setLoading(false);
          setError("The race renderer could not start.");
        }
      }
    };

    void boot();

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [mode, route]);

  return (
    <div className="game-canvas-shell">
      <div ref={mountRef} className="game-canvas" aria-label="Aboki Riders race" />
      {loading && (
        <div className="game-loading" role="status" aria-live="polite">
          <strong>ABOKI RIDERS</strong>
          <span>{loadingText}</span>
          <small>FIRST TIME ONLY · CACHED AFTERWARD</small>
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
