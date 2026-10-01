export type ExternalAssetSource = {
  id: string;
  category: "bike" | "road" | "city" | "sky";
  name: string;
  url: string;
  license: "CC0";
  intendedUse: string;
};

export const ROUTE_VISUAL_SOURCES: ExternalAssetSource[] = [
  {
    id: "bike-road-sport",
    category: "bike",
    name: "Road sportbike — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-road-sportbike-e1418015",
    license: "CC0",
    intendedUse: "3D source model for Hero/Speed bike renders and alternate camera views."
  },
  {
    id: "bike-superbike",
    category: "bike",
    name: "Superbike — 3DAssets.dev",
    url: "https://3dassets.dev/packs/motorcycle-racing-and-street-bikes",
    license: "CC0",
    intendedUse: "3D source family for premium bikes."
  },
  {
    id: "city-roads",
    category: "road",
    name: "City Kit (Roads) — Kenney",
    url: "https://kenney.nl/assets/city-kit-roads",
    license: "CC0",
    intendedUse: "Road geometry, signs, traffic-light and city-road foundations."
  },
  {
    id: "city-suburban",
    category: "city",
    name: "City Kit (Suburban) — Kenney",
    url: "https://kenney.nl/assets/city-kit-suburban",
    license: "CC0",
    intendedUse: "Reusable building/environment foundations to customize into Nigerian roadside sets."
  },
  {
    id: "city-industrial",
    category: "city",
    name: "City Kit (Industrial) — Kenney",
    url: "https://kenney.nl/assets/city-kit-industrial",
    license: "CC0",
    intendedUse: "Industrial route buildings, warehouses and construction areas."
  },
  {
    id: "sky-clear",
    category: "sky",
    name: "Hausdorf Clear Sky — Poly Haven",
    url: "https://polyhaven.com/a/hausdorf_clear_sky",
    license: "CC0",
    intendedUse: "Lighting/sky reference for the first daytime route."
  }
];

export const LAGOS_ROUTE_01 = {
  id: "route-lagos-01",
  name: "Ojuelegba → Yaba",
  palette: {
    asphalt: 0x23272b,
    shoulder: 0x9a8064,
    shopWall: 0xd7a25a,
    concrete: 0xb7b3aa,
    vegetation: 0x4c7c4a,
    sign: 0xf2c14e,
    danfo: 0xe0bd2d
  },
  sections: [
    "road-straight",
    "road-gentle-right",
    "road-straight",
    "market-edge",
    "road-gentle-left",
    "finish"
  ],
  identityProps: [
    "roadside-shop",
    "market-stall",
    "utility-pole",
    "palm-tree",
    "blank-billboard",
    "drainage"
  ]
} as const;
