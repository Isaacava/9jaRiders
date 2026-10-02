import { getReadyAssetPath } from "./assetManifest";

export type AssetPackKind = "core" | "route";
export type AssetPackId = "core" | "route-lagos-01";

export type AssetPack = {
  id: AssetPackId;
  kind: AssetPackKind;
  label: string;
  version: number;
  sizeHintMb: number;
  preload: string[];
  optional: string[];
};

const assets = (...ids: string[]) => ids.map(getReadyAssetPath);

export const ASSET_CACHE_VERSION = 10;
export const DEFAULT_ROUTE_PACK_ID: AssetPackId = "route-lagos-01";

export const ASSET_PACKS: AssetPack[] = [
  {
    id: "core",
    kind: "core",
    label: "Core Race",
    version: 9,
    sizeHintMb: 6,
    preload: [
      ...assets(
        "AR-MODELS-RIDERS",
        "AR-MODELS-TRAFFIC",
        "AR-RACE-RIDER-MAIN",
        "AR-RACE-RIDER-ADA",
        "AR-RACE-RIDER-KOBBY",
        "AR-RACE-RIDER-TOBI",
        "AR-RACE-RIDER-CPU-01",
        "AR-RACE-RIDER-CPU-02",
        "AR-RACE-RIDER-CPU-03",
        "AR-RACE-RIDER-CPU-04",
        "AR-RACE-RIDER-CPU-05",
        "AR-RACE-RIDER-CPU-06",
        "AR-RACE-RIDER-CPU-07",
        "AR-RACE-DANFO",
        "AR-RACE-KEKE",
        "AR-RACE-MINIBUS",
        "AR-RACE-SEDAN",
        "AR-RACE-SUV",
        "AR-RACE-VAN",
        "AR-49",
        "AR-50",
        "AR-51",
        "AR-52"
      )
    ],
    optional: []
  },
  {
    id: "route-lagos-01",
    kind: "route",
    label: "Lagos Streets",
    version: 7,
    sizeHintMb: 2,
    preload: [
      ...assets(
        "AR-30",
        "AR-36-SHOP",
        "AR-40-SIGN",
        "AR-41-MARKET",
        "AR-42-PALM",
        "AR-43-POLE",
        "AR-44-BARRIER",
        "AR-45-FUEL",
        "AR-46-WORKSHOP",
        "AR-47-DANFO-STOP",
        "AR-48-BILLBOARD",
        "AR-49-DRAINAGE",
        "AR-50-WALL",
        "AR-ROUTE-SKYLINE",
        "AR-ROUTE-LAGOS-SKY"
      )
    ],
    optional: []
  }
];

export function getAssetPack(id: string | null | undefined) {
  return ASSET_PACKS.find((pack) => pack.id === id) ?? ASSET_PACKS[0];
}

export function isAssetPackId(id: string | null | undefined): id is AssetPackId {
  return Boolean(ASSET_PACKS.some((pack) => pack.id === id));
}
