// ABOKI RIDERS: THE LAST DELIVERY. Story data: chapters, cutscenes and missions. Everything is procedural, so it plays offline.
import type { Cast, Comm, Cutscene, MissionCfg, Node, Shot } from "./types";
import { CUTSCENES2, MISSIONS2 } from "./script2";

const C = (id: string, look: string, x: number, z: number, faceTo?: string, pose?: Cast["pose"], extra: Partial<Cast> = {}): Cast => ({ id, look, pos: [x, z], faceTo, pose, ...extra });
const two = (a: string, b: string, d = 3.2) => ({ k: "two" as const, a, b, d });
const close = (who: string, d = 1.25) => ({ k: "close" as const, who, d });
const wide = (from: [number, number, number], look: [number, number, number], fov = 46) => ({ k: "wide" as const, from, look, fov });
const L = (who: string, text: string, extra: { phone?: boolean; mood?: "laugh" | "angry" | "sad"; hold?: number } = {}) => ({ who, text, ...extra });
const title = (big: string, small = "", dur = 3): Shot => ({ cam: wide([0, 1.6, 6], [0, 1.4, 0]), dur, fx: { fade: "in", title: { big, small } } });

// ------------------------------------------------------------------------------------------------ CUTSCENES
const CUTSCENES1: Record<string, Cutscene> = {
  // ---------------------------------------------------------------- CHAPTER 1
  cracked_screen: {
    id: "cracked_screen", title: "Ojuelegba · 6:12 AM", stage: "yard", env: { time: "dawn", weather: "haze" }, music: "calm",
    cast: [C("aboki", "aboki", -1.3, 0.7, "kelechi", "stand"), C("kelechi", "kelechi", 1.1, -0.2, "aboki", "lean")],
    shots: [
      title("LAGOS", "6:12 AM · OJUELEGBA", 2.8),
      { cam: wide([-5.5, 1.8, 6.5], [0, 1.3, -0.5], 44), drift: [1.6, 0.1, -0.8], lines: [
        L("alhaji", "Aboki. Where my money? Na Tuesday you dey show me excuse?", { phone: true }),
        L("aboki", "Oga, I dey try. Just give me small time—"),
        L("alhaji", "Small time don finish. Friday. Or I carry the bike. Na my bike, no be your papa property.", { phone: true }),
        L("aboki", "(He stares at his cracked phone screen as the line goes dead.)", { hold: 2.2 }),
        L("kelechi", "Same man?"),
        L("aboki", "Same man. Same song."),
        L("kelechi", "And that back tyre don bald pass Baba Ibeji head. Aboki... you dey owe the whole street. Rent. Bike owner. Me."),
        L("aboki", "I know, Kele. I know."),
      ] },
      { cam: two("aboki", "kelechi", 3.0), lines: [
        L("titi", "Brother Aboki, school say Monday na last day for fees 😭 I no wan stay for house.", { phone: true }),
        L("kelechi", "(quietly) That one na your sister?"),
        L("aboki", "She get brain pass me. She no go stay for house."),
      ] },
      { cam: close("aboki", 1.3), fx: { sfx: "phone", music: "tense" }, lines: [
        L("unknown", "You dey ride?", { phone: true }),
        L("aboki", "I dey ride."),
        L("unknown", "I get one delivery. Sharp sharp. Thirty thousand naira.", { phone: true }),
        L("aboki", "Thirty... for one delivery?"),
        L("unknown", "You want am or you no want am?", { phone: true }),
      ] },
      { cam: two("aboki", "kelechi", 3.0), lines: [
        L("kelechi", "Aboki. Anything wey pay like that no dey free. Ask who send am."),
        L("aboki", "Kele... everything I get don finish. I no get another option."),
        L("kelechi", "(a long breath, then he tosses him the helmet) Then ride like your papa."),
        L("aboki", "(He freezes for a second.) Don't talk about my papa."),
        L("kelechi", "Sorry. Go. And come back."),
        L("aboki", "I want am."),
      ] },
    ]
  },
  who_send_you: {
    id: "who_send_you", title: "Yaba · 7:48 PM", stage: "street", env: { time: "golden", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", -1.5, -1.5, "baba", "stand"), C("baba", "baba", 1.4, -1.6, "aboki", "stand")],
    shots: [
      { cam: wide([-5, 1.7, 6.5], [0, 1.4, -1.5], 44), act: [{ who: "aboki", do: "walk", to: [-1.5, -1.5] }], fx: { fade: "in" }, lines: [
        L("aboki", "Baba Jide? Delivery. Black bag. I no open am, I no stop, I no give anybody."),
        L("baba", "(He takes the bag. His hands know its weight.) Hmm."),
        L("baba", "Who send you?"),
      ] },
      { cam: two("aboki", "baba", 2.8), lines: [
        L("aboki", "Man call me. No name. But the message say make I tell you: 'Flash sent it.'"),
      ] },
      { cam: close("baba", 1.15), fx: { sfx: "thunder", music: "off" }, lines: [
        L("baba", "(The rain is the only sound.) Say that again."),
        L("aboki", "'Flash sent it.' Baba... why your face change?"),
        L("baba", "Flash don die. Eleven years now."),
        L("baba", "You no suppose dey here, my son."),
        L("aboki", "I just bring delivery—"),
        L("baba", "Ride go house. Lock door. And Aboki..."),
        L("aboki", "How you know my name?"),
      ] },
      { cam: close("baba", 1.6), fx: { fade: "black" }, dur: 2.2, lines: [L("baba", "Go.", { hold: 1.2 })] }
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 2
  morning_after: {
    id: "morning_after", title: "Ojuelegba · Next morning", stage: "yard", env: { time: "day", weather: "clear" }, music: "groove",
    cast: [C("aboki", "aboki", -1.2, 0.5, "kelechi", "stand"), C("kelechi", "kelechi", 1.0, -0.3, "aboki", "stand")],
    shots: [
      { cam: wide([-5, 1.7, 6], [0, 1.3, -0.5], 44), fx: { fade: "in", music: "groove", sfx: "pickup" }, lines: [
        L("narrator", "CREDIT ALERT: ₦30,000.00", { hold: 1.6 }),
        L("aboki", "Kele! Kele! E enter! Thirty thousand! Fresh!"),
        L("kelechi", "(He checks the phone twice, then the note.) ...Real money. Hmm."),
        L("aboki", "Why you dey look like person wey see ghost?"),
        L("kelechi", "Money wey no get story dey always get story."),
        L("aboki", "Abeg, no spoil my morning."),
      ] },
      { cam: two("aboki", "kelechi", 3.2), act: [{ who: "kelechi", do: "pose", pose: "arms" }], lines: [
        L("aboki", "Part of rent: paid. Alhaji: twenty thousand, he go shut up small. New tyres..."),
        L("kelechi", "Bald tyre, rest in peace. (He pats the new rubber.) Front brake too. Free."),
        L("aboki", "Free? You never do free for anybody."),
        L("kelechi", "Na your papa bike I learn on. I no take money from this one."),
        L("titi", "BROTHER ABOKI! I get new bag!!! Everybody for school dey envy me!", { phone: true }),
        L("aboki", "(He is smiling like it hurts.) Go learn, small madam."),
      ] },
      { cam: close("aboki", 1.3), fx: { sfx: "phone" }, lines: [
        L("unknown", "Another one. Tonight. Be ready.", { phone: true }),
        L("aboki", "Kele, we dey move!"),
        L("kelechi", "(quietly, to himself) Who dey pay you? ... Next time ask am."),
        L("aboki", "Next time."),
      ] },
    ]
  },
  seyi_arrives: {
    id: "seyi_arrives", title: "Ojuelegba · Evening", stage: "street", env: { time: "golden", weather: "clear" }, music: "groove",
    cast: [C("aboki", "aboki", -1.6, -1.5, "seyi", "stand"), C("seyi", "seyi", 2.2, -1.2, "aboki", "lean"), C("bisi", "bisi", -4.5, -2.4, "aboki", "arms", { hidden: true })],
    shots: [
      { cam: wide([-4, 1.6, 6], [0, 1.4, -1.5], 44), fx: { fade: "in", sfx: "horn" }, lines: [
        L("seyi", "New tyres? Aboki! Who die?"),
        L("aboki", "Money, Seyi. Money."),
        L("seyi", "Money dey buy tyre. E no dey buy speed."),
        L("aboki", "You dey fear am?"),
        L("seyi", "Race me. Surulere. Loser buy suya. And I like plenty pepper."),
      ] },
      { cam: two("aboki", "seyi", 3.0), act: [{ who: "bisi", do: "show" }, { who: "bisi", do: "walk", to: [-3, -1.8] }], lines: [
        L("bisi", "Seyi, leave the man alone. (She looks Aboki up and down.) So na you be Aboki."),
        L("aboki", "Wetin I do now?"),
        L("bisi", "Nothing. That's what's interesting. Rider wey never complain, never late, never ask question. Everybody dey ask who you be."),
        L("seyi", "She know everybody. Club owners, security, OS girls, riders, who dey owe who."),
        L("bisi", "Bisi. I know things. Not free."),
        L("seyi", "She fit sell your own shadow."),
        L("bisi", "And buy am back cheaper. (to Aboki) Race him. I want to see something."),
        L("aboki", "Suya on me. Pepper on him."),
      ] },
    ]
  },
  word_dey_go_round: {
    id: "word_dey_go_round", title: "Surulere · Dusk", stage: "foodspot", env: { time: "dusk", weather: "clear" }, music: "groove",
    cast: [C("aboki", "aboki", 0, 0.4, "seyi", "sit"), C("seyi", "seyi", 2, 0.1, "aboki", "sit"), C("bisi", "bisi", -2, 0.1, "aboki", "sit"), C("mama", "mama", 0.4, -2.8, "aboki", "stand", { yaw: 180 })],
    shots: [
      { cam: wide([-3.5, 1.7, 5], [0, 1.0, -1], 46), fx: { fade: "in" }, lines: [
        L("mama", "Aboki! Come chop. You don dey get famous, na so?"),
        L("aboki", "Mama Put, I no get time for fame."),
        L("seyi", "(mouth full of rice) He beat me by one bike length. One!"),
        L("bisi", "Because you looked at the girl on the pavement."),
        L("seyi", "I was assessing the competition."),
      ] },
      { cam: two("aboki", "bisi", 3.0), lines: [
        L("bisi", "Seriously, Aboki. Delivery guys come and go. But you? Island, mainland, bridge. People start to ask."),
        L("aboki", "Ask what?"),
        L("bisi", "Whether you're one of Boss's people."),
        L("aboki", "Who be Boss?"),
        L("seyi", "(stops chewing) Nobody knows."),
        L("mama", "(The ladle stops mid-air. Then keeps stirring.) Eat your food."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 3
  who_is_boss: {
    id: "who_is_boss", title: "Mama Put · Night", stage: "foodspot", env: { time: "night", weather: "clear" }, music: "tense",
    cast: [C("aboki", "aboki", 0, 0.4, "mama", "sit"), C("seyi", "seyi", 2, 0.1, "mama", "sit"), C("bisi", "bisi", -2, 0.1, "mama", "sit"), C("kelechi", "kelechi", -1, -3, "aboki", "sit", { yaw: 180 }), C("mama", "mama", 0.4, -2.8, "aboki", "stand", { yaw: 180 })],
    shots: [
      { cam: wide([-3.5, 1.7, 5], [0, 1.0, -1], 46), fx: { fade: "in" }, lines: [
        L("aboki", "Okay. Everybody. Who be Boss?"),
        L("mama", "Boss own three garages."),
        L("seyi", "Boss no even stay Lagos."),
        L("bisi", "Boss fit make one phone call and your whole night change."),
        L("mama", "Boss no be bad person."),
        L("seyi", "You dey mad? You no know Boss."),
        L("mama", "I know Boss pass you, small boy."),
      ] },
      { cam: two("aboki", "kelechi", 3.6), lines: [
        L("aboki", "Kele, you know am?"),
        L("kelechi", "(He is staring at his food.) I know people wey know am."),
        L("aboki", "Why everybody dey talk like Boss na weather?"),
        L("kelechi", "Because e dey affect everybody and nobody fit stop am."),
      ] },
      { cam: close("aboki", 1.3), fx: { sfx: "phone" }, lines: [
        L("unknown", "Boss wants to see you.", { phone: true }),
        L("mama", "(quietly) Eat. Whatever dey come... make e meet you with belly full."),
      ] },
    ]
  },
  boss_garage: {
    id: "boss_garage", title: "Boss Garage · Apapa", stage: "workshop", env: { time: "day", weather: "clear" }, music: "groove",
    cast: [C("aboki", "aboki", -1.5, 4, "boss", "stand"), C("boss", "boss", 0, 12, "aboki", "stand", { hidden: true }), C("mech1", "mech", -8, -3, "mech2", "stand"), C("mech2", "mech", -6.5, -2.6, "mech1", "stand")],
    shots: [
      { cam: wide([-9, 2.2, 8], [0, 1.4, 2], 50), fx: { fade: "in" }, lines: [
        L("mech", "Oga! Tyre! The other tyre!"),
        L("mech", "Who take my spanner? The 14!"),
        L("mech", "(Someone is arguing about money. Someone else is eating.) ...Your own na ten thousand. TEN."),
      ], act: [{ who: "aboki", do: "look", at: "mech1" }] },
      { cam: wide([-6, 1.8, 3], [0, 1.5, 9], 42), act: [{ who: "boss", do: "show" }, { who: "boss", do: "walk", to: [1.4, 0.2], speed: 1.1 }], dur: 5, fx: { music: "off" } },
      { cam: two("aboki", "boss", 3.4), act: [{ who: "boss", do: "face", to: "aboki" }, { who: "aboki", do: "face", to: "boss" }], lines: [
        L("boss", "(He looks at Aboki's bike for a long time. Then at Aboki.) Na you collect that package?"),
        L("aboki", "Which package?"),
        L("boss", "(A small smile.) Good answer."),
      ] },
      { cam: close("boss", 1.3), fx: { music: "tense" }, lines: [
        L("boss", "I get work for you. High-value deliveries. VIP clients. Parts. Cash. Important people."),
        L("aboki", "Legal?"),
        L("boss", "Mostly."),
        L("aboki", "And the part wey no be mostly?"),
        L("boss", "You go ask me later. People wey ask early dey ask for wrong reason."),
        L("boss", "That bike no suit the man I want. Kelechi go see you. He go know wetin to do."),
        L("aboki", "You know Kelechi?"),
        L("boss", "I know everybody wey know you."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 4
  upgrades: {
    id: "upgrades", title: "Ojuelegba · Evening", stage: "yard", env: { time: "golden", weather: "clear" }, music: "groove",
    cast: [C("aboki", "aboki", -1.2, 0.5, "kelechi", "stand"), C("kelechi", "kelechi", 1.0, -0.3, "aboki", "lean"), C("seyi", "seyi", 3.4, 1.4, "aboki", "arms", { hidden: true }), C("bisi", "bisi", -3.2, 1.6, "aboki", "lean", { hidden: true })],
    shots: [
      { cam: wide([-5, 1.7, 6], [0, 1.3, -0.5], 44), fx: { fade: "in", music: "groove" }, lines: [
        L("kelechi", "New engine part. New brake line. Boss send everything. (He turns a wrench like he is angry with it.)"),
        L("aboki", "You don't sound happy."),
        L("kelechi", "I'm happy. Look at me. Happy."),
      ] },
      { cam: two("aboki", "kelechi", 3.2), act: [{ who: "seyi", do: "show" }, { who: "bisi", do: "show" }], lines: [
        L("seyi", "I go beat you with that borrowed engine."),
        L("bisi", "Borrowed engine, borrowed jacket. Aboki, you're glowing."),
        L("aboki", "I dey live, Bisi. Night rides, races, food, music. Lagos finally dey look me."),
        L("kelechi", "Aboki. No get too comfortable."),
        L("aboki", "Wetin you mean?"),
        L("kelechi", "Your papa also... (He stops.)"),
        L("aboki", "My papa also what?"),
        L("kelechi", "Nothing. Tighten the chain."),
      ] },
    ]
  },
  blue_helmet_teaser: {
    id: "blue_helmet_teaser", title: "Victoria Island · 3:40 AM", stage: "club", env: { time: "night", weather: "clear" }, music: "tense",
    cast: [C("aboki", "aboki", -1, 1.6, "seyi", "stand"), C("seyi", "seyi", 1.1, 1.4, "aboki", "lean"), C("zara_bike", "zara_helmet", 12, 5, undefined, "stand", { bike: "cafe", hidden: true, yaw: 90 })],
    shots: [
      { cam: wide([-4, 1.7, 7], [0, 1.4, 1.5], 44), fx: { fade: "in" }, lines: [
        L("seyi", "Another win for the delivery man. Boss go dey proud."),
        L("aboki", "You dey carry am like me and Boss dey share blood."),
        L("seyi", "I dey carry am because everybody dey carry am."),
      ] },
      { cam: wide([-2, 1.6, 6], [8, 1.2, 4], 40), act: [{ who: "zara_bike", do: "ride", from: [14, 4.2], to: [4, 4.2], t: 3 }, { who: "aboki", do: "look", at: "zara_bike" }], dur: 3.2, fx: { sfx: "horn" } },
      { cam: close("aboki", 1.3), act: [{ who: "zara_bike", do: "ride", from: [4, 4.2], to: [-14, 4.2], t: 3.2 }], lines: [
        L("aboki", "That blue helmet... na the third time I dey see am."),
        L("seyi", "(quickly) Helmet? Plenty helmet for Lagos."),
        L("aboki", "Every important delivery. Ahead of me. Behind me. Watching."),
        L("seyi", "Go home, Aboki."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 5
  nobody_talk: {
    id: "nobody_talk", title: "Surulere · Morning", stage: "foodspot", env: { time: "day", weather: "overcast" }, music: "tense",
    cast: [C("aboki", "aboki", 0, 0.4, "bisi", "sit"), C("seyi", "seyi", 2, 0.1, "aboki", "sit"), C("bisi", "bisi", -2, 0.1, "aboki", "sit"), C("kelechi", "kelechi", -1, -3, "aboki", "sit", { yaw: 180 })],
    shots: [
      { cam: wide([-3.5, 1.7, 5], [0, 1.0, -1], 46), fx: { fade: "in" }, lines: [
        L("aboki", "Blue helmet. Every big delivery. Who is it?"),
        L("seyi", "Helmet? Which helmet?"),
        L("kelechi", "Leave am, Aboki."),
        L("aboki", "Bisi?"),
        L("bisi", "(She doesn't look up.) I no wan talk about that one."),
        L("aboki", "You know everybody. You said so yourself."),
        L("bisi", "Exactly. And I know when to stay quiet."),
      ] },
      { cam: close("aboki", 1.3), lines: [
        L("aboki", "(quietly) Three of you. All of you scared of the same helmet."),
        L("unknown", "He's riding tonight. Ojuelegba. Don't be late.", { phone: true }),
      ], fx: { sfx: "phone" } },
    ]
  },
  zara: {
    id: "zara", title: "Rooftop · Yaba", stage: "roof", env: { time: "night", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", -1.8, -3.4, "zara", "stand"), C("zara", "zara_helmet", 1.4, -4.2, "aboki", "stand"), C("zara_bike", "zara_helmet", 9, -6, undefined, "stand", { bike: "cafe", hidden: true })],
    shots: [
      { cam: wide([-4, 1.8, 3], [0, 1.4, -4], 44), fx: { fade: "in", music: "tense" }, lines: [
        L("aboki", "Enough running. Take it off."),
        L("zara", "(She stays still. Then, slowly, she lifts the helmet. Rain on her face.)"),
      ], act: [{ who: "zara", do: "pose", pose: "arms" }] },
      { cam: close("zara", 1.2), lines: [
        L("zara", "My name is Zara."),
        L("zara", "You need to stop working for Boss."),
        L("aboki", "(He laughs.) Why?"),
        L("zara", "Because he didn't hire you because you're good."),
        L("zara", "He hired you because of who you are."),
      ], fx: { sfx: "thunder" } },
      { cam: two("aboki", "zara", 3.2), lines: [
        L("aboki", "And who am I?"),
        L("zara", "Ask Baba Jide. Ask him what name he said on that doorstep. Then ask who your father was."),
        L("aboki", "My father was a rider."),
        L("zara", "Your father was Flash."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 6
  baba_tells: {
    id: "baba_tells", title: "Baba Jide's Place · Night", stage: "street", env: { time: "night", weather: "rain" }, music: "calm",
    cast: [C("aboki", "aboki", -1.6, -1.6, "baba", "stand"), C("baba", "baba", 1.4, -1.6, "aboki", "stand"), C("zara", "zara", 0, -0.3, "baba", "arms")],
    shots: [
      { cam: wide([-4, 1.7, 6], [0, 1.4, -1.5], 44), fx: { fade: "in" }, lines: [
        L("baba", "(He has been waiting.) Sit. No. Stand. Better to hear this standing."),
        L("baba", "Your father. Taiwo Adeyemi. They called him Flash. In this city, in those years, nobody rode faster."),
        L("baba", "There was a network. Old. Illegal. Fast. Riders. Money. Betting. We called it The Circuit."),
        L("aboki", "My papa rode for it?"),
        L("baba", "He was the best of it. Then one night, he disappeared. They said accident. Everybody said accident."),
        L("zara", "It wasn't."),
      ] },
      { cam: close("zara", 1.2), lines: [
        L("zara", "I was young. I saw who was there. Boss was there."),
        L("aboki", "(very quietly) Boss killed my father?"),
        L("baba", "I never say that."),
        L("zara", "I say he was there."),
      ] },
      { cam: two("aboki", "baba", 3.0), fx: { sfx: "motif" }, lines: [
        L("baba", "That first package. Boss send it to me with your name on the delivery. Inside was half a brass key."),
        L("baba", "'Give the other half to the boy when he starts asking questions.' That was the message. (He places half a key in Aboki's palm.) Eleven years I wait for somebody to bring me this."),
        L("aboki", "(He is whistling, without noticing. Three notes. Up, up, down.)"),
        L("baba", "(quietly) That tune. Flash used to whistle that tune. Every race."),
      ] },
    ]
  },
  seyi_secret: {
    id: "seyi_secret", title: "Apapa · After the race", stage: "street", env: { time: "night", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", -1.6, -1.5, "seyi", "stand"), C("seyi", "seyi", 1.4, -1.4, "aboki", "stand"), C("bisi", "bisi", 0, -0.2, "seyi", "arms")],
    shots: [
      { cam: wide([-4, 1.7, 6], [0, 1.4, -1.5], 44), fx: { fade: "in" }, lines: [
        L("aboki", "You rode like you were looking for somebody."),
        L("seyi", "(He takes off his glasses.) My brother, Tunde. He rode for The Circuit. Three years ago his bike 'failed' on the Bridge. Brake line. Cut clean."),
        L("seyi", "I never dey compete with you for money, Aboki. I dey follow you because you be the one they want."),
        L("aboki", "You could have said."),
        L("seyi", "And ruin the rivalry? (A tired half-smile.) I still go beat you."),
      ] },
      { cam: close("bisi", 1.2), lines: [
        L("bisi", "People talk in clubs. Years of talk about The Circuit. I put it together. Tomorrow night I'm taking you somewhere. Dress like you belong."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 7
  hidden_compartment: {
    id: "hidden_compartment", title: "Kelechi's Workshop · Night", stage: "oldgarage", env: { time: "night", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", -1.1, 0.5, "kelechi", "stand"), C("kelechi", "kelechi", 0.9, -0.3, "aboki", "stand")],
    shots: [
      { cam: wide([-3, 1.8, 4.5], [0, 1.2, -1.8], 46), fx: { fade: "in" }, lines: [
        L("aboki", "This is my papa bike. You fix am three times for me. Show me everything you know about am."),
        L("kelechi", "(He lets the cover slide.) I fix am. That's all. That's all I know."),
        L("aboki", "Kele..."),
      ] },
      { cam: close("aboki", 1.1), fx: { sfx: "pickup" }, lines: [
        L("aboki", "(He presses the tank cap. Something clicks.) There's a compartment."),
        L("kelechi", "(too fast) I no know say e get compartment."),
        L("aboki", "Half a brass key. A folded note. 'Where the ships sleep.'"),
        L("aboki", "Put the two halves together... na one key. Baba Jide had the other half all this time."),
      ] },
      { cam: two("aboki", "kelechi", 3.0), lines: [
        L("aboki", "Kele, you fix everything for me since day one. You never ask me one question about my papa."),
        L("kelechi", "Some things... people no talk."),
        L("aboki", "(He looks at him for a long moment.) You sure say na only that?"),
        L("kelechi", "(He doesn't answer.)"),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 8
  os_lounge: {
    id: "os_lounge", title: "OS Lounge · Victoria Island", stage: "club", env: { time: "night", weather: "rain" }, music: "groove",
    cast: [C("aboki", "aboki", -1, 1.6, "mimi", "stand"), C("bisi", "bisi", 0.8, 1.4, "mimi", "stand"), C("mimi", "mimi", 2.8, -0.8, "aboki", "lean"), C("guard", "guard", -2.2, -2.4, "aboki", "arms")],
    shots: [
      { cam: wide([-4, 1.7, 7], [0, 1.4, 0.5], 44), fx: { fade: "in" }, lines: [
        L("bisi", "Mimi. This is the man I told you about."),
        L("mimi", "(She takes off her shades.) Flash's boy? Wahala. You get his face."),
      ] },
      { cam: close("mimi", 1.2), lines: [
        L("mimi", "We see everything at this door. Who comes, who goes, who owes, which rider works for which man. I was nineteen when your papa used to come here."),
        L("aboki", "They told me he disappeared."),
        L("mimi", "(quiet) Your papa no disappear. Somebody make am disappear."),
        L("aboki", "Who?"),
        L("mimi", "The Circuit had a mouth inside. Somebody who sold the race route. Nobody know the face. Only the name: 'Spanner'."),
      ], fx: { sfx: "motif" } },
      { cam: two("aboki", "guard", 3.4), lines: [
        L("guard", "Mimi. Enough."),
        L("bisi", "(Her eyes are on the guard's phone.) Aboki. We're leaving. Now."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 9
  spanner: {
    id: "spanner", title: "Kelechi's Workshop · 2:10 AM", stage: "oldgarage", env: { time: "night", weather: "storm" }, music: "tense",
    cast: [C("aboki", "aboki", -1.1, 0.5, "kelechi", "stand"), C("kelechi", "kelechi", 0.9, -0.3, "aboki", "stand")],
    shots: [
      { cam: wide([-3, 1.8, 4.5], [0, 1.2, -1.8], 46), fx: { fade: "in" }, lines: [
        L("aboki", "(He holds up a battered spanner, the handle burned with letters.) 'K.O.' Kelechi Okafor. Spanner."),
        L("kelechi", "(He doesn't deny it.) Aboki..."),
      ] },
      { cam: close("kelechi", 1.15), act: [{ who: "kelechi", do: "pose", pose: "slump" }], fx: { sfx: "thunder" }, lines: [
        L("kelechi", "I was twenty. My mother was dying. A man said: tell us which route they run on Saturday. Small thing. Fifty thousand."),
        L("kelechi", "I thought na just betting. I thought nobody would get hurt."),
        L("kelechi", "Your papa found out somebody sold the race. He refused to play along. Then... he never come back."),
        L("kelechi", "That's why I became your mechanic. That's why I fix everything. That's why I never ask you for money."),
      ], },
      { cam: close("aboki", 1.25), lines: [
        L("aboki", "You knew. Every day. Every day I come to your shop, you knew."),
        L("kelechi", "I wanted to tell you—"),
        L("aboki", "(His voice breaks.) You were the only person I trusted."),
        L("kelechi", "I know."),
        L("aboki", "(He drops the spanner on the bench. Walks out into the storm.)"),
      ], fx: { shake: 0.3 } },
    ]
  },

  // ---------------------------------------------------------------- CHAPTER 10
  boss_vs_aboki: {
    id: "boss_vs_aboki", title: "Boss Garage · Night", stage: "workshop", env: { time: "night", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", -1.6, 2, "boss", "stand"), C("boss", "boss", 1.5, 0, "aboki", "stand")],
    shots: [
      { cam: wide([-8, 2, 7], [0, 1.4, 1], 50), fx: { fade: "in" }, lines: [
        L("aboki", "You knew who my father was. From the day I came to you."),
        L("boss", "(He doesn't flinch.) I knew who your father was from the day you came to me."),
        L("aboki", "So everything was planned? 'You dey ride?'... that was you on the phone."),
        L("boss", "That was me."),
      ] },
      { cam: close("boss", 1.3), lines: [
        L("boss", "I needed to know whether you were ready. The first delivery was a question. You answered. You didn't open the bag. You didn't stop. You didn't sell."),
        L("aboki", "You used me."),
        L("boss", "I protected you with the only tool I had. If The Circuit knew what you were, you'd be dead before your first race."),
        L("boss", "I looked for your father for eleven years, Aboki. He no want to be found."),
      ] },
      { cam: two("aboki", "boss", 3.2), fx: { sfx: "motif" }, lines: [
        L("boss", "(He gives him an old helmet, scratched, a yellow stripe worn thin.) Open the lining."),
        L("father", "If you are reading this, I am alive and you are strong enough. They will say I died. I chose to disappear because they will never stop hunting me.", { hold: 0.5 }),
        L("father", "I left the box where the ships sleep. Two keys. Names, money, every fixed race. Trust Boss. Do not trust the man who fixes your bike without charge.", { hold: 0.5 }),
        L("father", "Ride clean, my son. Whistle if you are afraid.", { hold: 0.5 }),
        L("aboki", "(He is whistling. Up, up, down.)"),
      ] },
    ]
  },
  kelechi_bike: {
    id: "kelechi_bike", title: "Kelechi's Workshop · Before dawn", stage: "oldgarage", env: { time: "night", weather: "overcast" }, music: "calm",
    cast: [C("aboki", "aboki", -1.1, 0.8, "kelechi", "stand"), C("kelechi", "kelechi", 1.0, -0.2, "aboki", "stand")],
    shots: [
      { cam: wide([-3, 1.8, 4.5], [0, 1.2, -1.8], 46), fx: { fade: "in" }, lines: [
        L("kelechi", "I no ask you to forgive me. I rewire the tank. New nitro line. Your papa frame, my best work. (He pushes the bike towards him.)"),
        L("kelechi", "Whatever you feel for me... this bike go carry you."),
        L("aboki", "Kele..."),
        L("kelechi", "Don't. Just ride."),
        L("aboki", "(He takes the handlebars. He doesn't say it's okay. He says:) Tell me the nitro line again."),
      ] },
    ]
  },

  // ---------------------------------------------------------------- FINAL
  ships_sleep: {
    id: "ships_sleep", title: "Apapa Port · 4:05 AM", stage: "port", env: { time: "night", weather: "rain" }, music: "tense",
    cast: [C("aboki", "aboki", 0, 1.8, undefined, "stand", { yaw: 0 })],
    shots: [
      { cam: wide([-5, 2, 6], [0, 1.3, -2], 46), fx: { fade: "in" }, lines: [
        L("aboki", "(He fits the two halves of the key together. Click.) Where the ships sleep."),
      ] },
      { cam: close("aboki", 1.3), act: [{ who: "aboki", do: "walk", to: [0, -0.4], speed: 1.2 }], dur: 4, fx: { sfx: "pickup" } },
      { cam: wide([2, 1.4, -0.4], [0, 1.0, -1.6], 36), fx: { sfx: "motif" }, lines: [
        L("aboki", "(He lifts a black box out of the dark. Names. Businesses. Money. Every fixed race.)"),
        L("boss", "Aboki. Whatever you do, do it quick.", { phone: true }),
        L("seyi", "Circuit riders at the port gate. I count nine.", { phone: true }),
        L("zara", "Police are moving too. They want it as well.", { phone: true }),
        L("bisi", "Everybody wants it. Everybody. Aboki, you're the most wanted man in Lagos.", { phone: true }),
      ] },
      { cam: close("aboki", 1.2), lines: [
        L("amaka", "Aboki? Amaka Obi. If the box reaches me at Eko Square before sunrise, The Circuit ends today.", { phone: true }),
        L("aboki", "(He zips the box into the bag.) Nobody else can get it out of Lagos safely."),
        L("aboki", "So I go do the only thing I know."),
        L("aboki", "One more delivery."),
      ], fx: { music: "off" } },
    ]
  },
  the_end: {
    id: "the_end", title: "Eko Square · Sunrise", stage: "street", env: { time: "dawn", weather: "clear" }, music: "calm",
    cast: [C("aboki", "aboki", -1.6, -1.4, "amaka", "stand"), C("amaka", "baba", 1.4, -1.5, "aboki", "stand", { hidden: true }), C("seyi", "seyi", 3.3, -1.2, "aboki", "lean"), C("zara", "zara", -3.7, -1.1, "aboki", "arms"), C("kelechi", "kelechi", 0.2, 0.3, "aboki", "stand")],
    shots: [
      { cam: wide([-4, 1.6, 6], [0, 1.4, -1.5], 44), fx: { fade: "in" }, lines: [
        L("news", "Breaking: sources confirm a major race-fixing and money-laundering network operating across Lagos for over a decade has been exposed.", { hold: 3 }),
        L("news", "Authorities have begun arrests. The network was known as The Circuit.", { hold: 2.5 }),
      ] },
      { cam: two("aboki", "seyi", 3.4), lines: [
        L("seyi", "It's over. Tunde... it's over."),
        L("zara", "Boss is clear. They found everything he kept for eleven years."),
      ] },
      { cam: close("aboki", 1.3), lines: [
        L("kelechi", "(He is standing a few metres off, hands empty.) I called the police myself. Told them everything. Names. Dates. My name first.", { phone: false }),
        L("aboki", "(He is quiet for a long time.) I forgive you, Kele."),
        L("aboki", "I'm not going to forget."),
        L("kelechi", "(His eyes fill.) I know. That's fair."),
        L("seyi", "Now. Aboki. We finish this properly."),
        L("aboki", "Wetin?"),
        L("seyi", "A race. No money. No Boss. No Circuit. Just us."),
      ] },
    ]
  },
  last_scene: {
    id: "last_scene", title: "Roadside · Morning", stage: "foodspot", env: { time: "day", weather: "clear" }, music: "calm",
    cast: [C("aboki", "aboki", 0, 0.4, "seyi", "sit"), C("seyi", "seyi", 2, 0.1, "aboki", "sit"), C("bisi", "bisi", -2, 0.1, "aboki", "sit"), C("kelechi", "kelechi", -1, -3, "aboki", "sit", { yaw: 180 }), C("mama", "mama", 0.4, -2.8, "aboki", "stand", { yaw: 180 }), C("boss", "boss", 4.5, 4, "aboki", "stand", { hidden: true }), C("aboki_bike", "aboki", 4, 3, undefined, "stand", { bike: "legendary", hidden: true, yaw: 270 })],
    shots: [
      { cam: wide([-3.5, 1.7, 5], [0, 1.0, -1], 46), fx: { fade: "in", music: "groove" }, lines: [
        L("seyi", "(to Aboki, mouth full) I still dey faster than you."),
        L("aboki", "(laughing) You dey dream."),
        L("mama", "Eat. All of you. Na free today."),
        L("bisi", "Mama Put gives free food? What did he do?"),
      ] },
      { cam: wide([2, 1.6, 6], [4, 1.3, 3], 44), act: [{ who: "boss", do: "show" }, { who: "boss", do: "walk", to: [1.5, 1.8], speed: 1.1 }], dur: 4 },
      { cam: two("aboki", "boss", 3.2), act: [{ who: "boss", do: "face", to: "aboki" }], lines: [
        L("boss", "(He looks at Aboki the way he looked at his bike.) So... what's next?"),
        L("aboki", "(He puts his helmet back on. Starts the bike.) I go find out."),
      ], fx: { sfx: "go" } },
      { cam: wide([-2, 1.4, 5], [4, 1.2, 3], 40), act: [{ who: "aboki_bike", do: "show" }, { who: "aboki_bike", do: "ride", from: [4, 3], to: [-18, 3], t: 3.2 }], dur: 3.2 },
      { cam: { k: "orbit", look: [0, 6, -30], r: 40, h: 4, a0: 0.2, a1: -0.4, fov: 52 }, dur: 6, fx: { music: "groove", title: { big: "ABOKI RIDERS", small: "THE LAST DELIVERY" } } },
      { cam: wide([0, 1.6, 6], [0, 1.4, 0]), dur: 3, fx: { fade: "black", sfx: "phone" }, lines: [
        L("unknown", "You think say na only one Circuit dey Lagos?", { phone: true }),
      ] },
    ]
  }
};

// ------------------------------------------------------------------------------------------------ MISSIONS
const r = (t: Comm["who"]) => t; void r;
const MISSIONS1: Record<string, MissionCfg> = {
  m1: {
    id: "m1", title: "₦30,000", chapter: "CHAPTER 1", map: "ojuelegba", env: { time: "golden", weather: "rain" }, bike: "starter", objective: "deliver",
    brief: "Pick up the black bag. Take it across Lagos. Don't open it. Don't stop. Give it only to the person in the message.",
    goalText: "DELIVER THE BAG TO BABA JIDE", timeLimit: 125, integrity: true, traffic: 1.15, reward: 30000,
    rivals: [{ rider: "shadow", bike: "speed", role: "pursuer", at: 850, skill: 0.78 }],
    roadblocks: [1650],
    comms: [
      { at: 30, who: "kelechi", text: "Bag secure? No open am o. Ride safe, Aboki!", alt: { ig: { t: "Akpa ahụ dị mma? Emeghekwala ya o. Jee nke ọma, Aboki!", g: "Is the bag safe? Don't open it o. Go well, Aboki!", say: "Ah-kpah ah-hoo dee mmah? Eh-meh-heh-kwah-lah yah oh. Jeh nkeh aw-mah, Ah-bo-kee!" } } },
      { at: 330, who: "aboki", text: "Danfo! DANFO! Oya, make you free road!" },
      { at: 700, who: "aboki", text: "Rain don start. Lagos rain plus traffic: na combo." },
      { at: 860, who: "aboki", text: "Who be this one for my back?", music: "tense" },
      { at: 1150, who: "aboki", text: "He dey follow me! Shortcut, shortcut!" },
      { at: 1580, who: "officer", text: "Police checkpoint ahead. Ride clean, no be circus!" },
      { at: 2100, who: "aboki", text: "Lost am? Please... lost am!", music: "groove" },
      { at: 2550, who: "aboki", text: "Almost there. Baba Jide, abeg no vex." }
    ]
  },
  m2: {
    id: "m2", title: "Surulere Suya", chapter: "CHAPTER 2", map: "surulere", env: { time: "golden", weather: "clear" }, bike: "lightweight", objective: "race", needPlace: 2,
    brief: "Beat Seyi to the end of the market. Finish in the top two or you're buying the suya.", goalText: "FINISH IN THE TOP 2", traffic: 0.6, reward: 15000, skipAfter: 3,
    rivals: [{ rider: "seyi", bike: "speed", role: "racer", skill: 0.78 }, { rider: "tobi", bike: "starter", role: "racer", skill: 0.6 }, { rider: "kobby", bike: "lightweight", role: "racer", skill: 0.62 }],
    comms: [
      { at: 120, who: "seyi", text: "Aboki! You dey see my back or na rumour?" },
      { at: 900, who: "bisi", text: "Cut the corner by the stalls! Mama Nkechi won't mind!" },
      { at: 1700, who: "seyi", text: "Pepper! Plenty pepper!" }
    ]
  },
  m3: {
    id: "m3", title: "Third Mainland", chapter: "CHAPTER 2", map: "third_mainland", env: { time: "golden", weather: "clear" }, bike: "lightweight", objective: "deliver",
    brief: "Another job, another bag. The bridge is long and fast. Keep it clean.", goalText: "DELIVER BEFORE THE TIME RUNS OUT", timeLimit: 135, integrity: true, traffic: 0.9, reward: 25000, rivals: [],
    comms: [
      { at: 100, who: "unknown", text: "Fast. Clean. No stops." },
      { at: 1200, who: "bisi", text: "Bridge deliveries? That's Boss's people. Everybody notices." },
      { at: 2500, who: "kelechi", text: "Sun dey go down. Use your lights, Aboki.", env: { time: "dusk", weather: "clear" } }
    ]
  },
  m4: {
    id: "m4", title: "Summoned", chapter: "CHAPTER 3", map: "apapa", env: { time: "dusk", weather: "rain" }, bike: "lightweight", objective: "deliver",
    brief: "Boss wants to see you. Apapa is wet, heavy and full of trucks. Get there in one piece.", goalText: "REACH BOSS'S GARAGE", timeLimit: 125, traffic: 1.3, reward: 5000, rivals: [],
    comms: [{ at: 200, who: "bisi", text: "Apapa road. Pray for tanker." }, { at: 1500, who: "kelechi", text: "Wet tarmac. Gentle with the brakes." }]
  },
  m5: {
    id: "m5", title: "VIP Delivery", chapter: "CHAPTER 4", map: "lekki", env: { time: "dusk", weather: "clear" }, bike: "speed", objective: "deliver",
    brief: "A VIP client on the island. The package can't have a scratch. Boss is watching the clock.", goalText: "DELIVER THE PACKAGE · NO SCRATCHES", timeLimit: 108, integrity: true, traffic: 0.8, reward: 40000,
    rivals: [{ rider: "zara_helmet", bike: "cafe", role: "watcher", skill: 0.9, at: 1500 }],
    comms: [
      { at: 120, who: "boss", text: "This one no fit scratch. Ride like somebody dey watch you." },
      { at: 1500, who: "aboki", text: "That blue helmet again... ahead of me." },
      { at: 2400, who: "bisi", text: "Island lights are on. Look how pretty." }
    ]
  },
  m6: {
    id: "m6", title: "OS Night", chapter: "CHAPTER 4", map: "vi_strip", env: { time: "night", weather: "clear" }, bike: "speed", objective: "race", needPlace: 2,
    brief: "Victoria Island strip. Four riders. Beat Seyi, impress the OS girls.", goalText: "FINISH IN THE TOP 2", traffic: 0.7, reward: 20000, skipAfter: 3,
    rivals: [{ rider: "seyi", bike: "elite", role: "racer", skill: 0.84 }, { rider: "emeka", bike: "speed", role: "racer", skill: 0.76 }, { rider: "ngozi", bike: "cafe", role: "racer", skill: 0.7 }],
    comms: [{ at: 150, who: "bisi", text: "The OS girls dey watch. No shame me!" }, { at: 1200, who: "seyi", text: "Borrowed engine, borrowed speed!" }]
  },
  m7: {
    id: "m7", title: "The Blue Helmet", chapter: "CHAPTER 5", map: "ojuelegba~m", env: { time: "night", weather: "rain" }, bike: "cafe", objective: "follow",
    brief: "Stay close to the blue helmet. Get alongside and don't lose him. This time you want answers.", goalText: "CATCH THE BLUE HELMET (stay within 12 m)", traffic: 0.8, reward: 0,
    rivals: [{ rider: "zara_helmet", bike: "elite", role: "leader", skill: 0.9 }],
    comms: [{ at: 40, who: "aboki", text: "There you are." }, { at: 1400, who: "aboki", text: "Not today. You no go lose me." }, { at: 2300, who: "zara", text: "Follow me. Keep up.", alt: { ha: { t: "Ku biyo ni. Kada ku bar baya.", g: "Follow me. Don't fall behind.", say: "Koo bee-yoh nee. Kah-dah koo bar bah-yah." } } }]
  },
  m8: {
    id: "m8", title: "The Circuit", chapter: "CHAPTER 6", map: "apapa~r", env: { time: "night", weather: "rain" }, bike: "elite", objective: "race", needPlace: 2,
    brief: "An old Circuit race on the port road. Black helmets everywhere. Win it and you're in.", goalText: "FINISH IN THE TOP 2", traffic: 0.5, reward: 40000, skipAfter: 3,
    rivals: [{ rider: "seyi", bike: "elite", role: "racer", skill: 0.86 }, { rider: "shadow", bike: "speed", role: "racer", skill: 0.82 }, { rider: "tobi", bike: "speed", role: "racer", skill: 0.74 }],
    comms: [{ at: 100, who: "seyi", text: "Don't look at the black helmets. They dey watch you." }, { at: 1800, who: "zara", text: "Left lane's clean. Go." }]
  },
  m9: {
    id: "m9", title: "Out of the OS", chapter: "CHAPTER 8", map: "vi_strip~rm", env: { time: "night", weather: "rain" }, bike: "elite", objective: "escape",
    brief: "Circuit riders saw you at the door. Shake them off before the strip ends.", goalText: "ESCAPE THE CIRCUIT", traffic: 0.9, reward: 0, roadblocks: [1300, 2000],
    rivals: [{ rider: "shadow", bike: "speed", role: "pursuer", at: 150, skill: 0.84 }, { rider: "guard", bike: "speed", role: "pursuer", at: 350, skill: 0.8 }],
    comms: [{ at: 80, who: "bisi", text: "They're behind you! Two of them!", music: "tense", siren: false }, { at: 1200, who: "seyi", text: "Roadblock ahead. Take the left gap!" }]
  },
  m10: {
    id: "m10", title: "Storm", chapter: "CHAPTER 9", map: "oshodi~r", env: { time: "night", weather: "storm" }, bike: "elite", objective: "escape",
    brief: "He rides angry into the storm and the Circuit finds him. Hold on.", goalText: "SURVIVE THE STORM", traffic: 1, reward: 0, roadblocks: [1200, 1900, 2400],
    rivals: [{ rider: "shadow", bike: "speed", role: "pursuer", at: 200, skill: 0.88 }, { rider: "guard", bike: "speed", role: "pursuer", at: 400, skill: 0.84 }],
    comms: [{ at: 60, who: "aboki", text: "(He is whistling, badly.)", music: "tense" }, { at: 1100, who: "boss", text: "Aboki! Left onto the flyover. I'm clearing the road." }]
  },
  m11: {
    id: "m11", title: "THE LAST DELIVERY", chapter: "FINAL CHAPTER", map: "citywide", env: { time: "night", weather: "rain" }, bike: "legendary", objective: "final",
    brief: "The whole city is chasing the box. Everything you learned counts now.", goalText: "GET THE BOX TO EKO SQUARE", noCountdown: true, minimalHud: true, integrity: true, traffic: 1.1, reward: 100000,
    rivals: [
      { rider: "shadow", bike: "speed", role: "pursuer", at: 200, skill: 0.9 }, { rider: "guard", bike: "speed", role: "pursuer", at: 600, skill: 0.86 },
      { rider: "seyi", bike: "elite", role: "ally", at: 1500, skill: 0.88 }, { rider: "zara_helmet", bike: "cafe", role: "ally", at: 2600, skill: 0.88 },
      { rider: "boss", bike: "heavy", role: "ally", at: 4100, skill: 0.84 }
    ],
    roadblocks: [900, 1700, 2500, 3400, 4600, 5400],
    shortcuts: [{ at: 1200, label: "OJUELEGBA FLYOVER CUT" }, { at: 2250, label: "SURULERE MARKET CUT-THROUGH" }, { at: 3100, label: "OLD CIRCUIT SHORTCUT" }],
    comms: [
      { at: 10, who: "aboki", text: "(He whistles, once. Up, up, down.)", music: "off" },
      { at: 700, who: "kelechi", text: "I rewired the tank. NITRO. Don't waste am.", music: "groove" },
      { at: 1450, who: "seyi", text: "I dey your left! Nobody touch am!" },
      { at: 2200, who: "unknown", text: "Zara here. Port road is shut. Use the market." , env: { time: "night", weather: "storm" } },
      { at: 3000, who: "chairman", text: "Give me the box and I'll leave you your life.", siren: true },
      { at: 4050, who: "boss", text: "Eleven years I wait for this ride. Go, Aboki!" },
      { at: 5300, who: "amaka", text: "I can see the square. Keep coming!", env: { time: "dawn", weather: "overcast" } }
    ]
  },
  m12: {
    id: "m12", title: "The Proper Race", chapter: "THE END", map: "lekki_epe", env: { time: "dawn", weather: "clear" }, bike: "elite", objective: "race", needPlace: 1,
    brief: "No Boss. No Circuit. No money. Just Aboki and Seyi.", goalText: "BEAT SEYI", traffic: 0.3, reward: 5000, skipAfter: 2,
    rivals: [{ rider: "seyi", bike: "elite", role: "racer", skill: 0.8 }],
    comms: [{ at: 100, who: "seyi", text: "I still dey faster than you." }, { at: 1800, who: "aboki", text: "Come and prove am!" }]
  }
};

// ------------------------------------------------------------------------------------------------ ORDER OF PLAY
export const SEQUENCE: Node[] = [
  { type: "chapter", title: "CHAPTER 1", sub: "₦30,000" }, { type: "cutscene", id: "cracked_screen" }, { type: "mission", id: "m1" }, { type: "cutscene", id: "who_send_you" },
  { type: "chapter", title: "CHAPTER 2", sub: "THE MONEY" }, { type: "cutscene", id: "morning_after" }, { type: "cutscene", id: "seyi_arrives" }, { type: "mission", id: "m2" }, { type: "cutscene", id: "word_dey_go_round" }, { type: "cutscene", id: "oshodi_conductor" }, { type: "mission", id: "m_oshodi" }, { type: "mission", id: "m3" },
  { type: "chapter", title: "CHAPTER 3", sub: "WHO IS BOSS?" }, { type: "cutscene", id: "who_is_boss" }, { type: "mission", id: "m4" }, { type: "cutscene", id: "boss_garage" },
  { type: "chapter", title: "CHAPTER 4", sub: "BOSS' RIDER" }, { type: "cutscene", id: "upgrades" }, { type: "mission", id: "m5" }, { type: "mission", id: "m6" }, { type: "cutscene", id: "ajegunle_call" }, { type: "mission", id: "m_ajegunle" }, { type: "cutscene", id: "ajegunle_tunde" }, { type: "cutscene", id: "blue_helmet_teaser" },
  { type: "chapter", title: "CHAPTER 5", sub: "THE BLUE HELMET" }, { type: "cutscene", id: "nobody_talk" }, { type: "mission", id: "m7" }, { type: "cutscene", id: "zara" }, { type: "cutscene", id: "titi_promise" }, { type: "mission", id: "m_ikorodu" }, { type: "cutscene", id: "titi_speech" },
  { type: "chapter", title: "CHAPTER 6", sub: "WHO IS ABOKI?" }, { type: "cutscene", id: "baba_tells" }, { type: "mission", id: "m8" }, { type: "cutscene", id: "seyi_secret" }, { type: "cutscene", id: "makoko_canoe" }, { type: "mission", id: "m_makoko" },
  { type: "chapter", title: "CHAPTER 7", sub: "EVERYTHING CONNECTS" }, { type: "cutscene", id: "hidden_compartment" }, { type: "cutscene", id: "ikeja_airport" }, { type: "mission", id: "m_ikeja" },
  { type: "chapter", title: "CHAPTER 8", sub: "THE OS" }, { type: "cutscene", id: "os_lounge" }, { type: "mission", id: "m9" },
  { type: "chapter", title: "CHAPTER 9", sub: "BETRAYAL" }, { type: "cutscene", id: "spanner" }, { type: "mission", id: "m10" },
  { type: "chapter", title: "CHAPTER 10", sub: "BOSS VS ABOKI" }, { type: "cutscene", id: "boss_vs_aboki" }, { type: "cutscene", id: "kelechi_bike" },
  { type: "chapter", title: "FINAL CHAPTER", sub: "THE LAST DELIVERY" }, { type: "cutscene", id: "ships_sleep" }, { type: "mission", id: "m11" },
  { type: "chapter", title: "THE END", sub: "" }, { type: "cutscene", id: "the_end" }, { type: "mission", id: "m12" }, { type: "cutscene", id: "last_scene" }
];

export const CUTSCENES: Record<string, Cutscene> = { ...CUTSCENES1, ...CUTSCENES2 };
export const MISSIONS: Record<string, MissionCfg> = { ...MISSIONS1, ...MISSIONS2 };

export const bikeForStep = (id: string) => MISSIONS[id]?.bike ?? "starter";
