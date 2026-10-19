"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { readAudioPrefs } from "@/lib/audioPrefs";
import { useAuth } from "@/lib/auth";
import { scoreTone, type AttemptResult, type Score, type WordResult } from "@/lib/practice";
import { ERROR_TEXT } from "@/lib/recognizer";
import { useRecognizer, type Heard } from "@/lib/useRecognizer";

const LANG = { US: "en-US", UK: "en-GB", AU: "en-AU" } as const;

function MicIcon({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </svg>
  );
}

const BARS = [10, 22, 30, 16, 26, 34, 14, 24, 12];

function Wave() {
  return (
    <div className="qwave my-3 flex h-[38px] items-center justify-center gap-[5px]" aria-hidden="true">
      <style>{`
        @keyframes qwave { 0%,100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
        .qwave i { display:block; width:5px; border-radius:3px; background: var(--acc); transform-origin: center; animation: qwave 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .qwave i { animation: none; } }
      `}</style>
      {BARS.map((h, i) => (
        <i key={i} style={{ height: h, animationDelay: `${(i % 5) * 0.11}s` }} />
      ))}
    </div>
  );
}

function WordChip({ w }: { w: WordResult }) {
  if (w.status === "correct") {
    return <span className="rounded-lg bg-okbg px-2 py-0.5 text-ok">{w.target}</span>;
  }
  if (w.status === "wrong") {
    return (
      <span className="rounded-lg bg-badbg px-2 py-0.5 text-bad" title={`Terdengar: ${w.heard}`}>
        {w.target}
      </span>
    );
  }
  if (w.status === "missing") {
    return <span className="rounded-lg border border-dashed border-warn bg-warnbg px-2 py-0.5 text-warn">{w.target}</span>;
  }
  return (
    <span className="rounded-lg border border-line px-2 py-0.5 text-muted line-through" title="Kata tambahan yang tidak ada di kalimat">
      {w.heard}
    </span>
  );
}

function ResultView({ result, heard, saved, onRetry }: { result: AttemptResult; heard: string; saved: boolean; onRetry: () => void }) {
  const tone = scoreTone(result.finalScore);
  const color = tone === "ok" ? "var(--ok)" : tone === "mid" ? "var(--warn)" : "var(--bad)";
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
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-muted">Kata per kata</p>
        <p className="flex flex-wrap gap-1.5 text-[15px] font-semibold leading-8">
          {result.words.map((w, i) => (
            <WordChip key={i} w={w} />
          ))}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="text-ok">■ benar</span>
          <span className="text-bad">■ salah ucap</span>
          <span className="text-warn">■ terlewat</span>
          <span>■ <s>tambahan</s></span>
        </p>
      </div>

      <div className="card !p-3 text-[13.5px]">
        <span className="text-muted">Terdengar</span>
        <p className="mt-0.5 font-semibold">“{heard}”</p>
      </div>

      {!saved && (
        <p className="note text-[13px]">
          Skor ini belum tersimpan. <Link href="/masuk" className="font-bold underline">Masuk</Link> dulu supaya latihanmu tercatat.
        </p>
      )}

      <button type="button" className="btn" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  );
}

