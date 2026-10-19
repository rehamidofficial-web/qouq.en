// Bentuk data dari backend (/dictionary/...). Dipakai halaman Kamus.
export type WordItem = {
  id: string;
  headword: string;
  score: number;
  // dua field ini baru ada setelah backend diperbarui; kalau belum, dianggap kosong
  level?: string | null;
  pos?: string[];
};

export type SearchResult = { page: number; hasMore: boolean; items: WordItem[] };

export type Example = { id: string; textEn: string; textId: string; sortOrder: number };

export type Sense = {
  id: string;
  partOfSpeech: string;
  meaningId: string;
  definitionEn: string | null;
  sortOrder: number;
  examples: Example[];
};

export type Relation = {
  id: string;
  type: "SYNONYM" | "ANTONYM";
  relatedEntry: { id: string; headword: string };
};

export type Entry = {
  id: string;
  headword: string;
  phoneticIpa: string | null;
  phoneticEasy: string | null;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | null;
  senses: Sense[];
  relations?: Relation[];
};

const POS: Record<string, string> = {
  NOUN: "noun",
  VERB: "verb",
  ADJECTIVE: "adjective",
  ADVERB: "adverb",
  PRONOUN: "pronoun",
  PREPOSITION: "preposition",
  CONJUNCTION: "conjunction",
  INTERJECTION: "interjection",
  DETERMINER: "determiner",
  OTHER: "lainnya",
};

const POS_SHORT: Record<string, string> = {
  NOUN: "noun",
  VERB: "verb",
  ADJECTIVE: "adj",
  ADVERB: "adv",
  PRONOUN: "pron",
  PREPOSITION: "prep",
  CONJUNCTION: "conj",
  INTERJECTION: "interj",
  DETERMINER: "det",
  OTHER: "lain",
};

export function posLabel(value: string) {
  return POS[value] ?? value.toLowerCase();
}

export function posShort(value: string) {
  return POS_SHORT[value] ?? value.toLowerCase();
}
