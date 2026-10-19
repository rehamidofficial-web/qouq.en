"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { detectAvailability, getRecognizerClass, mapError, type RecError, type SRInstance } from "@/lib/recognizer";

export type Heard = { text: string; confidence?: number };

const subscribe = () => () => {};

// Merekam suara lewat mikrofon dan mengubahnya jadi teks (bawaan browser, tanpa biaya).
// Rekaman suara tidak disimpan oleh aplikasi ini; yang dipakai hanya teks hasilnya.
export function useRecognizer(onDone: (heard: Heard) => void) {
  // Dicek lewat useSyncExternalStore supaya aman di server dan tidak perlu setState di dalam effect.
  const availability = useSyncExternalStore(subscribe, detectAvailability, () => "ok" as const);

  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<RecError | null>(null);

  const rec = useRef<SRInstance | null>(null);
  const finals = useRef<{ text: string; conf: number }[]>([]);
  const live = useRef("");
  const cancelled = useRef(false);
  const failed = useRef<RecError | null>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  const abort = useCallback(() => {
    cancelled.current = true;
    rec.current?.abort();
    rec.current = null;
  }, []);

  // Pindah halaman = hentikan mikrofon.
  useEffect(() => abort, [abort]);

  const start = useCallback(
    (lang: string) => {
      const Ctor = getRecognizerClass();
      if (!Ctor) {
        setError("unsupported");
        return;
      }
      if (!window.isSecureContext) {
        setError("insecure");
        return;
      }
      abort();

      const r = new Ctor();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;

      finals.current = [];
      live.current = "";
      cancelled.current = false;
      failed.current = null;
      setHeard("");
      setError(null);

      r.onresult = (e) => {
        // Hasil bersifat kumulatif, jadi dihitung ulang dari awal setiap kali.
        const done: { text: string; conf: number }[] = [];
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          const alt = res[0];
          if (!alt) continue;
          if (res.isFinal) done.push({ text: alt.transcript.trim(), conf: alt.confidence });
          else interim += ` ${alt.transcript}`;
        }
        finals.current = done;
        live.current = interim.trim();
        setHeard([...done.map((d) => d.text), live.current].filter(Boolean).join(" "));
      };

      r.onerror = (e) => {
        const code = mapError(e.error);
        if (code) failed.current = code;
      };

      r.onend = () => {
        if (rec.current !== r) return; // sudah diganti atau dibatalkan
        rec.current = null;
        setListening(false);
        if (cancelled.current) return;
        if (failed.current) {
          setError(failed.current);
          return;
        }
        const text = [...finals.current.map((f) => f.text), live.current].filter(Boolean).join(" ").trim();
        if (!text) {
          setError("no-speech");
          return;
        }
        const confs = finals.current.map((f) => f.conf).filter((c) => c > 0);
        const confidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : undefined;
        doneRef.current({ text, confidence });
      };

      rec.current = r;
      try {
        r.start();
        setListening(true);
      } catch {
        rec.current = null;
        setError("other");
      }
    },
    [abort],
  );

  // "Selesai bicara": hentikan, lalu hasilnya dikirim lewat onDone.
  const finish = useCallback(() => {
    rec.current?.stop();
  }, []);

  // "Batal": hentikan tanpa menilai.
  const cancel = useCallback(() => {
    abort();
    setListening(false);
    setHeard("");
  }, [abort]);

  const clearError = useCallback(() => setError(null), []);

  return { availability, listening, heard, error, start, finish, cancel, clearError };
}
