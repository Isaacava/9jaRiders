// New districts and their own stories: Oshodi, Ajegunle, Makoko, Ikeja and Ikorodu.
// Key lines carry `alt` text in the speaker's own language (Yoruba / Igbo / Hausa) with an English meaning and a phonetic
// spelling for speech engines. Merged into the main script by script.ts.
import type { Cast, Comm, Cutscene, MissionCfg, Shot } from "./types";
import type { AltMap } from "./lang";

const C = (id: string, look: string, x: number, z: number, faceTo?: string, pose?: Cast["pose"], extra: Partial<Cast> = {}): Cast => ({ id, look, pos: [x, z], faceTo, pose, ...extra });
const two = (a: string, b: string, d = 3.2) => ({ k: "two" as const, a, b, d });
const close = (who: string, d = 1.25) => ({ k: "close" as const, who, d });
const wide = (from: [number, number, number], look: [number, number, number], fov = 46) => ({ k: "wide" as const, from, look, fov });
const L = (who: string, text: string, extra: { phone?: boolean; mood?: "laugh" | "angry" | "sad"; hold?: number; alt?: AltMap } = {}) => ({ who, text, ...extra });
const yo = (t: string, g: string, say: string): AltMap => ({ yo: { t, g, say } });
const ig = (t: string, g: string, say: string): AltMap => ({ ig: { t, g, say } });
const ha = (t: string, g: string, say: string): AltMap => ({ ha: { t, g, say } });
const title = (big: string, small = "", dur = 3): Shot => ({ cam: wide([0, 1.6, 6], [0, 1.4, 0]), dur, fx: { fade: "in", title: { big, small } } });

