export type AssetPackId = "core" | "route-lagos-01" | "route-expressway" | "route-market" | "route-night" | "route-rain" | "vehicles-extra" | "riders-extra";

export type AssetPack = {
  id: AssetPackId;
  label: string;
  version: number;
  sizeHintMb: number;
  preload: string[];
  optional: string[];
};

export const ASSET_PACKS: AssetPack[] = [
  {
    id: "core",
    label: "Core Race",
    version: 1,
    sizeHintMb: 10,
    preload: [
      "/assets/bikes/starter.svg",
      "/assets/bikes/speed.svg",
      "/assets/bikes/heavy.svg",
      "/assets/bikes/elite.svg",
      "/assets/bikes/legendary.svg",
      "/assets/riders/main.svg",
      "/assets/riders/ada.svg",
      "/assets/riders/kobby.svg",
      "/assets/riders/tobi.svg",
      "/assets/traffic/danfo.svg",
      "/assets/traffic/keke.svg",
      "/assets/traffic/sedan.svg",
      "/assets/traffic/minibus.svg",
      "/assets/traffic/suv.svg",
      "/assets/traffic/van.svg",
      "/assets/powerups/nitro.svg",
      "/assets/powerups/shield.svg",
      "/assets/powerups/surge.svg",
      "/assets/powerups/mega.svg",
      "/assets/road/road-texture.svg",
      "/assets/environments/lagos-skyline.svg",
      "/assets/props/route-sign.svg",
      "/assets/props/market-stall.svg",
      "/assets/props/utility-pole.svg",
      "/assets/props/shop.svg",
      "/assets/props/palm.svg",
      "/assets/props/barrier.svg",
      "/assets/environments/route-lagos-sky.svg",
      "/assets/bikes/hero-rear-3q.svg",
      "/assets/riders/main-rear.svg"
    ],
    optional: []
  },
  {
    id: "route-lagos-01",
    label: "Lagos Streets",
    version: 1,
    sizeHintMb: 7,
    preload: [
      "/assets/environments/route-lagos-sky.svg"
    ],
    optional: [
      "/assets/props/shop.svg",
      "/assets/props/palm.svg",
      "/assets/props/barrier.svg"
    ]
  },
  {
    id: "route-expressway",
    label: "Expressway Rush",
    version: 1,
    sizeHintMb: 6,
    preload: [
      "/assets/road/bridge.webp",
      "/assets/road/barrier.webp"
    ],
    optional: ["/assets/buildings/warehouse.webp"]
  },
  {
    id: "route-market",
    label: "Market Dash",
    version: 1,
    sizeHintMb: 6,
    preload: ["/assets/road/intersection.webp"],
    optional: ["/assets/props/umbrella.webp", "/assets/props/market-stall.webp"]
  },
  {
    id: "route-night",
    label: "Night Run",
    version: 1,
    sizeHintMb: 5,
    preload: ["/assets/environments/night-sky.webp"],
    optional: ["/assets/vfx/neon-glow.webp"]
  },
  {
    id: "route-rain",
    label: "Rain Rush",
    version: 1,
    sizeHintMb: 5,
    preload: ["/assets/vfx/rain.webp", "/assets/vfx/road-splash.webp"],
    optional: ["/assets/environments/rain-sky.webp"]
  },
  {
    id: "vehicles-extra",
    label: "Extra Vehicles",
    version: 1,
    sizeHintMb: 5,
    preload: ["/assets/traffic/minibus.webp", "/assets/traffic/keke.webp", "/assets/traffic/sedan.webp"],
    optional: ["/assets/traffic/suv.webp", "/assets/traffic/van.webp"]
  },
  {
    id: "riders-extra",
    label: "Extra Riders",
    version: 1,
    sizeHintMb: 4,
    preload: [
      "/assets/riders/cpu-01.webp",
      "/assets/riders/cpu-02.webp",
      "/assets/riders/cpu-03.webp"
    ],
    optional: [
      "/assets/riders/cpu-04.webp",
      "/assets/riders/cpu-05.webp",
      "/assets/riders/cpu-06.webp",
      "/assets/riders/cpu-07.webp"
    ]
  }
];
