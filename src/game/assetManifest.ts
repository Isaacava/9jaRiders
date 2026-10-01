export type AssetCategory =
  | "brand"
  | "riders"
  | "bikes"
  | "traffic"
  | "road"
  | "buildings"
  | "props"
  | "powerups"
  | "vfx"
  | "ui"
  | "environments"
  | "animation";

export type AssetStatus = "planned" | "prototype" | "ready";

export type AssetDefinition = {
  id: string;
  category: AssetCategory;
  path: string;
  status: AssetStatus;
};

export const ASSET_MANIFEST: AssetDefinition[] = [
  { id: "AR-01", category: "bikes", path: "/assets/bikes/starter.svg", status: "ready" },
  { id: "AR-02", category: "bikes", path: "/assets/bikes/speed.svg", status: "ready" },
  { id: "AR-03", category: "bikes", path: "/assets/bikes/heavy.svg", status: "ready" },
  { id: "AR-04", category: "bikes", path: "/assets/bikes/elite.svg", status: "ready" },
  { id: "AR-05-BIKE", category: "bikes", path: "/assets/bikes/legendary.svg", status: "ready" },
  { id: "AR-01-REAR3Q", category: "bikes", path: "/assets/bikes/hero-rear-3q.svg", status: "ready" },

  { id: "AR-05", category: "riders", path: "/assets/riders/main.svg", status: "ready" },
  { id: "AR-06", category: "riders", path: "/assets/riders/ada.svg", status: "ready" },
  { id: "AR-07", category: "riders", path: "/assets/riders/kobby.svg", status: "ready" },
  { id: "AR-08", category: "riders", path: "/assets/riders/tobi.svg", status: "ready" },
  { id: "AR-05-REAR", category: "riders", path: "/assets/riders/main-rear.svg", status: "ready" },
  { id: "AR-09", category: "riders", path: "/assets/riders/cpu-01.svg", status: "ready" },
  { id: "AR-10", category: "riders", path: "/assets/riders/cpu-02.svg", status: "ready" },
  { id: "AR-11", category: "riders", path: "/assets/riders/cpu-03.svg", status: "ready" },
  { id: "AR-12", category: "riders", path: "/assets/riders/cpu-04.svg", status: "ready" },
  { id: "AR-13", category: "riders", path: "/assets/riders/cpu-05.svg", status: "ready" },
  { id: "AR-14", category: "riders", path: "/assets/riders/cpu-06.svg", status: "ready" },
  { id: "AR-15", category: "riders", path: "/assets/riders/cpu-07.svg", status: "ready" },

  { id: "AR-21-DANFO", category: "traffic", path: "/assets/traffic/danfo.svg", status: "ready" },
  { id: "AR-22-MINIBUS", category: "traffic", path: "/assets/traffic/minibus.svg", status: "ready" },
  { id: "AR-23-KEKE", category: "traffic", path: "/assets/traffic/keke.svg", status: "ready" },
  { id: "AR-24-SEDAN", category: "traffic", path: "/assets/traffic/sedan.svg", status: "ready" },
  { id: "AR-25", category: "traffic", path: "/assets/traffic/suv.svg", status: "ready" },
  { id: "AR-26", category: "traffic", path: "/assets/traffic/van.svg", status: "ready" },

  { id: "AR-49", category: "powerups", path: "/assets/powerups/nitro.svg", status: "ready" },
  { id: "AR-50", category: "powerups", path: "/assets/powerups/shield.svg", status: "ready" },
  { id: "AR-51", category: "powerups", path: "/assets/powerups/surge.svg", status: "ready" },
  { id: "AR-52", category: "powerups", path: "/assets/powerups/mega.svg", status: "ready" },

  { id: "AR-30", category: "road", path: "/assets/road/road-texture.svg", status: "ready" },
  { id: "AR-36-SHOP", category: "props", path: "/assets/props/shop.svg", status: "ready" },
  { id: "AR-40-SIGN", category: "props", path: "/assets/props/route-sign.svg", status: "ready" },
  { id: "AR-41-MARKET", category: "props", path: "/assets/props/market-stall.svg", status: "ready" },
  { id: "AR-42-PALM", category: "props", path: "/assets/props/palm.svg", status: "ready" },
  { id: "AR-43-POLE", category: "props", path: "/assets/props/utility-pole.svg", status: "ready" },
  { id: "AR-44-BARRIER", category: "props", path: "/assets/props/barrier.svg", status: "ready" },
  { id: "AR-45-FUEL", category: "props", path: "/assets/props/fuel-station.svg", status: "ready" },
  { id: "AR-46-WORKSHOP", category: "props", path: "/assets/props/mechanic-workshop.svg", status: "ready" },
  { id: "AR-47-DANFO-STOP", category: "props", path: "/assets/props/danfo-stop.svg", status: "ready" },
  { id: "AR-48-BILLBOARD", category: "props", path: "/assets/props/billboard.svg", status: "ready" },
  { id: "AR-49-DRAINAGE", category: "props", path: "/assets/props/drainage.svg", status: "ready" },
  { id: "AR-50-WALL", category: "props", path: "/assets/props/concrete-wall.svg", status: "ready" },

  { id: "AR-ROUTE-SKYLINE", category: "environments", path: "/assets/environments/lagos-skyline.svg", status: "ready" },
  { id: "AR-ROUTE-LAGOS-SKY", category: "environments", path: "/assets/environments/route-lagos-sky.svg", status: "ready" }
];

const ASSET_BY_ID = new Map(ASSET_MANIFEST.map((asset) => [asset.id, asset]));

export function getAsset(id: string) {
  return ASSET_BY_ID.get(id);
}

export function getAssetPath(id: string) {
  const asset = getAsset(id);
  if (!asset) throw new Error(`Unknown asset manifest id: ${id}`);
  return asset.path;
}

export function getReadyAssetPath(id: string) {
  const asset = getAsset(id);
  if (!asset) throw new Error(`Unknown asset manifest id: ${id}`);
  if (asset.status !== "ready") {
    throw new Error(`Asset ${id} is not runtime-ready (status: ${asset.status})`);
  }
  return asset.path;
}