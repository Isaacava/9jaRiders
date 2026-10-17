// Lagos maps: winding routes (not straight lines) with their own theme and sections.
import { S, type Seg } from "./track";

export type Theme = "mainland" | "market" | "island" | "nightlife" | "port" | "suburb" | "coast" | "waterfront";
export type MapDef = {
  id: string; name: string; district: string; blurb: string;
  length: number;                 // race distance in metres
  segs: Seg[];
  themes: Array<[number, Theme]>; // [from distance, theme] sorted by distance
  water: Array<[number, number]>; // lagoon / bridge stretches (distance ranges)
};

const R = 0.0105; // ~95 m radius corner
const r = 0.0075; // ~130 m radius corner
const g = 0.0042; // gentle sweeper

export const MAPS: Record<string, MapDef> = {
  ojuelegba: {
    id: "ojuelegba", name: "Ojuelegba Rush", district: "Surulere / Yaba", blurb: "Danfos, keke, bukas and a flyover. Lagos at full volume.",
    length: 2800, themes: [[0, "mainland"]], water: [],
    segs: [S(260), S(170, R), S(120), S(190, -R), S(160), S(150, 0, 7), S(170), S(150, 0, -7), S(200, r), S(140, -r), S(300), S(300), S(300)]
  },
  surulere: {
    id: "surulere", name: "Surulere Market Run", district: "Surulere", blurb: "Tight turns through stalls, umbrellas and crowds.",
    length: 2400, themes: [[0, "market"]], water: [],
    segs: [S(160), S(130, R), S(110, -R), S(150, -r), S(120, R), S(170), S(140, R), S(120, -R), S(200), S(160, -r), S(220), S(300), S(300)]
  },
  third_mainland: {
    id: "third_mainland", name: "Third Mainland Bridge", district: "Lagoon crossing", blurb: "Long, fast and exposed, with water on both sides.",
    length: 4200, themes: [[0, "mainland"], [900, "island"]], water: [[760, 3500]],
    segs: [S(300), S(180, r), S(280), S(160, 0, 5), S(420, -g), S(600), S(700), S(500, g), S(600), S(300, 0, -5), S(300, -r), S(200), S(260), S(300), S(300)]
  },
  lekki: {
    id: "lekki", name: "Lekki–Ikoyi Link", district: "Ikoyi / Lekki", blurb: "Glass towers and the cable-stayed link bridge.",
    length: 3600, themes: [[0, "island"]], water: [[900, 2700]],
    segs: [S(300), S(200, r), S(260, -r), S(240), S(500, g), S(500, -g), S(420), S(300), S(240, R), S(200, -R), S(300), S(300), S(300)]
  },
  vi_strip: {
    id: "vi_strip", name: "Victoria Island Strip", district: "Victoria Island", blurb: "Neon, clubs and wide avenues. Night belongs to the riders.",
    length: 2600, themes: [[0, "nightlife"]], water: [],
    segs: [S(240), S(160, r), S(200), S(150, -R), S(140), S(160, R), S(240), S(180, -r), S(300), S(260), S(300), S(300)]
  },
  apapa: {
    id: "apapa", name: "Apapa Port Road", district: "Apapa", blurb: "Containers, trucks and wet tarmac.",
    length: 3200, themes: [[0, "port"]], water: [],
    segs: [S(260), S(200, r), S(220), S(180, -R), S(260), S(200, R), S(300), S(160, -r), S(300), S(240, -g), S(300), S(300)]
  },
  oshodi: {
    id: "oshodi", name: "Oshodi Interchange", district: "Oshodi", blurb: "The busiest motor park in West Africa. Two flyovers, a hundred danfos, one road.",
    length: 3000, themes: [[0, "mainland"], [900, "market"], [2100, "mainland"]], water: [],
    segs: [S(240), S(160, r), S(120), S(170, 0, 6), S(150), S(160, -R), S(130, 0, -6), S(150), S(150, R), S(140, -r), S(200, 0, 6), S(160), S(160, 0, -6), S(300), S(300), S(300)]
  },
  ajegunle: {
    id: "ajegunle", name: "Ajegunle Lanes", district: "Ajegunle (AJ City)", blurb: "Narrow, loud, alive. Zinc roofs, generators and music from every door.",
    length: 2200, themes: [[0, "waterfront"]], water: [],
    segs: [S(140), S(110, R), S(90, -R), S(100, R), S(110, -R), S(120), S(100, R), S(100, R), S(110, -R), S(160), S(120, -r), S(200), S(300)]
  },
  makoko: {
    id: "makoko", name: "Makoko Causeway", district: "Makoko / Iwaya", blurb: "A lagoon road above the stilt houses. Canoes below, lanterns everywhere.",
    length: 3200, themes: [[0, "mainland"], [500, "waterfront"]], water: [[480, 2800]],
    segs: [S(260), S(160, -r), S(180), S(140, 0, 4), S(300, g), S(400, -g), S(300), S(300, g), S(300), S(240, 0, -4), S(200, r), S(200), S(300), S(300)]
  },
  ikeja: {
    id: "ikeja", name: "Ikeja Airport Road", district: "Ikeja", blurb: "Wide, fast, policed. Planes overhead, roadblocks ahead.",
    length: 3400, themes: [[0, "suburb"], [1500, "mainland"], [2500, "suburb"]], water: [],
    segs: [S(300), S(220, g), S(300), S(260, -g), S(300), S(180, R), S(160), S(180, -R), S(260), S(300, g), S(300), S(300), S(300)]
  },
  ikorodu: {
    id: "ikorodu", name: "Ikorodu Road", district: "Ikorodu", blurb: "The long road home. Go-slow, sunset, and a sister waiting.",
    length: 3800, themes: [[0, "mainland"], [1200, "suburb"], [2600, "market"]], water: [],
    segs: [S(300), S(260, g), S(260), S(280, -g), S(320), S(200, r), S(200), S(220, -r), S(300), S(300, g), S(300), S(300, -g), S(300), S(300)]
  },
  lekki_epe: {
    id: "lekki_epe", name: "Lekki–Epe Coast Road", district: "Lekki Coast", blurb: "Palms, sea air and a straight stretch at dawn. A proper race.",
    length: 3400, themes: [[0, "coast"]], water: [],
    segs: [S(300), S(240, g), S(300), S(260, -g), S(300), S(200, r), S(260), S(200, -r), S(300), S(300), S(300), S(300)]
  },
  citywide: {
    id: "citywide", name: "Citywide: The Last Delivery", district: "All of Lagos", blurb: "Mainland to the island with the whole city behind you.",
    length: 6200, themes: [[0, "mainland"], [1100, "market"], [2000, "port"], [2900, "island"], [4300, "nightlife"]], water: [[3050, 4250]],
    segs: [
      S(260), S(180, R), S(130), S(150, 0, 6), S(150), S(130, 0, -6), S(160, -r), S(260), S(170, R), S(130, -R), S(190), S(180, r),
      S(260), S(160, -R), S(220), S(200, r), S(240), S(260, g), S(300), S(500, -g), S(500, g), S(500), S(300, -R), S(240), S(260), S(300), S(300), S(300), S(300)
    ]
  }
};

