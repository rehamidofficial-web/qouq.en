// Memilih suara bawaan browser berdasarkan aksen (US/UK/AU) dan jenis suara (wanita/pria).
// Browser tidak memberi tahu jenis kelamin suara, jadi kita menebak dari namanya.

export type Accent = "US" | "UK" | "AU";
export type Gender = "FEMALE" | "MALE";

export const ACCENT_LANG: Record<Accent, string> = { US: "en-us", UK: "en-gb", AU: "en-au" };

const FEMALE_RE =
  /female|woman|zira|hazel|susan|samantha|victoria|karen|moira|tessa|fiona|catherine|aria|jenny|libby|sonia|natasha|clara|emma|michelle|ava|joanna|kendra|kimberly|salli|ivy|amy|olivia|nicole|zoe|allison|serena|kate|heera|linda|jessa/i;
const MALE_RE =
  /\bmale\b|\bman\b|david|mark|george|alex|daniel|fred|ryan|thomas|guy|davis|james|richard|oliver|arthur|aaron|brian|eric|liam|roger|steffan|tom\b|matthew|joey|justin|kevin|rishi|ravi|gordon/i;

export function guessGender(v: SpeechSynthesisVoice): Gender | null {
  if (FEMALE_RE.test(v.name)) return "FEMALE"; // dicek dulu: kata "female" mengandung "male"
  if (MALE_RE.test(v.name)) return "MALE";
  return null;
}

const norm = (lang: string) => lang.replace("_", "-").toLowerCase();

// Suara "Natural/Online" biasanya lebih enak didengar, jadi didahulukan.
function quality(v: SpeechSynthesisVoice) {
  let s = 0;
  if (/natural|online/i.test(v.name)) s += 2;
  if (!v.localService) s += 1;
  return s;
}

function best(list: SpeechSynthesisVoice[]) {
  return [...list].sort((a, b) => quality(b) - quality(a))[0] ?? null;
}

export type Pick = {
  voice: SpeechSynthesisVoice | null;
  // "" = cocok persis. Selain itu = suara cadangan, dan alasannya:
  reason: "" | "unknown-gender" | "gender" | "accent" | "any" | "none";
};

export function pickVoice(voices: SpeechSynthesisVoice[], accent: Accent, gender: Gender): Pick {
  const english = voices.filter((v) => norm(v.lang).startsWith("en"));
  if (english.length === 0) return { voice: null, reason: "none" };

  const sameAccent = english.filter((v) => norm(v.lang) === ACCENT_LANG[accent]);

  const exact = best(sameAccent.filter((v) => guessGender(v) === gender));
  if (exact) return { voice: exact, reason: "" };

  const unknown = best(sameAccent.filter((v) => guessGender(v) === null));
  if (unknown) return { voice: unknown, reason: "unknown-gender" };

  const otherGender = best(sameAccent);
  if (otherGender) return { voice: otherGender, reason: "gender" };

  const otherAccent = best(english.filter((v) => guessGender(v) === gender));
  if (otherAccent) return { voice: otherAccent, reason: "accent" };

  return { voice: best(english), reason: "any" };
}

export function reasonNote(reason: Pick["reason"], accent: Accent, gender: Gender): string | null {
  const g = gender === "FEMALE" ? "wanita" : "pria";
  switch (reason) {
    case "":
      return null;
    case "unknown-gender":
      return `Perangkat ini tidak menyebutkan jenis suaranya, jadi suara ${g} aksen ${accent} tidak bisa dipastikan.`;
    case "gender":
      return `Suara ${g} aksen ${accent} tidak tersedia di perangkat ini. Memakai suara cadangan.`;
    case "accent":
      return `Aksen ${accent} tidak tersedia di perangkat ini. Memakai aksen lain sebagai suara cadangan.`;
    case "any":
      return "Suara yang diminta tidak tersedia. Memakai suara bahasa Inggris cadangan.";
    case "none":
      return "Perangkat ini belum punya suara bahasa Inggris. Suara bawaan browser dipakai sebisanya.";
  }
}
