export type BikeId = "starter" | "speed" | "heavy" | "elite" | "legendary" | "cafe" | "flattrack" | "lightweight" | "dirt";
export type RiderId = "main" | "ada" | "kobby" | "tobi" | "ngozi" | "emeka" | "zainab" | "chidi";
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
  gender: "male" | "female";
};

export const BIKES: BikeDefinition[] = [
  {
    id: "starter",
    name: "Supermoto Single",
    className: "STREET",
    description: "Tall, agile single-cylinder bike for fast lane changes.",
    topSpeed: 150,
    acceleration: 8.1,
    handling: 9.0,
    color: 0x0c7b72
  },
  {
    id: "speed",
    name: "Road Sportbike",
    className: "SPORT",
    description: "Low-slung sportbike for hard launches.",
    topSpeed: 185,
    acceleration: 9.0,
    handling: 9.2,
    color: 0x267bd8
  },
  {
    id: "heavy",
    name: "Sport Tourer",
    className: "TOURER",
    description: "Full-fairing bike with extra stability in traffic.",
    topSpeed: 168,
    acceleration: 7.4,
    handling: 7.4,
    color: 0x8e4b3f
  },
  {
    id: "elite",
    name: "Prototype GP",
    className: "GP",
    description: "Race-bred prototype with an aggressive riding position.",
    topSpeed: 202,
    acceleration: 9.4,
    handling: 8.9,
    color: 0x7d4bd7
  },
  {
    id: "legendary",
    name: "Superbike",
    className: "SUPERBIKE",
    description: "Premium superbike with the highest ceiling in the garage.",
    topSpeed: 220,
    acceleration: 9.7,
    handling: 9.1,
    color: 0xd0a02b
  },
  {
    id: "cafe",
    name: "Cafe Racer",
    className: "CLASSIC",
    description: "Compact cafe racer with quick steering.",
    topSpeed: 158,
    acceleration: 8.5,
    handling: 8.8,
    color: 0x4c83b6
  },
  {
    id: "flattrack",
    name: "Flat-Track Twin",
    className: "TRACK",
    description: "Playful twin built for controlled slides and overtakes.",
    topSpeed: 176,
    acceleration: 8.7,
    handling: 8.3,
    color: 0xd1653c
  },
  {
    id: "lightweight",
    name: "Lightweight Racer",
    className: "LIGHT",
    description: "Small racer that changes direction quickly.",
    topSpeed: 165,
    acceleration: 9.1,
    handling: 9.4,
    color: 0x37a884
  },
  {
    id: "dirt",
    name: "Aboki Dirt 01",
    className: "CUSTOM",
    description: "Project-local 3D dirt bike.",
    topSpeed: 162,
    acceleration: 8.5,
    handling: 8.6,
    color: 0x9f5f31
  }
];

export const RIDERS: RiderDefinition[] = [
  {
    id: "main",
    name: "Mazi",
    style: "BLUE/GREEN",
    personality: "Confident street racer",
    color: 0x0c7b72,
    accent: "#f2c94c",
    gender: "male"
  },
  {
    id: "ada",
    name: "Ada",
    style: "PURPLE/WHITE",
    personality: "Aggressive corner specialist",
    color: 0x8d69e8,
    accent: "#f2d0a9",
    gender: "female"
  },
  {
    id: "kobby",
    name: "Kobby",
    style: "RED/BLACK",
    personality: "Risk-taking attacker",
    color: 0xe45b4f,
    accent: "#eee4d8",
    gender: "male"
  },
  {
    id: "tobi",
    name: "Tobi",
    style: "ORANGE/BLACK",
    personality: "Smooth opportunist",
    color: 0xf08a38,
    accent: "#172024",
    gender: "male"
  },
  {
    id: "ngozi",
    name: "Ngozi",
    style: "ANKARA/ORANGE",
    personality: "Flashy lane-weaver in a gele",
    color: 0xe8731a,
    accent: "#f2c230",
    gender: "female"
  },
  {
    id: "emeka",
    name: "Emeka",
    style: "GREEN/WHITE",
    personality: "Tall, calm and relentless",
    color: 0x008751,
    accent: "#ffffff",
    gender: "male"
  },
  {
    id: "zainab",
    name: "Zainab",
    style: "TEAL/GOLD",
    personality: "Precise, fearless late braker",
    color: 0x0e8f8f,
    accent: "#d9a21b",
    gender: "female"
  },
  {
    id: "chidi",
    name: "Chidi",
    style: "LEATHER/LOCS",
    personality: "Smooth showman with big locs",
    color: 0x6b3f1e,
    accent: "#e0a526",
    gender: "male"
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
