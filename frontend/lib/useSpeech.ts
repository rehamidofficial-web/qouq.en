"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ACCENT_LANG, pickVoice, reasonNote, type Accent, type Gender, type Pick } from "@/lib/speech";

export type SpeakOptions = { accent: Accent; gender: Gender; rate: number };

const noopSubscribe = () => () => {};
const detectSynth = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Apakah browser ini punya suara bawaan? (aman dipakai di server dan tidak memakai setState di effect)
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, detectSynth, () => true);
}

// Daftar suara disimpan di sini supaya hasilnya "tetap" (tidak berganti objek setiap dibaca).
let voicesCache: SpeechSynthesisVoice[] = [];

function subscribeVoices(onChange: () => void) {
  if (!detectSynth()) return () => {};
  const synth = window.speechSynthesis;
  const refresh = () => {
    voicesCache = synth.getVoices();
    onChange();
  };
  // Browser kadang baru memuat daftar suara setelah halaman terbuka.
  voicesCache = synth.getVoices();
  synth.addEventListener("voiceschanged", refresh);
  return () => synth.removeEventListener("voiceschanged", refresh);
}
const getVoicesSnapshot = () => voicesCache;
const NO_VOICES: SpeechSynthesisVoice[] = [];
const getVoicesServer = (): SpeechSynthesisVoice[] => NO_VOICES; // harus objek yang sama setiap dibaca

// Pemutar suara memakai fitur bawaan browser (Web Speech API), tanpa file audio dan tanpa biaya.
export function useSpeech() {
  const supported = useSpeechSupported();
  const voices = useSyncExternalStore(subscribeVoices, getVoicesSnapshot, getVoicesServer);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  // Pindah halaman = hentikan suara yang masih berjalan.
  useEffect(() => {
    return () => {
      if (detectSynth()) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    current.current = null;
    window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  const speak = useCallback(
    (text: string, { accent, gender, rate }: SpeakOptions) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const pick: Pick = pickVoice(voices.length ? voices : synth.getVoices(), accent, gender);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = pick.voice?.lang ?? ACCENT_LANG[accent].replace(/-(\w+)$/, (_m, c: string) => `-${c.toUpperCase()}`);
      if (pick.voice) u.voice = pick.voice;
      u.rate = Math.min(2, Math.max(0.1, rate));

      u.onstart = () => {
        if (current.current === u) setPlaying(true);
      };
      const finish = () => {
        // Abaikan kejadian dari ucapan lama yang sudah dibatalkan.
        if (current.current === u) {
          current.current = null;
          setPlaying(false);
        }
      };
      u.onend = finish;
      u.onerror = finish;

      current.current = u;
      setNote(reasonNote(pick.reason, accent, gender));
      setVoiceName(pick.voice ? `${pick.voice.name} (${pick.voice.lang})` : null);
      setPlaying(true);
      synth.speak(u);
    },
    [voices],
  );

  return { supported, playing, speak, stop, note, voiceName, voicesReady: voices.length > 0 };
}
