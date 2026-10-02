"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BIKES, RIDERS, DIFFICULTIES, type BikeId, type RiderId, type Difficulty } from "@/game/loadout";
import BikePreview3D from "./BikePreview3D";

const BIKE_KEY = "aboki:bike";
const RIDER_KEY = "aboki:rider";
const DIFFICULTY_KEY = "aboki:difficulty";

export default function Garage() {
  const [bike, setBike] = useState<BikeId>("starter");
  const [rider, setRider] = useState<RiderId>("main");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  useEffect(() => {
    const savedBike = window.localStorage.getItem(BIKE_KEY) as BikeId | null;
    const savedRider = window.localStorage.getItem(RIDER_KEY) as RiderId | null;
    const savedDifficulty = window.localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
    if (savedBike && BIKES.some((item) => item.id === savedBike)) setBike(savedBike);
    if (savedRider && RIDERS.some((item) => item.id === savedRider)) setRider(savedRider);
    if (savedDifficulty && DIFFICULTIES.some((item) => item.id === savedDifficulty)) setDifficulty(savedDifficulty);
  }, []);

  const selectBike = (id: BikeId) => { setBike(id); window.localStorage.setItem(BIKE_KEY, id); };
  const selectRider = (id: RiderId) => { setRider(id); window.localStorage.setItem(RIDER_KEY, id); };
  const selectDifficulty = (id: Difficulty) => { setDifficulty(id); window.localStorage.setItem(DIFFICULTY_KEY, id); };

  const activeBike = BIKES.find((item) => item.id === bike) ?? BIKES[0];
  const activeRider = RIDERS.find((item) => item.id === rider) ?? RIDERS[0];

  return (
    <main className="garage-page">
      <Link className="back-link" href="/">← ABOKI RIDERS</Link>
      <section className="garage-shell">
        <header className="garage-header">
          <div>
            <span className="brand-kicker">YOUR RIDER HQ</span>
            <h1>GARAGE</h1>
            <p>Choose your bike, rider and solo difficulty. Your choices stay on this device.</p>
          </div>
          <Link className="primary-action garage-ride" href="/play?mode=solo">OYÁ, RIDE!</Link>
        </header>

        <section className="loadout-hero">
          <div className="garage-bike-art">
            <div className="garage-bike-shadow" />
            <BikePreview3D bikeId={activeBike.id} className="garage-bike-preview" />
            <Image
              className="garage-bike-rider-image"
              src={`/assets/riders/${activeRider.id}.svg`}
              alt={activeRider.name}
              width={180}
              height={250}
            />
          </div>
          <div className="loadout-copy">
            <span className="loadout-class">{activeBike.className}</span>
            <h2>{activeBike.name}</h2>
            <p>{activeBike.description}</p>
            <div className="stat-stack">
              <div><span>TOP SPEED</span><b>{activeBike.topSpeed.toFixed(1)}</b></div>
              <div><span>ACCEL</span><b>{activeBike.acceleration.toFixed(1)}</b></div>
              <div><span>HANDLING</span><b>{activeBike.handling.toFixed(1)}</b></div>
            </div>
            <div className="selected-rider">
              <span>RIDER</span>
              <strong>{activeRider.name}</strong>
              <small>{activeRider.style} · {activeRider.personality}</small>
            </div>
          </div>
        </section>

        <section className="garage-section">
          <div className="section-heading"><div><span className="brand-kicker">BIKE BAY</span><h2>CHOOSE YOUR RIDE</h2></div><span>{BIKES.length} BIKES</span></div>
          <div className="garage-grid">
            {BIKES.map((item) => (
              <button key={item.id} type="button" className={item.id === bike ? "garage-card garage-card--selected" : "garage-card"} onClick={() => selectBike(item.id)}>
                <div className="mini-bike">
                  <Image className="mini-bike-image" src={`/assets/bikes/${item.id}.svg`} alt="" width={220} height={320} />
                </div>
                <span>{item.className}</span><strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="garage-section">
          <div className="section-heading"><div><span className="brand-kicker">RIDER BAY</span><h2>CHOOSE YOUR RIDER</h2></div><span>{RIDERS.length} RIDERS</span></div>
          <div className="rider-grid">
            {RIDERS.map((item) => (
              <button key={item.id} type="button" className={item.id === rider ? "rider-card rider-card--selected" : "rider-card"} onClick={() => selectRider(item.id)}>
                <div className="rider-avatar">
                  <Image className="rider-avatar-image" src={`/assets/riders/${item.id}.svg`} alt={item.name} width={180} height={250} />
                </div>
                <div><span>{item.style}</span><strong>{item.name}</strong><small>{item.personality}</small></div>
              </button>
            ))}
          </div>
        </section>

        <section className="garage-section">
          <div className="section-heading"><div><span className="brand-kicker">VS COMPUTER</span><h2>DIFFICULTY</h2></div></div>
          <div className="difficulty-grid">
            {DIFFICULTIES.map((item) => (
              <button key={item.id} type="button" className={item.id === difficulty ? "difficulty-card difficulty-card--selected" : "difficulty-card"} onClick={() => selectDifficulty(item.id)}>
                <strong>{item.label}</strong><span>{item.description}</span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
