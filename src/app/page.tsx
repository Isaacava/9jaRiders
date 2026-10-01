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
          <GameCanvas />
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
          <button className="primary-action" type="button">
            OYÁ, RIDE!
          </button>

          <div className="secondary-actions">
            <button type="button">GARAGE</button>
            <button type="button">LEADERS</button>
          </div>
        </div>

        <p className="home-note">
          Multiplayer street racing for 2–8 riders. Minimal traffic, risky
          overtakes and special items.
        </p>
      </section>
    </main>
  );
}
