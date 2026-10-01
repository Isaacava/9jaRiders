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

export const ASSET_CACHE_VERSION = 2;
export const DEFAULT_ROUTE_PACK_ID: AssetPackId = "route-lagos-01";

export const ASSET_PACKS: AssetPack[] = [
  {
    id: "core",
    kind: "core",
    label: "Core Race",
    version: 2,
    sizeHintMb: 3,
    preload: [
      ...assets(
        "AR-01",
        "AR-02",
        "AR-03",
        "AR-04",
        "AR-05-BIKE",
        "AR-05",
        "AR-06",
        "AR-07",
        "AR-08",
        "AR-21-DANFO",
        "AR-22-MINIBUS",
        "AR-23-KEKE",
        "AR-24-SEDAN",
        "AR-25",
        "AR-26",
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
    version: 2,
    sizeHintMb: 1,
    preload: [
      ...assets(
        "AR-30",
        "AR-36-SHOP",
        "AR-40-SIGN",
        "AR-41-MARKET",
        "AR-42-PALM",
        "AR-43-POLE",
        "AR-44-BARRIER",
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
