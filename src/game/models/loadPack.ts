import { installPack, type PackManifest } from "./pack";

let started: Promise<boolean> | null = null;

/** Fetch + install the pre-baked model pack once. Resolves false (and the game falls back to generating meshes) on any failure. */
export function loadModelPack(): Promise<boolean> {
  if (started) return started;
  started = (async () => {
    try {
      const mr = await fetch("/models/pack.json", { cache: "no-cache" });
      if (!mr.ok) return false;
      const man = (await mr.json()) as PackManifest;
      const br = await fetch(`/models/${man.file}`, { cache: "force-cache" });
      if (!br.ok) return false;
      installPack(man, await br.arrayBuffer());
      return true;
    } catch {
      started = null; // allow a retry next time (e.g. back online)
      return false;
    }
  })();
  return started;
}
