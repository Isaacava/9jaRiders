import GameCanvas from "@/components/GameCanvas";

type PlayPageProps = {
  searchParams: Promise<{
    mode?: string;
    room?: string;
    player?: string;
  }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const mode =
    params.mode === "multiplayer" && params.room && params.player
      ? "multiplayer"
      : "solo";

  return (
    <main className="race-page">
      <div className="race-stage">
        <GameCanvas mode={mode} />
      </div>
    </main>
  );
}
