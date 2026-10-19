"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACCENT_LANG, pickVoice, reasonNote, type Accent, type Gender, type Pick } from "@/lib/speech";

export type SpeakOptions = { accent: Accent; gender: Gender; rate: number };

// Pemutar suara memakai fitur bawaan browser (Web Speech API), tanpa file audio dan tanpa biaya.
export function useSpeech() {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
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
