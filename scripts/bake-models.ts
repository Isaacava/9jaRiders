// Bakes the procedural rider / bike / car meshes into public/models/pack.<hash>.bin (+ pack.json).
// Run: npm run bake      (re-run whenever the shapes in src/game/models/*Shape.ts change)
import * as fs from "fs";
import * as path from "path";
import { buildBikeParts, SPEC, type BikeStyle } from "../src/game/models/bikeShape";
import { encodePack, type BakeMesh, type PackManifest } from "../src/game/models/pack";
import { buildRiderShape, RIDER_LOOKS } from "../src/game/models/riderShape";
import { buildCarShape, TRAFFIC_SIZE, type TrafficKind } from "../src/game/models/trafficShape";

const entries: Array<{ key: string; tintable?: boolean; meshes: BakeMesh[] }> = [];
const seen = new Set<string>();
for (const look of Object.values(RIDER_LOOKS)) {
  const k = `rider:${look.female}:${look.build}`;
  if (seen.has(k)) continue;
  seen.add(k);
  const s = buildRiderShape(look.female, look.build);
  entries.push({ key: k, meshes: [{ name: "body", mesh: s.mesh, skinIndex: s.skinIndex, skinWeight: s.skinWeight }] });
}
for (const style of Object.keys(SPEC) as BikeStyle[]) {
  const p = buildBikeParts(style);
  entries.push({ key: `bike:${style}`, meshes: [{ name: "body", mesh: p.body }, { name: "seat", mesh: p.seat }, { name: "engine", mesh: p.engine }] });
}
for (const kind of Object.keys(TRAFFIC_SIZE) as TrafficKind[]) {
  const c = buildCarShape(kind);
  entries.push({ key: `car:${kind}`, tintable: c.tintable, meshes: [{ name: "body", mesh: c.mesh, colors: c.colors }] });
}

const { entries: man, bin } = encodePack(entries);
let h = 2166136261;
for (let i = 0; i < bin.length; i += 7) h = Math.imul(h ^ bin[i], 16777619);
const file = `pack.${(h >>> 0).toString(16)}.bin`;
const dir = path.join(__dirname, "..", "..", "public", "models");
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (/^pack\..*\.bin$/.test(f)) fs.unlinkSync(path.join(dir, f));
fs.writeFileSync(path.join(dir, file), bin);
const manifest: PackManifest = { version: 1, file, bytes: bin.length, entries: man };
fs.writeFileSync(path.join(dir, "pack.json"), JSON.stringify(manifest));
console.log(`baked ${entries.length} models -> ${file} (${(bin.length / 1024).toFixed(0)} KB)`);
