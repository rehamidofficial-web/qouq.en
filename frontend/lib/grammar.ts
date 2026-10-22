// Bentuk data dari backend untuk latihan grammar.
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

export type TopicItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: Level;
  lessonCount: number;
  questionCount: number;
};

export type Lesson = { id: string; title: string; summary: string; examples: string | null };
export type Option = { id: string; text: string };
export type Question = {
  id: string;
  type: "MULTIPLE_CHOICE" | "FILL_BLANK";
  prompt: string;
  level: Level;
  options: Option[];
};
export type TopicDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: Level;
  lessons: Lesson[];
  questions: Question[];
};

export type GrammarProgress = { topics: { topicId: string; bestScore: number; attempts: number }[] };

export type AnswerResult = {
  questionId: string;
  type: string;
  prompt: string;
  correct: boolean;
  yourAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
};
export type GrammarResult = {
  attemptId: string;
  topicId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  label: string;
  feedback: string;
  results: AnswerResult[];
};

// Jawaban sementara pengguna untuk satu soal.
export type Answer = { optionId?: string; text?: string };

export const levelChip = (l: Level) => (l === "A1" ? "chip-ok" : "chip-gold");

export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (!a) return false;
  return q.type === "MULTIPLE_CHOICE" ? Boolean(a.optionId) : Boolean(a.text && a.text.trim());
}

// Pecah teks aturan jadi kalimat-kalimat pendek supaya mudah dibaca.
export function splitSentences(text: string): string[] {
  // Tanda baris baru disisipkan setelah titik/tanda tanya/seru, lalu dipecah. (Tanpa fitur regex yang
  // belum didukung browser lama.)
  return text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Contoh dipisah dengan tanda " | " di database.
export function splitExamples(text: string | null): string[] {
  return (text ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Pecah soal pada garis kosong "___" supaya bagian kosongnya bisa digambar sendiri.
export function splitPrompt(prompt: string): string[] {
  return prompt.split(/_{3,}/);
}

export function labelId(label: string): string {
  switch (label) {
    case "Excellent":
      return "Bagus sekali!";
    case "Good":
      return "Bagus";
    case "Needs practice":
      return "Perlu latihan";
    default:
      return "Coba lagi";
  }
}