export const CUTSCENES2: Record<string, Cutscene> = {
  // ================================================================ OSHODI: the conductor's debt
  oshodi_conductor: {
    id: "oshodi_conductor", title: "Oshodi · 9:40 AM", stage: "motorpark", env: { time: "day", weather: "haze" }, music: "groove",
    cast: [C("aboki", "aboki", -1.6, 3.2, "ayo", "stand"), C("ayo", "ayo", 1.4, 2.4, "aboki", "stand")],
    shots: [
      title("OSHODI", "THE BUSIEST PARK IN WEST AFRICA", 2.6),
      { cam: wide([-5, 1.7, 8.5], [0, 1.4, 2], 44), act: [{ who: "ayo", do: "pose", pose: "arms" }], lines: [
        L("ayo", "Oshodi! Oshodi! Mile Two! Enter with your change!", { alt: yo("Oṣòdì! Oṣòdì! Mile Two! Ẹ wọlé, ẹ mú chénjì yín dání!", "Oshodi! Mile Two! Get in, bring your change!", "Oh-sho-dee! Oh-sho-dee! Mile Two! Eh waw-leh, eh moo chen-jee yeen dah-nee!") }),
        L("aboki", "Ayo! Why you dey shout like that for ten o'clock?"),
        L("ayo", "Because noon dey come. Chairman's boys go collect 'park fee'. Every day. Two thousand per danfo.", { alt: yo("Nítorí pé ọ̀sán ń bọ̀. Àwọn ọmọ Chairman yóò wá gba owó 'park'. Ojoojúmọ́.", "Because noon is coming. The Chairman's boys collect 'park fee'. Every single day.", "Nee-taw-ree pay aw-sahn n baw. Ah-wawn aw-maw Chairman yoh-woh wah gbah oh-woh park. Aw-jaw-aw-jaw-moh.") }),
        L("aboki", "Chairman? Which Chairman?"),
        L("ayo", "(He lowers his voice.) The one wey no get face. Na him own Oshodi, Mile Two, half of Apapa. Even the police dey greet am for phone."),
      ] },
      { cam: two("aboki", "ayo", 3.0), lines: [
        L("ayo", "Abeg, my mama medicine don finish. The pharmacy for Ikeja close by one. If dem see me leave park, dem go think say I dey run."),
        L("ayo", "So you go carry am. (He holds up a small white nylon bag.) No be black bag. I swear.", { alt: yo("Nítorí náà, ìwọ ni yóò gbé e. (Ó gbé àpò funfun kékeré sókè.) Kì í ṣe àpò dúdú. Mo búra.", "So you'll carry it. (He lifts a small white bag.) It's not a black bag. I swear.", "Nee-taw-ree nah-ah, ee-waw nee yoh gbeh eh. Kee ee shay ah-paw doo-doo. Moh boo-rah.") }),
        L("aboki", "Black bag don spoil my taste for bags. (He takes it.) Which mama?"),
        L("ayo", "Mama Ayo. Everybody for Agege know am. Tell am make she drink am before night."),
        L("aboki", "(Across the road a black SUV idles with its engine running. Nobody gets out.) Ayo... who dey that car?"),
        L("ayo", "(He doesn't look.) Park fee. Ride, Aboki. RIDE.", { mood: "angry" }),
      ], fx: { sfx: "horn" } },
    ]
  },
  // ================================================================ AJEGUNLE: Seyi's brother
  ajegunle_call: {
    id: "ajegunle_call", title: "Surulere · Dusk", stage: "street", env: { time: "dusk", weather: "clear" }, music: "tense",
    cast: [C("aboki", "aboki", -1.6, -1.4, "seyi", "stand"), C("seyi", "seyi", 2.0, -1.2, "aboki", "stand")],
    shots: [
      { cam: wide([-4, 1.6, 6], [0, 1.4, -1.4], 44), fx: { fade: "in" }, lines: [
        L("seyi", "(His phone is still in his hand.) Aboki. My brother call me."),
        L("aboki", "Tunde? The Tunde wey disappear?"),
        L("seyi", "Two years. Two years no word. He say one thing: 'Ajegunle. Come alone. Don't bring the helmet.' Then the line cut.", { alt: yo("Ọdún méjì. Ọdún méjì láì sí ọ̀rọ̀. Ó sọ nǹkan kan: 'Ajegunle. Wá nìkan. Má mú àṣíborí wá.' Lẹ́yìn náà, ìlà náà já.", "Two years. Two years with no word. He said one thing: 'Ajegunle. Come alone. Don't bring the helmet.' Then the line cut.", "Aw-doon meh-jee. Aw-doon meh-jee lye see aw-raw. Oh saw nkon kahn: Ah-jeh-goon-leh. Wah nee-kahn. Mah moo ah-shee-bo-ree wah. Leh-yin nah-ah, ee-lah nah-ah jah.") }),
        L("aboki", "Don't bring the helmet... He mean Circuit helmet. Or your helmet."),
        L("seyi", "(He looks at Aboki for the first time without a joke.) I no fit go alone. I never ride Ajegunle lane for night. You get one more bike?"),
        L("aboki", "I get one friend. Oya. We dey go."),
      ] },
    ]
  },
  ajegunle_tunde: {
    id: "ajegunle_tunde", title: "Ajegunle · Night", stage: "oldgarage", env: { time: "night", weather: "overcast" }, music: "calm",
    cast: [C("aboki", "aboki", -1.6, 1.0, "tunde", "stand"), C("seyi", "seyi", -3.0, 1.4, "tunde", "stand"), C("tunde", "tunde", 1.4, -0.6, "seyi", "stand")],
    shots: [
      { cam: wide([-5, 1.7, 5.5], [0, 1.3, -0.6], 46), fx: { fade: "in" }, lines: [
        L("seyi", "Ẹ̀gbọ́n mi...! Ẹ̀gbọ́n mi, ṣé o wà láàyè?", { alt: yo("Ẹ̀gbọ́n mi...! Ẹ̀gbọ́n mi, ṣé o wà láàyè?", "My elder brother...! My brother, are you alive?", "Eg-baw mee! Eg-baw mee, shay oh wah lah-yeh?") }),
        L("tunde", "(He doesn't move. Two years of hiding are in his shoulders.) Seyi. I told you come alone."),
        L("seyi", "I came alone. (He steps aside.) He just carried me."),
        L("tunde", "(A tired half-smile.) Flash's boy. You ride like him. I watched from the roof.", { alt: yo("(Ẹ̀rín kékeré, tí ó rẹ̀.) Ọmọ Flash. O ń gun bíi rẹ̀. Mo wò ọ́ láti orí òrùlé.", "(A tired half-smile.) Flash's boy. You ride like him. I watched you from the roof.", "Aw-maw Flash. Oh n goon bee-ee reh. Moh waw aw lah-tee aw-ree aw-roo-leh.") }),
      ] },
      { cam: close("tunde", 1.2), lines: [
        L("tunde", "Listen. Both of you. Every Circuit race get winner before the horn. Dem decide with a ledger. The riders just carry the result."),
        L("tunde", "I refuse one race. Dem tell me: 'Lose at the third bend.' I win. Next day my bike brake fail for Ikorodu road. I live. Barely."),
        L("seyi", "Why you no tell me?", { mood: "sad" }),
        L("tunde", "Because the last man wey tell anybody... (He looks at Aboki.) Na your father, Aboki. Flash refuse the same order. Dem cut his brake line too."),
        L("aboki", "(Very quiet.) Dem cut his brake line.", { mood: "sad" }),
        L("tunde", "He no die for road. He run. And somebody hide the ledger where the ships sleep."),
      ] },
      { cam: two("aboki", "tunde", 3.0), lines: [
        L("tunde", "Tell Seyi I'm fine. Tell am make he stop racing for money. (He presses a folded paper in Aboki's hand.) Boss's old number. Don't call am from your own phone."),
        L("aboki", "Boss...?"),
        L("tunde", "Ask yourself why Boss gave you bikes. Ask am nicely."),
      ], fx: { music: "tense" } },
    ]
  },
  // ================================================================ MAKOKO: the boatman
  makoko_canoe: {
    id: "makoko_canoe", title: "Makoko · Before midnight", stage: "waterfront", env: { time: "night", weather: "haze" }, music: "calm",
    cast: [C("aboki", "aboki", -1.4, 1.0, "ebi", "stand"), C("ebi", "ebi", 1.6, 0.8, "aboki", "stand")],
    shots: [
      title("MAKOKO", "THE LAGOON REMEMBERS", 2.4),
      { cam: wide([-4, 1.5, 5.5], [0, 1.2, 0.8], 44), lines: [
        L("ebi", "E kú ìrọ̀lẹ́, ọmọ mi. (He studies Aboki a long time.) Ah. The way you stand.", { alt: yo("Ẹ kú ìrọ̀lẹ́, ọmọ mi. (Ó wò ó fún ìgbà pípẹ́.) Áà. Bí o ṣe dúró.", "Good evening, my child. (He studies him a long time.) Ah. The way you stand.", "Eh koo ee-raw-leh, aw-maw mee. Aah. Bee oh sheh doo-roh.") }),
        L("aboki", "Pa Ebi? Zara tell me you go know the whistle."),
        L("ebi", "(He hums it, very quietly. Up, up, down.) Eleven years ago a young man bring this lagoon its only music. Flash. He no come to Makoko to hide. He come to leave something.", { alt: yo("(Ó kọrin rẹ̀ kẹ́lẹ́kẹ́lẹ́. Sókè, sókè, sílẹ̀.) Ọdún mọ́kànlá sẹ́yìn, ọ̀dọ́mọkùnrin kan mú orin kan wá sí ibi omi yìí. Flash. Kò wá Makoko láti farapamọ́. Ó wá láti fi nǹkan sílẹ̀.", "(He hums it, very softly. Up, up, down.) Eleven years ago a young man brought this lagoon its only song. Flash. He did not come to Makoko to hide. He came to leave something.", "Aw-doon maw-kon-lah seh-yin, aw-daw-maw-koon-reen kahn moo aw-reen kahn wah see ee-bee aw-mee yee-ee. Flash. Koh wah Mah-ko-ko lah-tee fah-rah-pah-maw. Oh wah lah-tee fee nkon seel-eh.") }),
      ] },
      { cam: close("ebi", 1.2), lines: [
        L("ebi", "He say: 'If my son ever come with a bag he no open, tell am: the ships sleep at Berth Nine.' That na all. I no know wetin dey Berth Nine."),
        L("aboki", "(He is whistling under his breath without noticing.) Berth Nine."),
        L("ebi", "The water remember everything, ọmọ mi. But na only people fit tell am wetin to do with the memory."),
        L("zara", "Aboki. Black helmets on the causeway. Two. Maybe three. They followed you from Iwaya.", { phone: true }),
        L("aboki", "(He stands.) Pa Ebi, abeg go inside.", { alt: yo("Baba Ebi, ẹ jọ̀wọ́, ẹ wọlé.", "Pa Ebi, please, go inside.", "Bah-bah Eh-bee, eh jaw-woh, eh waw-leh.") }),
        L("ebi", "(Calmly lights a lantern.) I don see worse than three helmets. Ride, Flash's boy."),
      ], fx: { music: "tense" } },
    ]
  },
  // ================================================================ IKEJA: the journalist and the inspector
  ikeja_airport: {
    id: "ikeja_airport", title: "Ikeja Airport Road · 1:50 AM", stage: "street", env: { time: "night", weather: "clear" }, music: "tense",
    cast: [C("aboki", "aboki", -1.6, -1.4, "amaka", "stand"), C("amaka", "amaka", 1.4, -1.5, "aboki", "stand"), C("danjuma", "danjuma", 4.2, -1.0, "amaka", "stand", { hidden: true })],
    shots: [
      title("IKEJA", "AIRPORT ROAD · 1:50 AM", 2.4),
      { cam: wide([-4, 1.6, 6], [0, 1.4, -1.4], 44), lines: [
        L("amaka", "Aboki. Amaka Obi. I write for people who prefer not to be found. Zara says you don't open bags.", { alt: ig("Aboki. Abụ m Amaka Obi. M na-edekọ maka ndị na-achọghị ka a hụ ha. Zara kwuru na ị naghị emeghe akpa.", "Aboki. I am Amaka Obi. I write for people who prefer not to be found. Zara says you never open bags.", "Ah-bo-kee. Ah-boo mm Ah-mah-kah Oh-bee. Mm nah deh-ko mah-kah n-dee nah ah-cho-ghee kah ah hoo hah. Zah-rah kwoo-roo nah ee nah-ghee eh-meh-heh ah-kpah.") }),
        L("aboki", "Everybody for this city don dey tell me wetin I be."),
        L("amaka", "(She hands him a small flat tin.) This is a recording. A man inside the Circuit read me the ledger from memory. If it reaches Radio Eko Square before 6 a.m., the morning show breaks it live."),
        L("aboki", "Why me? Why no send am yourself?"),
        L("amaka", "Because they watch my car, my phone and my mother. Nobody is watching the delivery boy. That's the whole reason it works."),
      ] },
      { cam: two("aboki", "amaka", 3.4), act: [{ who: "danjuma", do: "show" }, { who: "danjuma", do: "walk", to: [2.8, -1.2], speed: 1.1 }], lines: [
        L("danjuma", "Miss Obi. (The inspector stops a few steps away, hands visible.) Wallahi, I am not here to arrest anybody.", { alt: ha("Miss Obi. (Mai bincike ya tsaya, hannayensa a bayyane.) Wallahi, ba zan kama kowa ba.", "Miss Obi. (The inspector stops, hands in view.) I swear to God, I'm not here to arrest anybody.", "Miss Obi. Wah-lah-hee, bah zahn kah-mah ko-wah bah.") }),
        L("danjuma", "Half my station is on the Chairman's payroll. The other half is afraid. I am the part that is neither. Take the airport road, not the expressway. I have turned off one checkpoint. The second I cannot."),
        L("amaka", "Inspector, if this tape is stopped—"),
        L("danjuma", "Then I will say I never saw it. (To Aboki.) Ride well, young man. Carefully, and don't worry.", { alt: ha("Ka hau lafiya, saurayi. A hankali, kada ka damu.", "Ride well, young man. Carefully, and don't worry.", "Kah how lah-fee-yah, sow-rah-yee. Ah han-kah-lee, kah-dah kah dah-moo.") }),
      ] },
    ]
  },
  // ================================================================ IKORODU: Titi's day
  titi_promise: {
    id: "titi_promise", title: "Ojuelegba · 1:05 PM", stage: "yard", env: { time: "day", weather: "clear" }, music: "calm",
    cast: [C("aboki", "aboki", -1.2, 0.6, "kelechi", "stand"), C("kelechi", "kelechi", 1.0, -0.2, "aboki", "stand")],
    shots: [
      { cam: wide([-5, 1.7, 6], [0, 1.3, -0.4], 44), fx: { fade: "in", sfx: "phone" }, lines: [
        L("titi", "Brother Aboki, you promise. Speech Day. Four o'clock. I'll be the last speaker.", { phone: true, alt: yo("Ẹ̀gbọ́n Aboki, o ṣèlérí. Ọjọ́ Ọ̀rọ̀-sísọ. Aago mẹ́rin. Èmi ni olùsọ̀rọ̀ ìkẹyìn.", "Big brother Aboki, you promised. Speech Day. Four o'clock. I will be the last speaker.", "Eg-baw Aboki, oh shay-leh-ree. Aw-jaw Aw-raw-see-saw. Ah-ah-go meh-reen. Eh-mee nee oh-loo-saw-raw ee-keh-yin.") }),
        L("aboki", "Titi, I dey on my way. (He is not on his way. He is in Ojuelegba, and Ikorodu is the other end of Lagos.)"),
        L("titi", "You always say that. (a pause) It's okay if you don't come. I'll be fine.", { phone: true, mood: "sad" }),
        L("aboki", "No. I go come. I no dey miss am."),
      ] },
      { cam: two("aboki", "kelechi", 3.0), lines: [
        L("kelechi", "Ikorodu? Three hours go-slow. You get two."),
        L("aboki", "Then I must ride like it's two hours."),
        L("kelechi", "(He tosses him the keys.) Nna m, no bag today. No Circuit. Just you and your sister.", { alt: ig("Nna m, ọ nweghị akpa taa. Ọ nweghị Circuit. Naanị gị na nwanne gị nwanyị.", "My dear, no bag today. No Circuit. Just you and your sister.", "Nnah mm, aw nweh-ghee ah-kpah tah-ah. Aw nweh-ghee Circuit. Nah-nee gee nah nwah-neh gee nwah-nyee.") }),
      ] },
    ]
  },
  titi_speech: {
    id: "titi_speech", title: "Ikorodu · Star of Lagos College", stage: "school", env: { time: "golden", weather: "clear" }, music: "calm",
    cast: [C("aboki", "aboki", -1.6, 1.0, "titi", "stand"), C("titi", "titi", 0.8, 0.2, "aboki", "stand"), C("grace", "grace", 3.2, 0.2, "titi", "stand")],
    shots: [
      title("IKORODU", "SPEECH DAY", 2.2),
      { cam: wide([-5, 1.6, 6], [0, 1.3, 0.5], 44), lines: [
        L("grace", "And now, our last speaker. Titi Adeyemi, who has asked that her speech be called 'My Brother Rides'.", { alt: yo("Àti nísinsin yìí, olùsọ̀rọ̀ wa ìkẹyìn. Titi Adeyemi, tí ó béèrè pé kí a pe ọ̀rọ̀ rẹ̀ ní 'Ẹ̀gbọ́n Mi Ń Gun Alùpùpù'.", "And now, our last speaker. Titi Adeyemi, who asked that her speech be called 'My Brother Rides'.", "Ah-tee nee-seen-seen yee-ee, oh-loo-saw-raw wah ee-keh-yin. Titi Ah-deh-yeh-mee, tee oh beh-eh-reh pay kee ah peh aw-raw reh nee Eg-baw Mee n Goon Ah-loo-poo-loo-poo.") }),
        L("titi", "(She spots Aboki at the back, helmet under his arm, sweat on his face. For one second she forgets her notes.) ...Good afternoon, everybody."),
        L("titi", "My brother rides motorbikes. Some people say that is not a job. He says it's a promise with wheels.", { hold: 1.4, alt: yo("Ẹ̀gbọ́n mi ń gun alùpùpù. Àwọn kan sọ pé kì í ṣe iṣẹ́. Ó ní, ó jẹ́ ìlérí tí ó ní kẹ̀kẹ́.", "My brother rides motorbikes. Some people say it's not a job. He says it is a promise with wheels.", "Eg-baw mee n goon ah-loo-poo-loo-poo. Ah-wawn kahn saw pay kee ee shay ee-sheh. Oh nee, oh jeh ee-leh-ree tee oh nee keh-keh.") }),
        L("titi", "He is late for everything except the things that matter. And today he's on time."),
      ] },
      { cam: two("aboki", "grace", 3.2), lines: [
        L("grace", "Mr. Adeyemi. Your sister's fees were settled this morning. By a friend of your late father's. He asked me not to say his name."),
        L("aboki", "(He turns the helmet over in his hands.) A friend of... my father?"),
        L("grace", "No child will leave this school over money. That was the message. He signed only with a whistle.", { alt: yo("Kò sí ọmọ kankan tí yóò kúrò ní ilé-ìwé yìí nítorí owó. Ìyẹn ni ọ̀rọ̀ rẹ̀. Fèrè ni ó fi buwọ́lù ú.", "No child will leave this school over money. That was his message. He signed it with a whistle.", "Koh see aw-maw kahn-kahn tee yoh koo-roo nee ee-leh-ee-weh yee-ee nee-taw-ree oh-woh. Ee-yen nee aw-raw reh. Feh-reh nee oh fee boo-waw-loo oo.") }),
        L("aboki", "(He stands very still. Then, very quietly, he whistles. Up, up, down.)", { hold: 1.6 }),
      ], fx: { sfx: "motif" } },
    ]
  }
};

