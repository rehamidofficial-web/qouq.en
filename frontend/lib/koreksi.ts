import type { WordResult } from "@/lib/practice";

export const STATUS_LABEL: Record<WordResult["status"], string> = {
  correct: "Benar",
  wrong: "Salah ucap",
  missing: "Terlewat",
  extra: "Tambahan",
};

export type Penjelasan = { detail: string; tip: string | null };

// Menebak "apa yang kurang" dengan membandingkan kata target dan kata yang terdengar.
function bedaWord(target: string, heard: string): string {
  if (target.endsWith("es") && heard === target.slice(0, -2)) return "kurang bunyi akhiran -es";
  if (target.endsWith("s") && heard === target.slice(0, -1)) return "kurang bunyi -s di akhir";
  if (target.endsWith("ed") && (heard === target.slice(0, -2) || heard === target.slice(0, -1))) return "kurang bunyi akhiran -ed";
  if (heard.startsWith(target)) return "ada bunyi tambahan di akhir";
  if (target.startsWith(heard)) return "bagian akhir kata belum terdengar";
  return "terdengar berbeda dari kata yang dimaksud";
}

// Saran singkat berdasarkan bunyi yang sering sulit bagi penutur bahasa Indonesia.
function saranBunyi(target: string): string {
  if (/th/.test(target)) return "Untuk “th”, letakkan ujung lidah di antara gigi atas dan bawah, lalu hembuskan udara.";
  if (/ed$/.test(target)) return "Akhiran -ed dibunyikan /t/, /d/, atau /ɪd/. Jangan dihilangkan.";
  if (/es$|s$/.test(target)) return "Akhiri dengan desis “s” yang jelas.";
  if (/v/.test(target)) return "Untuk “v”, gigi atas menyentuh bibir bawah dan suara ikut bergetar (bukan “f”).";
  if (/^r|r$/.test(target)) return "Bunyi “r” Inggris: lidah ditarik sedikit ke belakang, tidak digetarkan.";
  return "Putar kata ini dengan pelan, lihat ejaannya, lalu ulangi kata ini saja.";
}

export function jelaskan(w: WordResult, katSebelumnya?: string): Penjelasan {
  switch (w.status) {
    case "correct":
      return { detail: "Ucapanmu sudah tepat.", tip: null };
    case "wrong": {
      const target = w.target ?? "";
      const heard = w.heard ?? "";
      return { detail: `Terdengar: “${heard}” (${bedaWord(target, heard)})`, tip: saranBunyi(target) };
    }
    case "missing":
      return {
        detail: katSebelumnya ? `Kata ini tidak terdengar. Ia ada setelah “${katSebelumnya}”.` : "Kata ini tidak terdengar. Ia ada di awal kalimat.",
        tip: "Ucapkan semua kata tanpa terburu-buru, termasuk kata pendek seperti “a”, “the”, atau “to”.",
      };
    case "extra":
      return {
        detail: `Kata “${w.heard ?? ""}” terdengar, padahal tidak ada di kalimat.`,
        tip: "Coba ucapkan kalimat sekali jalan tanpa jeda atau pengulangan.",
      };
  }
}
