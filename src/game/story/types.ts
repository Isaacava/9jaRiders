import type { Env } from "../weather";
import type { StageId } from "./stages";
import type { AltMap } from "./lang";

export type Vec3 = [number, number, number];
export type Mood = "groove" | "tense" | "calm" | "off";

/** Camera for a shot. close / two / over are resolved from the live positions of the characters. */
export type CamSpec =
  | { k: "close"; who: string; d?: number; s?: number; h?: number }
  | { k: "two"; a: string; b: string; d?: number; h?: number; flip?: boolean }
  | { k: "over"; who: string; to: string; d?: number }
  | { k: "wide"; from: Vec3; look: Vec3; fov?: number }
  | { k: "orbit"; look: Vec3; r: number; h: number; a0: number; a1: number; fov?: number };

export type Line = { who: string; text: string; phone?: boolean; mood?: "laugh" | "angry" | "sad"; hold?: number; /** the same line in the speaker's own language (shown in MIX mode) */ alt?: AltMap };

export type Act =
  | { who: string; do: "walk"; to: [number, number]; speed?: number; delay?: number }
  | { who: string; do: "pose"; pose: "stand" | "sit" | "lean" | "arms" | "point" | "slump"; delay?: number }
  | { who: string; do: "face"; to: string | number; delay?: number }
  | { who: string; do: "look"; at: string | null; delay?: number }
  | { who: string; do: "show" | "hide"; delay?: number }
  | { who: string; do: "ride"; from: [number, number]; to: [number, number]; t: number; delay?: number };

export type Shot = {
  cam: CamSpec;
  /** slow camera drift over the shot (metres) */
  drift?: Vec3;
  lines?: Line[];
  /** cut to a close-up of whoever speaks (default: on when a shot has 2+ lines) */
  coverage?: boolean;
  act?: Act[];
  dur?: number;
  fx?: { fade?: "in" | "out" | "black"; flash?: boolean; shake?: number; music?: Mood; sfx?: "phone" | "thunder" | "horn" | "crash" | "finish" | "motif" | "pickup" | "go"; title?: { big: string; small?: string } };
};

export type Cast = {
  id: string; look: string; pos: [number, number]; yaw?: number; faceTo?: string;
  pose?: "stand" | "sit" | "lean" | "arms" | "point" | "slump"; hidden?: boolean;
  /** put the character on a bike (ride-by shots) */
  bike?: string;
};

export type Cutscene = { id: string; title: string; stage: StageId; env: Env; music?: Mood; cast: Cast[]; shots: Shot[] };

export type RivalRole = "racer" | "pursuer" | "leader" | "ally" | "watcher";
export type Rival = { rider: string; bike: string; role: RivalRole; skill?: number; at?: number };
export type Comm = { at: number; who: string; text: string; alt?: AltMap; ms?: number; music?: Mood; siren?: boolean; env?: Env };

export type MissionCfg = {
  id: string; title: string; chapter: string;
  map: string; env: Env; bike: string; rider?: string;
  objective: "deliver" | "race" | "chase" | "follow" | "escape" | "final";
  brief: string; goalText: string;
  timeLimit?: number; needPlace?: number;
  rivals: Rival[];
  traffic?: number;
  integrity?: boolean;
  noCountdown?: boolean; minimalHud?: boolean;
  reward: number;
  comms: Comm[];
  roadblocks?: number[];
  shortcuts?: Array<{ at: number; label: string }>;
  skipAfter?: number;
};

export type Node =
  | { type: "chapter"; title: string; sub: string }
  | { type: "cutscene"; id: string }
  | { type: "mission"; id: string };

export const SPEAKERS: Record<string, { name: string; color: string }> = {
  aboki: { name: "ABOKI", color: "#ffd24d" }, kelechi: { name: "KELECHI", color: "#7fb2ff" }, seyi: { name: "SEYI", color: "#ff8a8a" },
  bisi: { name: "BISI", color: "#ff8fd0" }, zara: { name: "ZARA", color: "#7dffb2" }, zara_helmet: { name: "BLUE HELMET", color: "#6fa8ff" },
  boss: { name: "BOSS", color: "#e0b43a" }, baba: { name: "BABA JIDE", color: "#d8c9a0" }, mama: { name: "MAMA PUT", color: "#ffb36b" },
  mimi: { name: "MIMI", color: "#d6b7ff" }, shadow: { name: "RIDER", color: "#b0b0b8" }, officer: { name: "OFFICER", color: "#9fb4c8" },
  unknown: { name: "UNKNOWN", color: "#c7c7c7" }, alhaji: { name: "OGA BIKE-OWNER", color: "#e8a65d" }, titi: { name: "TITI", color: "#ffc6e0" },
  amaka: { name: "AMAKA", color: "#9be3ff" }, father: { name: "FATHER (LETTER)", color: "#ffe9a8" }, guard: { name: "SECURITY", color: "#b0b0b8" },
  mech: { name: "MECHANIC", color: "#c0c4c8" }, chairman: { name: "THE CHAIRMAN", color: "#ff5c7a" }, news: { name: "RADIO", color: "#9ad1ff" },
  ayo: { name: "AYO", color: "#ff9a6b" }, tunde: { name: "TUNDE", color: "#a8c4ff" }, ebi: { name: "PA EBI", color: "#9fd6c9" }, grace: { name: "MADAM GRACE", color: "#d9a6ff" },
  danjuma: { name: "INSPECTOR DANJUMA", color: "#8fb3ff" },
  narrator: { name: "", color: "#ffffff" }
};
