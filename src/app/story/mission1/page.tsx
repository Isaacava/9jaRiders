import GameCanvas from "@/components/GameCanvas";

export default function StoryMissionPage() {
  return (
    <main className="race-page">
      <div className="race-stage">
        <GameCanvas mode="story" />
      </div>
    </main>
  );
}
