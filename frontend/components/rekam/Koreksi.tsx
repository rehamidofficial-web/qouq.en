"use client";

import Link from "next/link";
import { useState } from "react";
import { EasyText } from "@/components/ejaan/Ejaan";
import { readAudioPrefs } from "@/lib/audioPrefs";
import { jelaskan, STATUS_LABEL } from "@/lib/koreksi";
import { scoreTone, type AttemptResult, type WordResult } from "@/lib/practice";
import { usePhonetics } from "@/lib/usePhonetics";
import { useSpeech } from "@/lib/useSpeech";

const CHIP_COLOR: Record<WordResult["status"], string> = {
  correct: "bg-okbg text-ok",
  wrong: "bg-badbg text-bad",
  missing: "border border-dashed border-warn bg-warnbg text-warn",
  extra: "border border-line text-muted line-through",
};

const LABEL_COLOR: Record<WordResult["status"], string> = {
  correct: "bg-okbg text-ok",
  wrong: "bg-badbg text-bad",
  missing: "bg-warnbg text-warn",
  extra: "bg-soft text-muted",
};

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

const shown = (w: WordResult) => (w.status === "extra" ? w.heard : w.target) ?? "";

type Props = {
  result: AttemptResult;
  heard: string;
  saved: boolean;
  onRetry: () => void;
  nextHref: string | null;
  backHref: string;
};

// Layar hasil: skor, kata per kata (bisa diklik), penjelasan + ejaan + putar bunyi kata, lalu langkah berikutnya.
export default function Koreksi({ result, heard, saved, onRetry, nextHref, backHref }: Props) {
  const { supported, playing, speak, stop } = useSpeech();
  const firstProblem = result.words.findIndex((w) => w.status !== "correct");
  const [picked, setPicked] = useState<number | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const idx = picked ?? (firstProblem >= 0 ? firstProblem : null);
  const sel = idx !== null ? result.words[idx] : null;

  // Ejaan semua kata target diambil sekali, supaya pindah antar kata terasa langsung.
  const targets = Array.from(new Set(result.words.map((w) => w.target?.toLowerCase()).filter((t): t is string => Boolean(t))));
  const { map, loading } = usePhonetics(targets.join(","));

  const tone = scoreTone(result.finalScore);
  const color = tone === "ok" ? "var(--ok)" : tone === "mid" ? "var(--warn)" : "var(--bad)";

  const prevTarget = (() => {
    if (idx === null) return undefined;
    for (let i = idx - 1; i >= 0; i--) {
      const t = result.words[i].target;
      if (t) return t;
    }
    return undefined;
  })();
  const info = sel?.target ? map?.[sel.target.toLowerCase()] : undefined;
  const penjelasan = sel ? jelaskan(sel, prevTarget) : null;
  const ipa = info?.phoneticIpa ? info.phoneticIpa.replace(/^\/|\/$/g, "") : null;

  function listen(word: string, rate: number) {
    if (playing && playingWord === `${word}@${rate}`) {
      stop();
      return;
    }
    const p = readAudioPrefs();
    setPlayingWord(`${word}@${rate}`);
    speak(word, { accent: p.accent, gender: p.gender, rate: p.rate * rate });
  }

  const onSel = sel && sel.target ? sel.target : null;

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Hasil</p>
      <div className="flex items-center gap-4">
        <div
          className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${color} ${result.finalScore}%, var(--line) 0)` }}
          role="img"
          aria-label={`Skor ${result.finalScore} dari 100`}
        >
          <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-bg text-[20px] font-extrabold" style={{ color }}>
            {result.finalScore}
          </div>
        </div>
        <div>
          <p className="text-[18px] font-bold">{result.label}</p>
          <p className="text-[13.5px] text-muted">{result.feedback}</p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-muted">Koreksi kata · ketuk kata untuk detailnya</p>
        <div className="flex flex-wrap gap-1.5 text-[15px] font-semibold" role="group" aria-label="Kata per kata">
          {result.words.map((w, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={idx === i}
              aria-label={`${shown(w)}: ${STATUS_LABEL[w.status]}`}
              onClick={() => setPicked(i)}
              className={`rounded-lg px-2.5 py-1 ${CHIP_COLOR[w.status]} ${idx === i ? "ring-2 ring-[var(--pri)] ring-offset-1 ring-offset-transparent" : ""}`}
            >
              {shown(w)}
            </button>
          ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="text-ok">■ benar</span>
          <span className="text-bad">■ salah ucap</span>
          <span className="text-warn">■ terlewat</span>
          <span>
            ■ <s>tambahan</s>
          </span>
        </p>
      </div>

      {sel && penjelasan && (
        <section className="card !p-3.5" aria-label="Detail kata">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <b className="text-[16px]">{shown(sel)}</b>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${LABEL_COLOR[sel.status]}`}>{STATUS_LABEL[sel.status]}</span>
              </p>
              <p className="mt-1 text-[13.5px] text-muted">{penjelasan.detail}</p>
            </div>
            {supported && onSel && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => listen(onSel, 1)}
                  aria-label={playing && playingWord === `${onSel}@1` ? "Hentikan suara" : `Putar bunyi ${onSel}`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#F1DD9C,#DC8A45)] text-[#0F2A22] shadow-[0_6px_14px_rgba(220,138,69,.28)] transition-transform active:scale-95"
                >
                  <PlayIcon playing={playing && playingWord === `${onSel}@1`} />
                </button>
                <button
                  type="button"
                  onClick={() => listen(onSel, 0.6)}
                  aria-label={`Putar lambat ${onSel}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-[15px] active:scale-95"
                >
                  {playing && playingWord === `${onSel}@0.6` ? "■" : "🐢"}
                </button>
              </div>
            )}
          </div>

          {onSel && (
            <p className="mt-2.5 text-[13px]">
              {loading && <span className="text-muted">Memuat ejaan…</span>}
              {!loading && (ipa || info?.phoneticEasy) && (
                <>
                  {ipa && <span className="font-semibold text-pri">/{ipa}/</span>}
                  {ipa && info?.phoneticEasy && <span className="text-muted"> · </span>}
                  {info?.phoneticEasy && (
                    <span className="text-muted">
                      “<EasyText text={info.phoneticEasy} />”
                    </span>
                  )}
                </>
              )}
              {!loading && !ipa && !info?.phoneticEasy && <span className="text-muted">Ejaan kata ini belum tersedia.</span>}
            </p>
          )}

          {penjelasan.tip && <p className="mt-2 text-[13px]"><b>Tips:</b> {penjelasan.tip}</p>}
        </section>
      )}

      {!sel && <p className="note text-[13.5px]">Semua kata sudah tepat. Mantap!</p>}

      <div className="card !p-3 text-[13.5px]">
        <span className="text-muted">Terdengar</span>
        <p className="mt-0.5 font-semibold">“{heard}”</p>
      </div>

      {!saved && (
        <p className="note text-[13px]">
          Skor ini belum tersimpan. <Link href="/masuk" className="font-bold underline">Masuk</Link> dulu supaya latihanmu tercatat.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" className="btn" onClick={onRetry}>
          Coba lagi
        </button>
        {nextHref ? (
          <Link href={nextHref} className="btn btn-outline text-center">
            Kalimat berikutnya
          </Link>
        ) : (
          <Link href={backHref} className="btn btn-outline text-center">
            Selesai, kembali ke daftar
          </Link>
        )}
      </div>
    </div>
  );
}
