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

export type ErrorInfo = {
  title: string; // judul pendek
  why: string; // penjelasan satu kalimat
  steps: string[]; // langkah mengatasinya, berurutan
  retry: boolean; // apakah tombol "Coba lagi" masuk akal
  copyLink: boolean; // apakah perlu tombol "Salin alamat" (untuk dibuka di browser lain)
};

export const ERROR_TEXT: Record<RecError, ErrorInfo> = {
  denied: {
    title: "Izin mikrofon ditolak",
    why: "Browser memblokir izin mikrofon untuk situs ini, jadi suaramu tidak bisa didengar.",
    steps: [
      "Klik ikon gembok di sebelah kiri alamat situs.",
      "Ubah Mikrofon menjadi Izinkan.",
      "Muat ulang halaman ini, lalu tekan Coba lagi.",
    ],
    retry: true,
    copyLink: false,
  },
  unsupported: {
    title: "Browser ini belum mendukung pengenalan suara",
    why: "Fitur mengubah suara menjadi teks hanya ada di Chrome dan Edge (komputer atau Android).",
    steps: [
      "Salin alamat halaman ini, lalu buka di Chrome atau Edge versi terbaru.",
      "Firefox dan sebagian browser iPhone belum mendukungnya.",
    ],
    retry: false,
    copyLink: true,
  },
  insecure: {
    title: "Halaman ini belum memakai koneksi aman (HTTPS)",
    why: "Browser hanya mengizinkan mikrofon di alamat yang aman.",
    steps: [
      "Buka lewat alamat yang diawali https://.",
      "Kalau kamu sedang mengembangkan di komputer sendiri, pakai alamat http://localhost:3000.",
    ],
    retry: false,
    copyLink: false,
  },
  "no-mic": {
    title: "Mikrofon tidak ditemukan",
    why: "Browser tidak menemukan mikrofon yang bisa dipakai.",
    steps: [
      "Pastikan mikrofon (atau headset) terpasang dan menyala.",
      "Di Windows: Pengaturan, Sistem, Suara, lalu pilih mikrofon yang benar di bagian Input.",
      "Tutup aplikasi lain yang sedang memakai mikrofon, misalnya Zoom atau Meet, lalu tekan Coba lagi.",
    ],
    retry: true,
    copyLink: false,
  },
  "no-speech": {
    title: "Tidak ada suara yang terdengar",
    why: "Mikrofon aktif, tapi belum menangkap ucapan apa pun.",
    steps: [
      "Tunggu sampai tertulis “Mendengarkan…”, baru bicara.",
      "Dekatkan mikrofon dan bicara sedikit lebih keras.",
      "Cari tempat yang lebih tenang, lalu tekan Coba lagi.",
    ],
    retry: true,
    copyLink: false,
  },
  network: {
    title: "Pengenalan suara butuh internet",
    why: "Chrome mengirim suara ke layanannya untuk dijadikan teks, jadi koneksi harus aktif.",
    steps: ["Periksa koneksi internetmu.", "Tekan Coba lagi."],
    retry: true,
    copyLink: false,
  },
  other: {
    title: "Pengenalan suara terhenti",
    why: "Browser menghentikan perekaman secara tiba-tiba.",
    steps: ["Tekan Coba lagi.", "Kalau masih gagal, muat ulang halaman."],
    retry: true,
    copyLink: false,
  },
};
