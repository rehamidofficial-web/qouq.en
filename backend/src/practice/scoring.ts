// Pembanding kata dan rumus skor latihan berbicara (PRD bagian 10).
// Semua fungsi di sini "murni": tidak menyentuh database, jadi mudah dites.

export type WordStatus = 'correct' | 'wrong' | 'missing' | 'extra';

export interface WordResult {
  status: WordStatus;
  target?: string; // kata yang seharusnya (kosong kalau "extra")
  heard?: string; // kata yang terdengar (kosong kalau "missing")
}

export interface ScoreResult {
  words: WordResult[];
  totalTarget: number;
  correctCount: number;
  wrongCount: number;
  missingCount: number;
  extraCount: number;
  wordScore: number; // 0 sampai 1
  orderScore: number; // 0 sampai 1
  confidenceScore: number | null; // 0 sampai 1, null kalau tidak dikirim
  finalScore: number; // 0 sampai 100
  label: string;
  feedback: string;
}

export const WEIGHTS = { word: 0.6, order: 0.2, confidence: 0.2 };

/** Huruf kecil, buang tanda baca, pecah jadi daftar kata. Apostrof (') dipertahankan. */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, '$1')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** Cocokkan kata target dengan kata yang terdengar (cara edit distance). */
export function alignWords(
  target: string[],
  spoken: string[],
): { words: WordResult[]; distance: number } {
  const n = target.length;
  const m = spoken.length;
  const d: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = target[i - 1] === spoken[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j - 1] + cost,
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
      );
    }
  }

  const words: WordResult[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      d[i][j] === d[i - 1][j - 1] + (target[i - 1] === spoken[j - 1] ? 0 : 1)
    ) {
      if (target[i - 1] === spoken[j - 1]) {
        words.push({ status: 'correct', target: target[i - 1], heard: spoken[j - 1] });
      } else {
        words.push({ status: 'wrong', target: target[i - 1], heard: spoken[j - 1] });
      }
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      words.push({ status: 'missing', target: target[i - 1] });
      i--;
    } else {
      words.push({ status: 'extra', heard: spoken[j - 1] });
      j--;
    }
  }
  words.reverse();
  return { words, distance: d[n][m] };
}

export function labelFor(score: number): { label: string; feedback: string } {
  if (score >= 90) {
    return { label: 'Excellent', feedback: 'Bagus sekali! Lanjut ke kalimat berikutnya.' };
  }
  if (score >= 75) {
    return { label: 'Good', feedback: 'Bagus. Coba perbaiki kata yang ditandai.' };
  }
  if (score >= 50) {
    return {
      label: 'Needs practice',
      feedback: 'Dengarkan contoh lagi, lalu coba ulang.',
    };
  }
  return {
    label: 'Try again',
    feedback: 'Putar contoh dengan pelan, lihat ejaannya, lalu coba lagi.',
  };
}

/**
 * skor_akhir = 0.6 x skor_kata + 0.2 x skor_urutan + 0.2 x skor_keyakinan
 * Kalau keyakinan (confidence) tidak dikirim, bobotnya dibagi ke dua skor lain.
 */
export function scoreSpeech(
  targetText: string,
  spokenText: string,
  confidence?: number | null,
): ScoreResult {
  const target = normalizeWords(targetText);
  const spoken = normalizeWords(spokenText);
  const { words, distance } = alignWords(target, spoken);

  // skor_kata: berapa kata target yang terucap (urutan tidak dihitung di sini)
  const pool = new Map<string, number>();
  for (const w of spoken) pool.set(w, (pool.get(w) ?? 0) + 1);
  let matched = 0;
  for (const w of target) {
    const left = pool.get(w) ?? 0;
    if (left > 0) {
      matched++;
      pool.set(w, left - 1);
    }
  }
  const wordScore = target.length === 0 ? 0 : matched / target.length;

  // skor_urutan: kemiripan urutan kata (edit distance)
  const longest = Math.max(target.length, spoken.length, 1);
  const orderScore = Math.max(0, 1 - distance / longest);

  const hasConfidence = typeof confidence === 'number' && Number.isFinite(confidence);
  const confidenceScore = hasConfidence
    ? Math.min(1, Math.max(0, confidence as number))
    : null;

  let final: number;
  if (confidenceScore === null) {
    const rest = WEIGHTS.word + WEIGHTS.order;
    final = (WEIGHTS.word / rest) * wordScore + (WEIGHTS.order / rest) * orderScore;
  } else {
    final =
      WEIGHTS.word * wordScore +
      WEIGHTS.order * orderScore +
      WEIGHTS.confidence * confidenceScore;
  }
  const finalScore = Math.round(final * 100);
  const { label, feedback } = labelFor(finalScore);

  const count = (s: WordStatus) => words.filter((w) => w.status === s).length;
  return {
    words,
    totalTarget: target.length,
    correctCount: count('correct'),
    wrongCount: count('wrong'),
    missingCount: count('missing'),
    extraCount: count('extra'),
    wordScore,
    orderScore,
    confidenceScore,
    finalScore,
    label,
    feedback,
  };
}
