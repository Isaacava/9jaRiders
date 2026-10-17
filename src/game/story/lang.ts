// "Whole 9ja vibe": every character falls back on their own mother tongue. In MIX mode the subtitle keeps the Pidgin the
// story is written in, but characters drop real Yoruba / Igbo / Hausa words and phrases into it (always glossed in
// English underneath), and key moments are written fully in the native language (Line.alt). PIDGIN mode shows the plain
// script. Also produces a phonetic "say" version because device voices cannot pronounce tone marks.
import { tongueOf, type Tongue } from "./cast";

export type LangMode = "mix" | "pidgin";
export const LANG_KEY = "aboki:lang";
export const getLangMode = (): LangMode => { try { return window.localStorage.getItem(LANG_KEY) === "pidgin" ? "pidgin" : "mix"; } catch { return "mix"; } };
export const setLangMode = (m: LangMode) => { try { window.localStorage.setItem(LANG_KEY, m); } catch { /* ignore */ } };

/** a line written fully in a native language: shown text, English meaning, phonetic spelling for speech */
export type Alt = { t: string; g: string; say?: string };
export type AltMap = Partial<Record<"yo" | "ig" | "ha", Alt>>;

type Tag = { t: string; g: string; say: string; pos: "pre" | "post" };
const TAGS: Record<"yo" | "ig" | "ha" | "pcm", Tag[]> = {
  yo: [
    { t: "Ọ̀gá,", g: "boss / sir", say: "Aw-gah,", pos: "pre" },
    { t: "Àbúrò mi,", g: "my younger one", say: "Ah-boo-roh mee,", pos: "pre" },
    { t: "Ẹ̀gbọ́n,", g: "big brother / sister", say: "Eg-baw,", pos: "pre" },
    { t: "Háà!", g: "(shock)", say: "Haa!", pos: "pre" },
    { t: "Ẹ jọ̀ọ́,", g: "please", say: "Eh jaw-aw,", pos: "pre" },
    { t: "Ọ̀rẹ́ mi,", g: "my friend", say: "Aw-reh mee,", pos: "pre" },
    { t: "Ó dáa.", g: "it is fine", say: "Oh daa.", pos: "pre" },
    { t: "Ṣebí", g: "isn't it so?", say: "Shay-bee", pos: "pre" },
    { t: "Mo gbọ́.", g: "I hear you", say: "Moh gbaw.", pos: "pre" },
    { t: ", ṣé o gbọ́?", g: "you hear?", say: ", shay oh gbaw?", pos: "post" },
    { t: ", ẹ̀yin ọmọ Lagos.", g: "you children of Lagos", say: ", eh-yin aw-maw Lagos.", pos: "post" }
  ],
  ig: [
    { t: "Nna m,", g: "my father / dear one", say: "Nnah mm,", pos: "pre" },
    { t: "Nwanne m,", g: "my sibling", say: "Nwah-neh mm,", pos: "pre" },
    { t: "Chineke!", g: "God! (shock)", say: "Chee-neh-keh!", pos: "pre" },
    { t: "Biko,", g: "please", say: "Bee-ko,", pos: "pre" },
    { t: "Ewoo,", g: "oh no", say: "Eh-woh,", pos: "pre" },
    { t: "Ndo,", g: "sorry", say: "N-doh,", pos: "pre" },
    { t: "Ka o dị,", g: "so be it", say: "Kah oh dee,", pos: "pre" },
    { t: ", ị nụ?", g: "you hear?", say: ", ee noo?", pos: "post" },
    { t: ", nu.", g: "(emphasis)", say: ", noo.", pos: "post" },
    { t: ", o ji kwa?", g: "is that not so?", say: ", oh jee kwah?", pos: "post" }
  ],
  ha: [
    { t: "Wallahi,", g: "I swear", say: "Wa-lah-hee,", pos: "pre" },
    { t: "Abokina,", g: "my friend", say: "Ah-bo-kee-nah,", pos: "pre" },
    { t: "Haba!", g: "come on!", say: "Hah-bah!", pos: "pre" },
    { t: "Sannu,", g: "take it easy", say: "Sah-noo,", pos: "pre" },
    { t: "To,", g: "well then", say: "Toh,", pos: "pre" },
    { t: "Ya Allah,", g: "oh God", say: "Yah Ah-lah,", pos: "pre" },
    { t: ", ka ji?", g: "you hear?", say: ", kah jee?", pos: "post" },
    { t: ", ko?", g: "right?", say: ", koh?", pos: "post" },
    { t: ", Insha Allah.", g: "God willing", say: ", In-shah Ah-lah.", pos: "post" }
  ],
  pcm: [
    { t: "Oya,", g: "", say: "Oh-yah,", pos: "pre" }, { t: "Ehen,", g: "", say: "Eh-hen,", pos: "pre" }, { t: "Chai!", g: "", say: "Chai!", pos: "pre" },
    { t: ", sha.", g: "", say: ", shah.", pos: "post" }, { t: ", abi?", g: "", say: ", ah-bee?", pos: "post" }
  ]
};

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Pidgin / Lagos words the device voice would mangle, respelled so it sounds right */
const SAY: Array<[RegExp, string]> = [
  [/\bwetin\b/gi, "weh-teen"], [/\babeg\b/gi, "ah-beg"], [/\boga\b/gi, "oh-gah"], [/\boya\b/gi, "oh-yah"], [/\bwahala\b/gi, "wah-ha-lah"],
  [/\bdey\b/gi, "day"], [/\bna\b/gi, "nah"], [/\bno be\b/gi, "no bee"], [/\bsha\b/gi, "shah"], [/\bomo\b/gi, "aw-maw"], [/\bchai\b/gi, "chai"],
  [/\bsabi\b/gi, "sah-bee"], [/\bpikin\b/gi, "pee-kin"], [/\bwey\b/gi, "way"], [/\bsef\b/gi, "seff"], [/\bdon\b/gi, "dawn"], [/\bwan\b/gi, "wahn"],
  [/\bko\b/gi, "koh"], [/\bwallahi\b/gi, "wa-lah-hee"], [/\bnaira\b/gi, "nye-rah"], [/₦/g, "naira "], [/\bdanfo\b/gi, "dan-foh"], [/\bkeke\b/gi, "keh-keh"],
  [/\bOjuelegba\b/g, "Oh-joo-eh-leg-bah"], [/\bOshodi\b/g, "Oh-sho-dee"], [/\bAjegunle\b/g, "Ah-jeh-goon-leh"], [/\bMakoko\b/g, "Mah-ko-ko"], [/\bIkorodu\b/g, "Ee-ko-ro-doo"],
  [/\bIkeja\b/g, "Ee-keh-jah"], [/\bSurulere\b/g, "Soo-roo-leh-reh"], [/\bApapa\b/g, "Ah-pah-pah"], [/\bLekki\b/g, "Leh-kee"], [/\bYaba\b/g, "Yah-bah"]
];
/** text a speech engine can read: stage directions and emoji removed, Lagos words respelled */
export function speakable(text: string): string {
  let t = text.replace(/\([^)]*\)/g, " ").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ").replace(/…/g, "...").replace(/[*_]/g, "");
  for (const [re, to] of SAY) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}

