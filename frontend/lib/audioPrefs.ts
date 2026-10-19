import type { Accent, Gender } from "@/lib/speech";

// Membaca pilihan suara terakhir yang disimpan pemutar (aksen, jenis suara, kecepatan).
export function readAudioPrefs(): { accent: Accent; gender: Gender; rate: number } {
  const d = { accent: "US" as Accent, gender: "FEMALE" as Gender, rate: 1 };
  try {
    const s = JSON.parse(localStorage.getItem("qouq-audio") ?? "{}") as Partial<{ accent: Accent; gender: Gender; speed: number }>;
    return {
      accent: s.accent === "US" || s.accent === "UK" || s.accent === "AU" ? s.accent : d.accent,
      gender: s.gender === "FEMALE" || s.gender === "MALE" ? s.gender : d.gender,
      rate: typeof s.speed === "number" && s.speed >= 0.5 && s.speed <= 1.5 ? s.speed : d.rate,
    };
  } catch {
    return d;
  }
}
