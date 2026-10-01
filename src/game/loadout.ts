export type BikeId = "starter" | "speed" | "heavy" | "elite" | "legendary";
export type RiderId = "main" | "ada" | "kobby" | "tobi";
export type Difficulty = "easy" | "normal" | "hard";

export type BikeDefinition = {
  id: BikeId;
  name: string;
  className: string;
  description: string;
  topSpeed: number;
  acceleration: number;
  handling: number;
  color: number;
};

export type RiderDefinition = {
  id: RiderId;
  name: string;
  style: string;
  personality: string;
  color: number;
  accent: string;
};

export const BIKES: BikeDefinition[] = [
  {
    id: "starter",
    name: "Street One",
    className: "STARTER",
    description: "Balanced Nigerian street bike. Easy to control.",
    topSpeed: 7.2,
    acceleration: 7.2,
    handling: 8.4,
    color: 0x0c7b72
  },
  {
    id: "speed",
    name: "Racer X",
    className: "SPEED",
    description: "Lightweight racer built for straight-line attacks.",
    topSpeed: 9.1,
    acceleration: 8.8,
    handling: 6.8,
    color: 0x267bd8
  },
  {
    id: "heavy",
    name: "Iron Bull",
    className: "HEAVY",
    description: "Heavy bike with strong stability and impact recovery.",
    topSpeed: 8.0,
    acceleration: 6.6,
    handling: 7.0,
    color: 0x8e4b3f
  },
  {
    id: "elite",
    name: "Volt",
    className: "ELITE",
    description: "High-performance street machine with sharp handling.",
    topSpeed: 9.4,
    acceleration: 8.6,
    handling: 8.8,
    color: 0x7d4bd7
  },
  {
    id: "legendary",
    name: "Golden Ghost",
    className: "LEGENDARY",
    description: "Prestige racer reserved for the fastest riders.",
    topSpeed: 9.9,
    acceleration: 9.4,
    handling: 9.1,
    color: 0xb58a2a
  }
];

export const RIDERS: RiderDefinition[] = [
  {
    id: "main",
    name: "Mazi",
    style: "BLUE/GREEN",
    personality: "Confident street racer",
    color: 0x0c7b72,
    accent: "#e8efe9"
  },
  {
    id: "ada",
    name: "Ada",
    style: "PURPLE/WHITE",
    personality: "Aggressive corner specialist",
    color: 0x8d69e8,
    accent: "#f1eafa"
  },
  {
    id: "kobby",
    name: "Kobby",
    style: "RED/BLACK",
    personality: "Risk-taking attacker",
    color: 0xe45b4f,
    accent: "#ffe5df"
  },
  {
    id: "tobi",
    name: "Tobi",
    style: "ORANGE/BLACK",
    personality: "Smooth opportunist",
    color: 0xf08a38,
    accent: "#fff0db"
  }
];

export const DIFFICULTIES: Array<{
  id: Difficulty;
  label: string;
  description: string;
}> = [
  { id: "easy", label: "EASY", description: "CPU riders make more mistakes." },
  { id: "normal", label: "NORMAL", description: "Balanced arcade competition." },
  { id: "hard", label: "HARD", description: "Fast, aggressive CPU riders." }
];

export function getBike(id: string | null | undefined) {
  return BIKES.find((bike) => bike.id === id) ?? BIKES[0];
}

export function getRider(id: string | null | undefined) {
  return RIDERS.find((rider) => rider.id === id) ?? RIDERS[0];
}

export function getDifficulty(id: string | null | undefined): Difficulty {
  return DIFFICULTIES.some((difficulty) => difficulty.id === id)
    ? (id as Difficulty)
    : "normal";
}
