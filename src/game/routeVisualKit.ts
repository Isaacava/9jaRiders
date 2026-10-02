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
    id: "bike-supermoto",
    category: "bike",
    name: "Supermoto single — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-supermoto-dda61d95",
    license: "CC0",
    intendedUse: "Starter rider mount and all-purpose city racing bike."
  },
  {
    id: "bike-road-sport",
    category: "bike",
    name: "Road sportbike — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-road-sportbike-e1418015",
    license: "CC0",
    intendedUse: "High-speed sport bike."
  },
  {
    id: "bike-sport-tourer",
    category: "bike",
    name: "Full-fairing sport tourer — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-sport-tourer-2a48833e",
    license: "CC0",
    intendedUse: "Longer, heavier rider mount."
  },
  {
    id: "bike-prototype-gp",
    category: "bike",
    name: "Prototype grand prix bike — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-prototype-grand-pri-91d58e89",
    license: "CC0",
    intendedUse: "Low-tuck race bike."
  },
  {
    id: "bike-superbike",
    category: "bike",
    name: "Superbike — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-superbike-d02e949c",
    license: "CC0",
    intendedUse: "Premium race bike."
  },
  {
    id: "bike-cafe",
    category: "bike",
    name: "Cafe racer — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-cafe-racer-26dfbfc9",
    license: "CC0",
    intendedUse: "Classic street bike."
  },
  {
    id: "bike-scrambler",
    category: "bike",
    name: "Twin-cylinder scrambler — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-scrambler-0b11660f",
    license: "CC0",
    intendedUse: "Raised mixed-surface bike."
  },
  {
    id: "bike-commuter",
    category: "bike",
    name: "Step-through commuter scooter — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-commuter-scooter-6889697c",
    license: "CC0",
    intendedUse: "Compact city commuter."
  },
  {
    id: "bike-mini",
    category: "bike",
    name: "Compact minibike — 3DAssets.dev",
    url: "https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-minibike-43416fe5",
    license: "CC0",
    intendedUse: "Small-format bike for playful race variants."
  },
  {
    id: "bike-dirt-local",
    category: "bike",
    name: "Aboki Riders dirt bike",
    url: "/assets/dirt-bike.glb",
    license: "CC0",
    intendedUse: "Local authored source supplied for the project."
  },
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
