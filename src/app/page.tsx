import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";

export default function Home() {
  return (
    <main className="game-shell">
      <section className="home-screen">
        <header className="brand-lockup" aria-label="Aboki Riders">
          <span className="brand-kicker">9JA STREET RACING</span>
          <h1>ABOKI RIDERS</h1>
          <p>Ride the road. Beat your people.</p>
        </header>

        <div className="game-preview">
          <GameCanvas mode="demo" />
          <div className="preview-hud">
            <div>
              <span>ROUTE</span>
              <strong>OJUELEGBA → YABA</strong>
            </div>
            <div className="preview-multiplier">
              <span>MULTIPLIER</span>
              <strong>1.00×</strong>
            </div>
          </div>
        </div>

        <div className="home-actions">
          <Link className="primary-action" href="/play">
            OYÁ, RIDE!
          </Link>

          <div className="secondary-actions">
            <Link className="secondary-link story-link" href="/story">STORY MODE</Link>
            <Link className="secondary-link" href="/garage">GARAGE</Link>
            <Link className="secondary-link" href="/multiplayer">MULTIPLAYER</Link>
          </div>
        </div>

        <p className="home-note">
          Story Mode is a single-player Lagos adventure you can download once
          and play offline. Multiplayer still needs internet.
        </p>
      </section>
    </main>
  );
}
