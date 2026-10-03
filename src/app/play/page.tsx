import GameCanvas from "@/components/GameCanvas";

type PlayPageProps = {
  searchParams: Promise<{ mode?: string; room?: string; player?: string }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const multiplayer = params.mode === "multiplayer" && params.room && params.player;

  return (
    <main className="race-page">
      <div className="race-stage">
        <GameCanvas
          mode={multiplayer ? "multiplayer" : "solo"}
          room={multiplayer ? params.room : undefined}
          player={multiplayer ? params.player : undefined}
        />
      </div>
    </main>
  );
}
