// The people of the story: who they are, where they are from, which language they fall back on, and how they sound.
// (Pure data: no three.js. Used by the voice system, the language mixer and the CAST screen.)

export type Tongue = "yo" | "ig" | "ha" | "pcm" | "en";
export const TONGUE_NAME: Record<Tongue, string> = { yo: "Yoruba", ig: "Igbo", ha: "Hausa", pcm: "Naija Pidgin", en: "English" };

/** speech = real device voices (pitch / rate / gender per character); blips = synthesised "voice" so it always works offline */
export type VoiceProfile = {
  gender: "m" | "f";
  pitch: number;   // speech synthesis pitch (0.1 .. 2)
  rate: number;    // speech synthesis rate
  /** synthesised voice: fundamental in Hz, brightness 0..1, wobble 0..1 (shaky / old / nervous) */
  base: number; bright: number; wobble: number;
  /** muffled through a radio / phone */
  filtered?: boolean;
};

export type Persona = {
  id: string; name: string; role: string; age: number; from: string; tongue: Tongue;
  /** rider look used for the 3D model (see RIDER_LOOKS) */
  look: string;
  bio: string; traits: string[]; wants: string; secret?: string; quote: string;
  /** first cutscene (or "-" for always known) where the character appears; the dossier unlocks then */
  first: string;
  voice: VoiceProfile;
};

const V = (gender: "m" | "f", pitch: number, rate: number, base: number, bright = 0.5, wobble = 0.1, filtered = false): VoiceProfile => ({ gender, pitch, rate, base, bright, wobble, filtered });

