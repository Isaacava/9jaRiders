import GameCanvas from "@/components/GameCanvas";
import {
  DEFAULT_ROUTE_PACK_ID,
  isAssetPackId,
  type AssetPackId
} from "@/game/assetPacks";

type PlayPageProps = {
  searchParams: Promise<{
    mode?: string;
    room?: string;
    player?: string;
    route?: string;
  }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const mode =
    params.mode === "multiplayer" && params.room && params.player
      ? "multiplayer"
      : "solo";

  const route: AssetPackId = isAssetPackId(params.route)
    ? params.route
    : DEFAULT_ROUTE_PACK_ID;

  return (
    <main className="race-page">
      <div className="race-stage">
        <GameCanvas mode={mode} route={route} />
      </div>
    </main>
  );
}