export const themeAt = (m: MapDef, d: number): Theme => {
  let t = m.themes[0][1];
  for (const [from, th] of m.themes) if (d >= from) t = th;
  return t;
};
export const inWater = (m: MapDef, d: number, pad = 0) => m.water.some(([a, b]) => d >= a - pad && d <= b + pad);
/**
 * Route variants so story missions that share a district do not feel like the same road:
 *   "apapa~r" = driven the other way (corners swap sides, climbs become descents, scenery sections reversed)
 *   "ojuelegba~m" = mirrored (every corner flips)    "vi_strip~rm" = both
 */
function variant(base: MapDef, flags: string, id: string): MapDef {
  const rev = flags.includes("r"), mir = flags.includes("m");
  const total = base.segs.reduce((a, g) => a + g.len, 0);
  const flip = (d: number) => Math.max(0, total - d);
  let segs = base.segs.map((g) => ({ len: g.len, k: (g.k ?? 0) * (mir ? -1 : 1) * (rev ? -1 : 1), rise: (g.rise ?? 0) * (rev ? -1 : 1) }));
  if (rev) segs = segs.reverse();
  let themes = base.themes, water = base.water;
  if (rev) {
    const ends = base.themes.map((t, i) => (i + 1 < base.themes.length ? base.themes[i + 1][0] : base.length));
    themes = base.themes.map((t, i) => [flip(ends[i]), t[1]] as [number, Theme]).sort((a, b) => a[0] - b[0]);
    themes[0] = [0, themes[0][1]];
    water = base.water.map(([a, b]) => [flip(b), flip(a)] as [number, number]).sort((a, b) => a[0] - b[0]);
  }
  return { ...base, id, segs, themes, water, name: base.name + (rev ? " (return)" : " (alt)") };
}

export const getMap = (id: string): MapDef => {
  const [base, flags] = id.split("~");
  const m = MAPS[base] ?? MAPS.ojuelegba;
  return flags ? variant(m, flags, id) : m;
};