export const PERSONAS: Record<string, Persona> = {
  aboki: {
    id: "aboki", name: "Aboki", role: "Delivery rider", age: 23, from: "Ojuelegba, Surulere", tongue: "yo", look: "aboki",
    bio: "Rides a borrowed bike for a living and owes half the street. He never opens a bag, never stops, never asks. His father, a rider called Flash, vanished eleven years ago and nobody will say why.",
    traits: ["Stubborn", "Loyal", "Funny when scared", "Whistles when nervous"],
    wants: "Rent, his sister's school fees, and the truth about his father.", secret: "He rides exactly like the man everyone says died.",
    quote: "I no get another option.", first: "cracked_screen", voice: V("m", 0.85, 1.05, 125, 0.55, 0.08)
  },
  kelechi: {
    id: "kelechi", name: "Kelechi", role: "Mechanic, best friend", age: 27, from: "Onitsha, raised in Ojuelegba", tongue: "ig", look: "kelechi",
    bio: "Built half the bikes on the street from scrap and learned on Aboki's father's machine. Big hands, quiet voice, never takes money from Aboki. That should have been the clue.",
    traits: ["Warm", "Guilty", "A perfectionist with a spanner"],
    wants: "To fix what he broke.", secret: "He has been reporting to Boss for years.", quote: "Then ride like your papa.", first: "cracked_screen", voice: V("m", 0.7, 0.95, 100, 0.4, 0.05)
  },
  seyi: {
    id: "seyi", name: "Seyi", role: "Rival rider", age: 24, from: "Surulere", tongue: "yo", look: "seyi",
    bio: "Flashy, fast, loud and funnier than he admits. Races for pride, suya and his older brother Tunde, who has been missing since the Circuit took an interest in him.",
    traits: ["Competitive", "Generous", "Hides fear behind jokes"],
    wants: "To beat Aboki clean, and to bring Tunde home.", quote: "Race me. Loser buy suya.", first: "seyi_arrives", voice: V("m", 1.0, 1.2, 150, 0.7, 0.05)
  },
  bisi: {
    id: "bisi", name: "Bisi", role: "Street informant", age: 25, from: "Yaba", tongue: "yo", look: "bisi",
    bio: "Knows every club owner, every guard and who owes who. Sells information and gives away advice. Watches Aboki the way a rider watches a wet road.",
    traits: ["Sharp", "Curious", "Never lies, just edits"],
    wants: "A way out of the OS crowd that does not end badly.", quote: "Everybody dey ask who you be.", first: "seyi_arrives", voice: V("f", 1.15, 1.12, 230, 0.7, 0.05)
  },
  zara: {
    id: "zara", name: "Zara", role: "The Blue Helmet", age: 26, from: "Kano, lives in Ikeja", tongue: "ha", look: "zara",
    bio: "Rides a spotless blue helmet and tails Aboki for reasons she cannot say. Ex-police dispatcher, best clean line in Lagos, trusts nobody with a phone.",
    traits: ["Calm", "Precise", "Dry humour"],
    wants: "To bring down The Circuit from the inside.", secret: "She is working with Amaka.", quote: "Left lane's clean. Go.", first: "blue_helmet_teaser", voice: V("f", 0.95, 1.0, 195, 0.5, 0.03)
  },
  boss: {
    id: "boss", name: "Boss", role: "Garage owner", age: 58, from: "Lagos Island", tongue: "yo", look: "boss",
    bio: "Soft voice, deep green kaftan, fila always straight. He gave Aboki work, bikes and a sense of belonging. He also spent eleven years waiting for a rider to turn up.",
    traits: ["Patient", "Controlled", "Never raises his voice"],
    wants: "To finish what Flash started.", secret: "He was the voice on the first phone call.", quote: "The first delivery was a question.", first: "who_is_boss", voice: V("m", 0.55, 0.82, 85, 0.35, 0.1)
  },
  baba: {
    id: "baba", name: "Baba Jide", role: "Keeper of the key", age: 66, from: "Yaba", tongue: "yo", look: "baba",
    bio: "Takes delivery of the first bag in the rain and knows the father's code word. Keeps half a brass key on a string around his neck.",
    traits: ["Cautious", "Old school", "Prays before he speaks"],
    wants: "To keep Flash's son out of this.", quote: "Flash don die. Eleven years now.", first: "who_send_you", voice: V("m", 0.65, 0.8, 95, 0.3, 0.2)
  },
  mama: {
    id: "mama", name: "Mama Put", role: "Roadside cook", age: 52, from: "Enugu, runs a buka in Surulere", tongue: "ig", look: "mama",
    bio: "Feeds the whole street on credit and knows each rider by what they eat. Free food from Mama Put means somebody did something right.",
    traits: ["Motherly", "Loud", "Unshockable"],
    wants: "Everybody fed and nobody dead.", quote: "Eat. All of you. Na free today.", first: "word_dey_go_round", voice: V("f", 0.9, 1.0, 185, 0.45, 0.1)
  },
  mimi: {
    id: "mimi", name: "Mimi", role: "OS lounge host", age: 24, from: "Victoria Island", tongue: "pcm", look: "mimi",
    bio: "Hosts the Circuit's after-hours lounge and hears everything. Smiles with her teeth, tells the truth with her eyebrows.",
    traits: ["Glamorous", "Observant", "Not on anyone's side"],
    wants: "Safety.", quote: "You no suppose dey here.", first: "os_lounge", voice: V("f", 1.3, 1.15, 255, 0.8, 0.04)
  },
  shadow: {
    id: "shadow", name: "The Rider", role: "Circuit enforcer", age: 30, from: "Unknown", tongue: "en", look: "shadow",
    bio: "Black helmet, black gear, a very good bike and no face. Appears behind Aboki the way weather appears.",
    traits: ["Silent", "Relentless"], wants: "The bag.", quote: "...", first: "-", voice: V("m", 0.5, 0.9, 80, 0.3, 0.02, true)
  },
  officer: {
    id: "officer", name: "Officer", role: "Checkpoint", age: 40, from: "Lagos", tongue: "pcm", look: "officer",
    bio: "Stands in the road with a torch and a long list of reasons.", traits: ["Bored", "Opportunistic"], wants: "Something small for the road.", quote: "No be circus!", first: "-", voice: V("m", 0.75, 1.0, 110, 0.5, 0.05, true)
  },
  unknown: {
    id: "unknown", name: "Unknown", role: "The voice on the phone", age: 0, from: "?", tongue: "en", look: "boss",
    bio: "Always the same low, flattened voice, always the same four words: fast, clean, no stops.", traits: ["Disguised"], wants: "?", quote: "You dey ride?", first: "-", voice: V("m", 0.45, 0.85, 75, 0.2, 0.02, true)
  },
  alhaji: {
    id: "alhaji", name: "Alhaji Bello", role: "Owner of Aboki's bike", age: 61, from: "Kano, trades in Ojuelegba", tongue: "ha", look: "alhaji",
    bio: "Rents out bikes by the week and collects by the minute. Polite until Tuesday.", traits: ["Patient", "Relentless about money"], wants: "His money by Friday.", quote: "Na my bike, no be your papa property.", first: "cracked_screen", voice: V("m", 0.6, 0.9, 90, 0.35, 0.12, true)
  },
  titi: {
    id: "titi", name: "Titi", role: "Aboki's little sister", age: 15, from: "Ojuelegba", tongue: "yo", look: "titi",
    bio: "Top of her class, on the edge of being sent home over fees. The reason Aboki says yes to everything.",
    traits: ["Brilliant", "Cheeky", "Believes in him"], wants: "To stay in school, and for her brother to stop looking so tired.", quote: "She no go stay for house.", first: "cracked_screen", voice: V("f", 1.55, 1.2, 300, 0.85, 0.05)
  },
  amaka: {
    id: "amaka", name: "Amaka Obi", role: "Investigative journalist", age: 34, from: "Enugu, Lagos Island", tongue: "ig", look: "amaka",
    bio: "Has chased The Circuit for three years with a voice recorder and no budget. She needs the box more than anyone, and she is the only one who will use it well.",
    traits: ["Determined", "Dry", "Brave in a boring way"], wants: "The box on air before sunrise.", quote: "If the box reaches me before sunrise, it ends today.", first: "ikeja_airport", voice: V("f", 1.0, 1.05, 215, 0.55, 0.03)
  },
  father: {
    id: "father", name: "Flash", role: "Aboki's father", age: 52, from: "Ojuelegba", tongue: "yo", look: "main",
    bio: "The best rider Lagos ever saw, and the first man to say no to The Circuit. Wrote one letter and hid it inside a helmet.", traits: ["Fast", "Gentle", "Whistles"], wants: "His son safe.", quote: "Whistle if you are afraid.", first: "boss_vs_aboki", voice: V("m", 0.8, 0.85, 110, 0.4, 0.1, true)
  },
  guard: { id: "guard", name: "Security", role: "Circuit door guard", age: 35, from: "Kaduna", tongue: "ha", look: "guard", bio: "Large, polite, unmovable.", traits: ["Quiet"], wants: "Nothing.", quote: "No go in.", first: "-", voice: V("m", 0.5, 0.9, 78, 0.25, 0.02) },
  mech: { id: "mech", name: "Mechanic", role: "Workshop crew", age: 30, from: "Ojuelegba", tongue: "yo", look: "mech", bio: "Kelechi's apprentice. Talks to engines.", traits: ["Cheerful"], wants: "A raise.", quote: "Oga, e don ready.", first: "-", voice: V("m", 0.85, 1.1, 130, 0.5, 0.05) },
  chairman: {
    id: "chairman", name: "The Chairman", role: "Head of The Circuit", age: 63, from: "Lagos", tongue: "en", look: "chairman",
    bio: "Soft tailoring, hard accounting. Runs every fixed race and every favour in the city from a table where nobody ever raises a glass.", traits: ["Courteous", "Ruthless"], wants: "The box, quietly.", quote: "Give me the box and I'll leave you your life.", first: "m11", voice: V("m", 0.4, 0.8, 68, 0.2, 0.03, true)
  },
  news: { id: "news", name: "Radio", role: "Newsreader", age: 30, from: "Lagos", tongue: "en", look: "amaka", bio: "The voice of the morning.", traits: ["Neutral"], wants: "-", quote: "Breaking.", first: "-", voice: V("f", 1.05, 1.05, 210, 0.6, 0.02, true) },
  ayo: {
    id: "ayo", name: "Ayo", role: "Danfo conductor", age: 22, from: "Oshodi", tongue: "yo", look: "ayo",
    bio: "Hangs off the door of a yellow danfo and shouts the whole route in one breath. Pays the Chairman's boys a daily 'fee' and hates every naira of it.", traits: ["Loud", "Quick", "Kind under the noise"],
    wants: "To stop paying.", quote: "Oshodi! Oshodi! Enter with your change!", first: "oshodi_conductor", voice: V("m", 1.15, 1.3, 170, 0.8, 0.06)
  },
  tunde: {
    id: "tunde", name: "Tunde", role: "Seyi's older brother", age: 29, from: "Ajegunle", tongue: "yo", look: "tunde",
    bio: "Used to ride for The Circuit. Walked away after one race that was never meant to be won honestly, and has been hiding in the lanes of Ajegunle since.", traits: ["Tired", "Decent", "Haunted"],
    wants: "To be left alone.", secret: "He knows how the races are fixed.", quote: "Tell Seyi I'm fine.", first: "ajegunle_tunde", voice: V("m", 0.8, 0.9, 112, 0.4, 0.1)
  },
  ebi: {
    id: "ebi", name: "Pa Ebi", role: "Boatman of Makoko", age: 78, from: "Makoko", tongue: "yo", look: "ebi",
    bio: "Has paddled the lagoon since before the bridges. Remembers a young rider who whistled up, up, down, and who once hid something in a canoe.", traits: ["Gentle", "Slow to speak", "Knows the water"],
    wants: "A quiet lagoon.", quote: "The water remember everything.", first: "makoko_canoe", voice: V("m", 0.55, 0.75, 88, 0.3, 0.25)
  },
  grace: {
    id: "grace", name: "Madam Grace", role: "Headmistress", age: 49, from: "Ikorodu", tongue: "yo", look: "grace",
    bio: "Runs Star of Lagos College like a ship. Believes in Titi, and in fees paid before Monday.", traits: ["Formal", "Fair"], wants: "A full school hall.", quote: "No child will leave this school over money.", first: "titi_speech", voice: V("f", 0.95, 0.95, 190, 0.5, 0.04)
  },
  danjuma: {
    id: "danjuma", name: "Inspector Danjuma", role: "Airport road police", age: 45, from: "Zaria", tongue: "ha", look: "danjuma",
    bio: "One of the few police officers The Circuit could not buy, which is why he is posted on the airport road at night.", traits: ["Honest", "Tired"], wants: "A case that survives court.", quote: "Wallahi, I want that box to live.", first: "ikeja_airport", voice: V("m", 0.6, 0.95, 98, 0.35, 0.04, true)
  },
  narrator: { id: "narrator", name: "", role: "", age: 0, from: "", tongue: "en", look: "boss", bio: "", traits: [], wants: "", quote: "", first: "-", voice: V("f", 1.0, 1.0, 210, 0.5, 0.0) }
};
PERSONAS.zara_helmet = { ...PERSONAS.zara, id: "zara_helmet", name: "Blue Helmet", voice: V("f", 0.8, 1.0, 175, 0.4, 0.03, true) };

export const personaOf = (id: string): Persona => PERSONAS[id] ?? PERSONAS.narrator;
export const voiceOf = (id: string): VoiceProfile => personaOf(id).voice;
export const tongueOf = (id: string): Tongue => personaOf(id).tongue;

/** the people who show up in the CAST screen (in the order they matter to the story) */
export const DOSSIER_ORDER = ["aboki", "kelechi", "titi", "seyi", "bisi", "zara", "boss", "baba", "mama", "alhaji", "ayo", "tunde", "ebi", "grace", "mimi", "amaka", "danjuma", "father", "chairman"];
