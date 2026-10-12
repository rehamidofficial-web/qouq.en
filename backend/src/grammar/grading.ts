// Fungsi penilaian soal grammar. "Murni": tidak menyentuh database, jadi mudah dites.

/** Huruf kecil, apostrof disamakan, spasi dirapikan, tanda baca di ujung dibuang. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:]+$/g, '')
    .trim();
}

/** Jawaban isian benar kalau sama dengan salah satu jawaban yang diterima. */
export function isFillCorrect(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(answer);
  if (a === '') return false;
  return accepted.some((x) => normalizeAnswer(x) === a);
}

/** Skor 0 sampai 100 (dibulatkan). */
export function percent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
