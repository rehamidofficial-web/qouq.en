// Pengenalan suara bawaan browser (Web Speech API). Dipakai untuk mengubah ucapan jadi teks.
// Tipe ditulis sendiri karena TypeScript belum membawanya secara bawaan.

export type RecError = "unsupported" | "insecure" | "denied" | "no-mic" | "no-speech" | "network" | "other";

export interface SRAlternative {
  transcript: string;
  confidence: number;
}
export interface SRResult {
  isFinal: boolean;
  length: number;
  [index: number]: SRAlternative;
}
export interface SREvent {
  results: { length: number; [index: number]: SRResult };
}
export interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SRConstructor = new () => SRInstance;

export function getRecognizerClass(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// "ok" = siap dipakai. Selain itu = alasan kenapa belum bisa.
export function detectAvailability(): "ok" | "unsupported" | "insecure" {
  if (typeof window === "undefined") return "ok";
  if (!getRecognizerClass()) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return "ok";
}

export function mapError(code: string): RecError | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "denied";
    case "audio-capture":
      return "no-mic";
    case "no-speech":
      return "no-speech";
    case "network":
      return "network";
    case "aborted":
      return null; // dibatalkan sendiri, bukan masalah
    default:
      return "other";
  }
}

export const ERROR_TEXT: Record<RecError, { title: string; body: string }> = {
  unsupported: {
    title: "Browser ini belum mendukung pengenalan suara",
    body: "Pakai Chrome atau Edge versi terbaru di komputer atau Android. Sementara itu kamu tetap bisa mendengarkan contoh dan membaca arti.",
  },
  insecure: {
    title: "Halaman ini belum memakai koneksi aman (HTTPS)",
    body: "Browser hanya mengizinkan mikrofon di alamat yang aman. Buka lewat alamat https:// atau localhost.",
  },
  denied: {
    title: "Izin mikrofon ditolak",
    body: "Klik ikon gembok di kiri alamat situs, ubah Mikrofon menjadi Izinkan, lalu muat ulang halaman.",
  },
  "no-mic": {
    title: "Mikrofon tidak ditemukan",
    body: "Pastikan mikrofon terpasang, menyala, dan tidak sedang dipakai aplikasi lain.",
  },
  "no-speech": {
    title: "Tidak ada suara yang terdengar",
    body: "Dekatkan mikrofon, bicara sedikit lebih keras, lalu coba lagi.",
  },
  network: {
    title: "Pengenalan suara butuh internet",
    body: "Periksa koneksi internetmu, lalu coba lagi.",
  },
  other: {
    title: "Pengenalan suara terhenti",
    body: "Coba tekan tombol mikrofon sekali lagi. Kalau masih gagal, muat ulang halaman.",
  },
};