// Rekam suara -> teks (di browser) -> kirim ke backend untuk dinilai -> tampilkan skor.
export default function Rekam({ sentenceId, categoryId, text }: { sentenceId: string; categoryId: string; text: string }) {
  const { token } = useAuth();
  const sessionId = useRef<string | null>(null);

  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [spoken, setSpoken] = useState("");
  const [saved, setSaved] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<Heard | null>(null);

  async function submit(h: Heard) {
    setLastHeard(h);
    setSpoken(h.text);
    setScoring(true);
    setSendError(null);
    try {
      let res: AttemptResult | null = null;
      if (token) {
        try {
          if (!sessionId.current) {
            const s = await api<{ id: string }>("/practice/sessions", { method: "POST", body: { categoryId, mode: "PRACTICE" }, token });
            sessionId.current = s.id;
          }
          res = await api<AttemptResult>(`/practice/sessions/${sessionId.current}/attempts`, {
            method: "POST",
            body: { sentenceId, spokenText: h.text, confidence: h.confidence },
            token,
          });
          setSaved(true);
        } catch (err) {
          // Masuknya sudah kedaluwarsa: tetap nilai, tapi tidak disimpan.
          if (!(err instanceof ApiError && err.status === 401)) throw err;
        }
      }
      if (!res) {
        res = await api<Score>("/practice/compare", { method: "POST", body: { targetText: text, spokenText: h.text, confidence: h.confidence } });
        setSaved(false);
      }
      setResult(res);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setScoring(false);
    }
  }

  const rec = useRecognizer(submit);

  function begin() {
    setResult(null);
    setSendError(null);
    rec.start(LANG[readAudioPrefs().accent]);
  }

  const blocked = rec.availability !== "ok";
  const err = blocked ? (rec.availability as "unsupported" | "insecure") : rec.error;
  const msg = err ? ERROR_TEXT[err] : null;

  return (
    <div className="flex flex-col" aria-label="Latihan bicara">
      {!result && !rec.listening && !scoring && (
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Giliranmu</p>
          <p className="mt-1 text-[13.5px] text-muted">Ucapkan kalimat di atas dengan jelas.</p>
          <button
            type="button"
            onClick={begin}
            disabled={blocked}
            aria-label="Mulai merekam"
            className="mt-4 grid h-[76px] w-[76px] place-items-center rounded-full bg-[linear-gradient(135deg,#F5B073,#C9672B)] text-white shadow-[0_0_0_10px_rgba(220,138,69,.2),0_0_0_22px_rgba(220,138,69,.08)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <MicIcon size={34} />
          </button>
          <p className="mt-6 font-bold">{blocked ? "Mikrofon belum bisa dipakai" : "Tekan untuk bicara"}</p>
          <p className="mt-1 text-[12px] text-muted">Aplikasi ini tidak menyimpan rekaman suara. Hanya teks hasil dan skor.</p>
        </div>
      )}

      {rec.listening && (
        <div className="flex flex-col items-center text-center" aria-live="polite">
          <div className="relative mt-1 grid h-[76px] w-[76px] place-items-center rounded-full bg-[linear-gradient(135deg,#F5B073,#C9672B)] text-white">
            <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(220,138,69,.35)] motion-reduce:hidden" aria-hidden="true" />
            <span className="relative">
              <MicIcon size={34} />
            </span>
          </div>
          <p className="mt-3 font-bold">Mendengarkan…</p>
          <Wave />
          <div className="card w-full !p-3 text-left text-[14px]">
            <span className="text-[12px] text-muted">Terdengar</span>
            <p className="mt-0.5 min-h-[22px] font-semibold">{rec.heard ? `“${rec.heard}”` : <span className="font-normal text-muted">Mulai bicara…</span>}</p>
          </div>
          <div className="mt-3 flex w-full flex-col gap-2">
            <button type="button" className="btn" onClick={rec.finish}>
              Selesai bicara
            </button>
            <button type="button" className="btn btn-outline" onClick={rec.cancel}>
              Batal
            </button>
          </div>
        </div>
      )}

      {scoring && (
        <p className="py-8 text-center font-semibold" role="status">
          Menilai ucapanmu…
        </p>
      )}

      {result && !scoring && <ResultView result={result} heard={spoken} saved={saved} onRetry={begin} />}

      {msg && !rec.listening && !scoring && (
        <div className="note note-bad mt-4" role="alert">
          <b>{msg.title}</b>
          <p className="mt-1 text-[14px]">{msg.body}</p>
        </div>
      )}

      {sendError && !scoring && (
        <div className="note note-bad mt-4" role="alert">
          <b>Skor belum bisa dihitung.</b>
          <p className="mt-1 text-[14px]">{sendError}</p>
          {lastHeard && (
            <button type="button" className="chip mt-3" onClick={() => submit(lastHeard)}>
              Kirim ulang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
