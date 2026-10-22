import type { SentenceItem, SentencePage } from "@/lib/latih";

// Bentuk data hasil penilaian dari backend (/practice/compare dan /practice/sessions/:id/attempts).
export type WordStatus = "correct" | "wrong" | "missing" | "extra";

export type WordResult = {
  status: WordStatus;
  target?: string; // kata yang seharusnya (kosong kalau "extra")
  heard?: string; // kata yang terdengar (kosong kalau "missing")
};

export type Score = {
  words: WordResult[];
  totalTarget: number;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
  extraCount: number;
  wordScore: number;
  orderScore: number;
  confidenceScore: number | null;
  finalScore: number; // 0 sampai 100
  label: string;
  feedback: string;
};

export type AttemptResult = Score & { attemptId?: string; sentenceId?: string; targetText?: string };

// Kemajuan pengguna (butuh login).
export type ProgressItem = SentenceItem & { bestScore: number | null; attempts: number };
export type ProgressPage = Omit<SentencePage, "items"> & {
  items: ProgressItem[];
  summary: { done: number; total: number };
};
export type CategoryProgress = { categories: { categoryId: string; practiced: number }[] };

// Warna skor: hijau (bagus), kuning (cukup), merah (perlu latihan).
export function scoreTone(score: number): "ok" | "mid" | "bad" {
  if (score >= 75) return "ok";
  if (score >= 50) return "mid";
  return "bad";
}

export const TONE_CLASS = {
  ok: "bg-okbg text-ok",
  mid: "bg-warnbg text-warn",
  bad: "bg-badbg text-bad",
} as const;

// Posisi sebuah kalimat di dalam kategorinya (untuk "43/100" dan tombol "Kalimat berikutnya").
export type Neighbors = { position: number; total: number; prevId: string | null; nextId: string | null };
