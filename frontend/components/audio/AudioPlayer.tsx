"use client";

import { useEffect, useState } from "react";
import type { Accent, Gender } from "@/lib/speech";
import { useSpeech } from "@/lib/useSpeech";

const STORAGE_KEY = "qouq-audio";
const SLOW_RATE = 0.6;

type Saved = { gender: Gender; accent: Accent; speed: number };

function readSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

// Pemutar sesuai desain "Pemutar Pelafalan": suara wanita/pria, aksen, kecepatan, putar lambat.
export default function AudioPlayer({ text }: { text: string }) {
  const { supported, playing, speak, stop, note, voiceName } = useSpeech();
  // Pilihan terakhir dibaca sekali saat komponen dibuat (hanya kenyamanan; kalau penyimpanan diblokir, tetap jalan).
  const [gender, setGender] = useState<Gender>(() => {
    const g = readSaved().gender;
    return g === "FEMALE" || g === "MALE" ? g : "FEMALE";
  });
  const [accent, setAccent] = useState<Accent>(() => {
    const a = readSaved().accent;
    return a === "US" || a === "UK" || a === "AU" ? a : "US";
  });
  const [speed, setSpeed] = useState(() => {
    const v = readSaved().speed;
    return typeof v === "number" && v >= 0.5 && v <= 1.5 ? v : 1;
  });
  const [slow, setSlow] = useState(false); // true saat yang sedang diputar adalah mode lambat

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ gender, accent, speed } satisfies Saved));
    } catch {
      /* diabaikan */
    }
  }, [gender, accent, speed]);

  // Ganti kalimat = hentikan suara yang sedang jalan.
  useEffect(() => stop, [text, stop]);

  function play(rate: number, isSlow: boolean) {
    if (playing) {
      stop();
      return;
    }
    setSlow(isSlow);
    speak(text, { accent, gender, rate });
  }

  if (!supported) {
    return (
      <div className="note note-bad" role="alert">
        <b>Suara belum bisa diputar.</b>
        <p className="mt-1 text-[14px]">
          Browser ini belum mendukung suara bawaan. Coba Chrome atau Edge versi terbaru.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Suara</p>
      <div role="radiogroup" aria-label="Jenis suara" className="mt-1.5 grid grid-cols-2 rounded-xl bg-soft p-[3px] text-[13px] font-semibold">
        {(
          [
            ["FEMALE", "Wanita"],
            ["MALE", "Pria"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={gender === value}
            onClick={() => setGender(value)}
            className={`rounded-[10px] px-2 py-2 ${gender === value ? "bg-card text-pri shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "bg-transparent text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[.06em] text-muted">Aksen</p>
      <div className="mt-1.5 flex gap-2" role="radiogroup" aria-label="Aksen">
        {(["US", "UK", "AU"] as const).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={accent === a} onClick={() => setAccent(a)} className={`chip ${accent === a ? "chip-on" : ""}`}>
            {a}
          </button>
        ))}
      </div>

      <label htmlFor="kecepatan" className="mt-4 text-[11px] font-bold uppercase tracking-[.06em] text-muted">
        Kecepatan · {speed.toFixed(1)}x
      </label>
      <input
        id="kecepatan"
        type="range"
        min={0.5}
        max={1.5}
        step={0.1}
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="mt-2 w-full accent-[#DC8A45]"
      />
      <div className="flex justify-between text-[12px] text-muted">
        <span>0.5x</span>
        <span>1.5x</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => play(speed, false)}
          aria-label={playing && !slow ? "Hentikan suara" : "Putar suara"}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#F1DD9C,#DC8A45)] text-[#0F2A22] shadow-[0_8px_20px_rgba(220,138,69,.3)] transition-transform active:scale-95"
        >
          <PlayIcon playing={playing && !slow} />
        </button>
        <button type="button" onClick={() => play(SLOW_RATE, true)} className="btn btn-outline flex-1">
          {playing && slow ? "■ Hentikan" : "🐢 Putar lambat"}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 flex flex-col gap-2">
        {note && (
          <div className="note text-[13px]">
            <b>Suara cadangan dipakai.</b>
            <p className="mt-1">{note}</p>
          </div>
        )}
        {voiceName && <p className="text-[12px] text-muted">Suara: {voiceName}</p>}
      </div>
    </div>
  );
}