export type Flavored = { text: string; gloss: string; say: string; tongue: Tongue; native: boolean };

/**
 * Applies the character's mother tongue to a line.
 *  - authored alt for the speaker's tongue  -> the whole line in that language (+ English meaning)
 *  - otherwise (MIX) some lines get a short real-language opener / tag, deterministic per line so it never changes between plays
 */
export function flavor(who: string, text: string, mode: LangMode, alt?: AltMap, phone?: boolean): Flavored {
  const tongue = tongueOf(who);
  const plain: Flavored = { text, gloss: "", say: speakable(text), tongue, native: false };
  if (mode === "pidgin" || who === "narrator") return plain;
  if (tongue === "yo" || tongue === "ig" || tongue === "ha") {
    const a = alt?.[tongue];
    if (a) return { text: a.t, gloss: a.g, say: a.say ?? a.t, tongue, native: true };
  }
  if (tongue === "en") return plain;
  const raw = text.trim();
  if (raw.startsWith("(") || raw.length < 14 || raw.length > 150) return plain; // stage directions, one-word replies, long speeches stay as written
  const h = hash(who + "|" + raw);
  const chance = tongue === "pcm" ? 22 : phone ? 30 : 42;
  if (h % 100 >= chance) return plain;
  const pool = /\?\s*$/.test(raw) ? TAGS[tongue].filter((t) => t.pos === "pre") : TAGS[tongue]; // a question keeps its question mark
  const tag = pool[(h >>> 8) % pool.length];
  const body = raw;
  const lowered = tag.pos === "pre" && /[,]$/.test(tag.t) ? body.charAt(0).toLowerCase() + body.slice(1) : body;
  const shown = tag.pos === "pre" ? `${tag.t} ${/^[A-Z]{2,}|^I\b|^I'/.test(body) ? body : lowered}` : `${body.replace(/[.!?]+$/, "")}${tag.t}`;
  const said = tag.pos === "pre" ? `${tag.say} ${speakable(shown.slice(tag.t.length))}` : `${speakable(body.replace(/[.!?]+$/, ""))}${tag.say}`;
  return { text: shown, gloss: tag.g ? `${tag.t.replace(/[,.!]+$/g, "").replace(/^, ?/, "")} = ${tag.g}` : "", say: said, tongue, native: false };
}