const m = (c: MissionCfg): MissionCfg => c;
export const MISSIONS2: Record<string, MissionCfg> = {
  m_oshodi: m({
    id: "m_oshodi", title: "Mama Ayo's Medicine", chapter: "CHAPTER 2", map: "oshodi", env: { time: "day", weather: "haze" }, bike: "lightweight", objective: "deliver",
    brief: "Take Ayo's mother's medicine from Oshodi to Ikeja before the pharmacy shuts. The Chairman's collectors are watching the park, so don't stop.",
    goalText: "DELIVER THE MEDICINE TO IKEJA", timeLimit: 118, integrity: true, traffic: 1.5, reward: 15000,
    rivals: [{ rider: "guard", bike: "speed", role: "pursuer", at: 850, skill: 0.72 }],
    comms: [
      { at: 40, who: "ayo", text: "Aboki! The boys don reach park! Ride, ride, ride!", alt: yo("Aboki! Àwọn ọmọkùnrin náà ti dé ibùdó! Sá, sá, sá!", "Aboki! The boys have reached the park! Ride, ride, ride!", "Ah-bo-kee! Ah-wawn aw-maw-koon-reen nah-ah tee deh ee-boo-daw! Sah, sah, sah!") },
      { at: 420, who: "aboki", text: "Danfo for left! Another danfo for left! Chai! Oshodi no dey joke!" },
      { at: 900, who: "aboki", text: "That black SUV... na the same one.", music: "tense" },
      { at: 1500, who: "ayo", text: "Mama say thank you! She dey pray for you from now till Christmas!", music: "groove", alt: yo("Màmá ní kí n dúpẹ́! Ó ń gbàdúrà fún ẹ láti ìsinsin yìí títí di Kérésìmesì!", "Mama says thank you! She will pray for you from now till Christmas!", "Mah-mah nee kee n doo-peh! Oh n gbah-doo-rah foon eh lah-tee ee-seen-seen yee-ee tee-tee dee Keh-reh-see-meh-see!") },
      { at: 2400, who: "aboki", text: "Ikeja, I dey come. Pharmacy, no close!" }
    ]
  }),
  m_ajegunle: m({
    id: "m_ajegunle", title: "Find Tunde", chapter: "CHAPTER 4", map: "ajegunle", env: { time: "dusk", weather: "clear" }, bike: "cafe", objective: "follow",
    brief: "Tunde's lookout will lead you into Ajegunle's lanes. Stay within sight of him; the lanes are narrow and unforgiving.",
    goalText: "STAY ON TUNDE'S WHEEL (within 12 m)", traffic: 0.8, reward: 10000,
    rivals: [{ rider: "tunde", bike: "cafe", role: "leader", skill: 0.9 }],
    comms: [
      { at: 40, who: "seyi", text: "That's him. That's my brother's riding. Don't lose am!", alt: yo("Òun ni! Báyìí ni ẹ̀gbọ́n mi ṣe ń gun alùpùpù. Má ṣe pàdánù rẹ̀!", "That's him! That is how my brother rides. Don't lose him!", "Aw-oon nee! Bah-yee nee eg-baw mee sheh n goon ah-loo-poo-loo-poo. Mah sheh pah-dah-noo reh!") },
      { at: 900, who: "aboki", text: "Generators, kiosks, music from every door... and he dey cut through all of it." },
      { at: 1500, who: "seyi", text: "Left! Left at the fish stall!" }
    ]
  }),
  m_makoko: m({
    id: "m_makoko", title: "Lagoon Run", chapter: "CHAPTER 6", map: "makoko", env: { time: "night", weather: "haze" }, bike: "elite", objective: "escape",
    brief: "Black helmets are on the causeway. The lagoon road is long and lit by lanterns. Shake them before it ends.",
    goalText: "ESCAPE ACROSS THE LAGOON ROAD", traffic: 0.7, reward: 12000, roadblocks: [1500],
    rivals: [{ rider: "shadow", bike: "speed", role: "pursuer", at: 200, skill: 0.84 }, { rider: "guard", bike: "speed", role: "pursuer", at: 520, skill: 0.8 }],
    comms: [
      { at: 60, who: "zara", text: "Two behind you. Stay on the crown of the road.", alt: ha("Biyu ne a bayanka. Ka tsaya a tsakiyar hanya.", "There are two behind you. Stay in the middle of the road.", "Bee-yoo neh ah bah-yahn-kah. Kah tsah-yah ah tsah-kee-yar han-yah."), music: "tense" },
      { at: 900, who: "aboki", text: "Berth Nine... Berth Nine. Pa Ebi, you no go regret am." },
      { at: 1450, who: "zara", text: "Police lights ahead. Not ours. Take the gap!" },
      { at: 2300, who: "zara", text: "You're almost on dry land. Don't lift now.", music: "groove" }
    ]
  }),
  m_ikeja: m({
    id: "m_ikeja", title: "Airport Road", chapter: "CHAPTER 7", map: "ikeja", env: { time: "night", weather: "clear" }, bike: "speed", objective: "deliver",
    brief: "Amaka's recording must reach Radio Eko Square before 6 a.m. The airport road is fast and wide, but there are checkpoints, and not all of them are honest.",
    goalText: "DELIVER THE RECORDING TO THE RADIO STATION", timeLimit: 120, integrity: true, traffic: 0.9, reward: 25000, roadblocks: [1000, 2200],
    rivals: [{ rider: "shadow", bike: "speed", role: "pursuer", at: 1300, skill: 0.84 }],
    comms: [
      { at: 60, who: "danjuma", text: "Checkpoint one is clear. Checkpoint two, you will see. Ride, young man.", alt: ha("Wurin bincike na farko babu komai. Na biyu, za ka gani. Ka hau, saurayi.", "The first checkpoint is clear. The second, you will see. Ride, young man.", "Woo-reen been-chee-keh nah fah-ro bah-boo ko-mye. Nah bee-yoo, zah kah gah-nee. Kah how, sow-rah-yee."), music: "groove" },
      { at: 900, who: "amaka", text: "I can hear a plane. If you hear the plane, you are close to the road that matters.", alt: ig("Anụrụ m ụgbọelu. Ọ bụrụ na ị nụ ya, ị dị nso n'okporo ụzọ ahụ dị mkpa.", "I can hear a plane. If you hear it, you are close to the road that matters.", "Ah-noo-roo mm oog-boh-eh-loo. Aw boo-roo nah ee noo yah, ee dee n-so n-oh-kpo-ro oo-zaw ah-hoo dee mm-kpah.") },
      { at: 1320, who: "aboki", text: "Who be this one? Black helmet. Of course.", music: "tense" },
      { at: 2300, who: "amaka", text: "Radio Eko Square, one kilometre. Kelechi's tank, Kelechi's nitro. Now!" }
    ]
  }),
  m_ikorodu: m({
    id: "m_ikorodu", title: "Speech Day", chapter: "CHAPTER 5", map: "ikorodu", env: { time: "golden", weather: "clear" }, bike: "lightweight", objective: "deliver",
    brief: "No bag, no Circuit. Just a promise to a little sister. Ikorodu Road is long and the go-slow is worse. Make it before four.",
    goalText: "REACH TITI'S SCHOOL BEFORE SPEECH DAY STARTS", timeLimit: 150, traffic: 1.25, reward: 0,
    rivals: [],
    comms: [
      { at: 60, who: "titi", text: "Brother, they put me last on the list. That means you have time.", alt: yo("Ẹ̀gbọ́n, wọ́n fi mí sí ìkẹyìn. Èyí túmọ̀ sí pé o ní àkókò.", "Brother, they put me last on the list. That means you have time.", "Eg-baw, waw fee mee see ee-keh-yin. Eh-yee too-maw see pay oh nee ah-kaw-kaw.") },
      { at: 1200, who: "kelechi", text: "Tyres on the left side getting warm. Ease off the brake going into Ikorodu town.", alt: ig("Taịa aka ekpe na-ekpo ọkụ. Wedata ụkwụ n'ụgbọ mgbe ị na-abata n'obodo Ikorodu.", "The left tyres are getting warm. Ease off the brake as you enter Ikorodu town.", "Tah-ee-ah ah-kah eh-kpeh nah eh-kpo aw-koo. Weh-dah-tah oo-kwoo n-oog-baw mm-gbeh ee nah ah-bah-tah n-aw-baw-daw Ee-ko-ro-doo.") },
      { at: 2600, who: "titi", text: "Brother? The hall is full. Madam Grace is looking at the door.", alt: yo("Ẹ̀gbọ́n? Gbàngàn ti kún. Madam Grace ń wo ẹnu-ọ̀nà.", "Brother? The hall is full. Madam Grace is looking at the door.", "Eg-baw? Gbahn-gahn tee koon. Madam Grace n waw eh-noo-aw-nah.") },
      { at: 3400, who: "aboki", text: "Come on, come on... I no go miss am." }
    ]
  })
};
void ({} as Comm);
