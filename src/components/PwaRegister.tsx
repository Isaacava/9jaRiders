"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { prewarmServer } from "@/game/multiplayer";

const FLAG = "aboki:offline-ready";
const VERSION = "aboki-v8";
const ROUTES = ["/", "/play", "/garage", "/multiplayer", "/story", "/story/mission1"];

type InstallEvent = Event & { prompt: () => Promise<void> };

/** Registers the service worker, pre-downloads the game for offline play and shows offline / install status. */
export default function PwaRegister() {
  const path = usePathname();
  const [online, setOnline] = useState(true);
  const [pct, setPct] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    try { setReady(window.localStorage.getItem(FLAG) === VERSION); } catch { /* ignore */ }
    const on = () => setOnline(true), off = () => setOnline(false);
    const bip = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    if (navigator.onLine) prewarmServer();

    let timer: number | undefined;
    let onMsg: ((e: MessageEvent) => void) | undefined;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then(async () => {
        const reg = await navigator.serviceWorker.ready;
        onMsg = (e: MessageEvent) => {
          const d = e.data as { type?: string; done?: number; total?: number; fail?: number } | null;
          if (!d) return;
          if (d.type === "WARM_PROGRESS") setPct(Math.round((100 * (d.done ?? 0)) / Math.max(1, d.total ?? 1)));
          if (d.type === "WARM_DONE") {
            setPct(null);
            if ((d.fail ?? 0) <= 2) { try { window.localStorage.setItem(FLAG, VERSION); } catch { /* ignore */ } setReady(true); }
          }
        };
        navigator.serviceWorker.addEventListener("message", onMsg);
        let warmed = false;
        try { warmed = window.localStorage.getItem(FLAG) === VERSION; } catch { /* ignore */ }
        if (!warmed) {
          // wait for the page (and the demo race's game chunk) to finish loading, then cache everything it used
          timer = window.setTimeout(() => {
            const seen = performance.getEntriesByType("resource")
              .map((r) => { try { const u = new URL(r.name); return u.origin === location.origin ? u.pathname + u.search : ""; } catch { return ""; } })
              .filter((u) => u.startsWith("/_next/static/"));
            reg.active?.postMessage({ type: "WARM", urls: [...ROUTES, ...seen] });
          }, 4000);
        }
      }).catch(() => { /* SW unavailable (private mode / http): the game still works online */ });
    }
    return () => {
      window.removeEventListener("online", on); window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
      if (timer) window.clearTimeout(timer);
      if (onMsg) navigator.serviceWorker?.removeEventListener("message", onMsg);
    };
  }, []);

  return (
    <>
      {!online && <div className="pwa-banner" role="status">OFFLINE: solo races still work</div>}
      {path === "/" && (pct !== null || ready || installEvent) && (
        <div className="pwa-pill" role="status">
          {pct !== null && <span>PREPARING OFFLINE… {pct}%</span>}
          {pct === null && ready && <span>✓ WORKS OFFLINE</span>}
          {installEvent && (
            <button type="button" onClick={() => { void installEvent.prompt(); setInstallEvent(null); }}>INSTALL APP</button>
          )}
        </div>
      )}
    </>
  );
}
