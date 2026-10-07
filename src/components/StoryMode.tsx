"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PROGRESS_KEY = "aboki:story:chapter1:mission1";

export default function StoryMode() {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    try { setComplete(window.localStorage.getItem(PROGRESS_KEY) === "complete"); } catch { /* ignore */ }
  }, []);

  return (
    <main className="story-page">
      <div className="story-shell">
        <Link className="back-link" href="/">← BACK HOME</Link>

        <header className="story-hero">
          <div>
            <span className="story-kicker">ABOKI RIDERS · OFFLINE STORY</span>
            <h1>STORY MODE</h1>
            <p>One rider. One delivery. One bad idea waiting to happen.</p>
          </div>
          <div className="story-offline-badge">DOWNLOAD ONCE<br />PLAY OFFLINE</div>
        </header>

        <section className="chapter-panel">
          <div className="chapter-heading">
            <div>
              <span>CHAPTER 1</span>
              <h2>NO SHINE</h2>
            </div>
            <strong>{complete ? "1 / 1 COMPLETE" : "1 MISSION AVAILABLE"}</strong>
          </div>

          <div className="story-summary">
            <p><b>6:47 AM · LAGOS.</b> Aboki is broke, his bike needs work, and then one caller offers him ₦30,000 for a single delivery.</p>
            <p>Pick up a small black bag. Drop it in Yaba. No questions.</p>
          </div>

          <article className={complete ? "mission-card mission-card--complete" : "mission-card"}>
            <div className="mission-number">MISSION 01</div>
            <div className="mission-main">
              <div>
                <span className="mission-label">THE FIRST JOB</span>
                <h3>₦30,000</h3>
                <p>Ride through Lagos, reach the drop-off, and don't let traffic or distractions make you late.</p>
              </div>
              <div className="mission-meta">
                <span>{complete ? "COMPLETED" : "NEW"}</span>
                <b>OFFLINE</b>
              </div>
            </div>
            <Link className="story-start" href="/story/mission1">
              {complete ? "PLAY AGAIN" : "START MISSION"}
            </Link>
          </article>
        </section>

        <section className="chapter-tease">
          <span>CHAPTER 1</span>
          <h3>More deliveries are coming.</h3>
          <p>The first job is only where the story starts. Characters, races and choices will unlock as the chapter grows.</p>
        </section>
      </div>
    </main>
  );
}
