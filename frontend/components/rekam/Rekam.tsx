"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Kendala from "@/components/rekam/Kendala";
import Koreksi from "@/components/rekam/Koreksi";
import { api, ApiError } from "@/lib/api";
import { readAudioPrefs } from "@/lib/audioPrefs";
import { useAuth } from "@/lib/auth";
import { forgetSession, readSession, saveSession } from "@/lib/practiceSession";
import type { AttemptResult, Score } from "@/lib/practice";
import type { RecError } from "@/lib/recognizer";
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

// Rekam suara -> teks (di browser) -> kirim ke backend untuk dinilai -> tampilkan skor.
export default function Rekam({
  sentenceId,
  categoryId,
  text,
  nextHref,
  backHref,
}: {
  sentenceId: string;
  categoryId: string;
  text: string;
  nextHref: string | null;
  backHref: string;
}) {
  const { token } = useAuth();
  const sessionId = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [spoken, setSpoken] = useState("");
  const [saved, setSaved] = useState(false);
  const [listenOnly, setListenOnly] = useState(false); // "Latihan tanpa merekam"
  const [round, setRound] = useState(0); // naik setiap ada hasil baru, supaya layar hasil mulai dari awal
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<Heard | null>(null);

  // Kirim hasil ke sesi latihan. Sesi lama dipakai ulang; kalau sudah tidak berlaku, dibuat yang baru.
  async function saveAttempt(h: Heard, jwt: string): Promise<AttemptResult> {
    const body = { sentenceId, spokenText: h.text, confidence: h.confidence };
    for (let attempt = 0; attempt < 2; attempt++) {
      let id = sessionId.current ?? readSession(categoryId);
      if (!id) {
        const s = await api<{ id: string }>("/practice/sessions", { method: "POST", body: { categoryId, mode: "PRACTICE" }, token: jwt });
        id = s.id;
        saveSession(categoryId, id);
      }
      sessionId.current = id;
      try {
        return await api<AttemptResult>(`/practice/sessions/${id}/attempts`, { method: "POST", body, token: jwt });
      } catch (err) {
        const stale = err instanceof ApiError && (err.status === 404 || err.status === 400);
        if (attempt === 0 && stale) {
          sessionId.current = null;
          forgetSession(categoryId);
          continue;
        }
        throw err;
      }
    }
    throw new ApiError("Sesi latihan tidak bisa dibuat. Coba lagi.", 0);
  }

  async function submit(h: Heard) {
    setLastHeard(h);
    setSpoken(h.text);
    setScoring(true);
    setSendError(null);
    try {
      let res: AttemptResult | null = null;
      if (token) {
        try {
          res = await saveAttempt(h, token);
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
      setRound((n) => n + 1);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setScoring(false);
    }
  }

  const rec = useRecognizer(submit);

  // Hasil baru muncul: di HP gulung otomatis supaya skor dan koreksi langsung kelihatan.
  useEffect(() => {
    if (round === 0) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  }, [round]);

  function begin() {
    setListenOnly(false);
    setResult(null);
    setSendError(null);
    rec.start(LANG[readAudioPrefs().accent]);
  }

  const trouble: RecError | null = rec.availability !== "ok" ? rec.availability : rec.error;
  const showTrouble = trouble !== null && !listenOnly && !rec.listening && !scoring && !result;
  const showIdle = !showTrouble && !listenOnly && !result && !rec.listening && !scoring;

  return (
    <div ref={box} className="flex scroll-mt-4 flex-col" aria-label="Latihan bicara">
      {showIdle && (
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Giliranmu</p>
          <p className="mt-1 text-[13.5px] text-muted">Ucapkan kalimat di atas dengan jelas.</p>
          <button
            type="button"
            onClick={begin}
            aria-label="Mulai merekam"
            className="mt-4 grid h-[76px] w-[76px] place-items-center rounded-full bg-[linear-gradient(135deg,#F5B073,#C9672B)] text-white shadow-[0_0_0_10px_rgba(220,138,69,.2),0_0_0_22px_rgba(220,138,69,.08)] transition-transform active:scale-95"
          >
            <MicIcon size={34} />
          </button>
          <p className="mt-6 font-bold">Tekan untuk bicara</p>
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

      {result && !scoring && (
        <Koreksi key={round} result={result} heard={spoken} saved={saved} onRetry={begin} nextHref={nextHref} backHref={backHref} />
      )}

      {showTrouble && trouble && <Kendala code={trouble} onRetry={begin} onListenOnly={() => setListenOnly(true)} />}

      {listenOnly && !result && !rec.listening && !scoring && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Mode dengar-saja</p>
          <p className="note text-[13.5px]">
            <b>Kamu belajar tanpa merekam.</b> Dengarkan contoh pada pemutar, baca ejaan dan artinya. Skor tidak dihitung di mode ini.
          </p>
          <div className="flex flex-col gap-2">
            {nextHref && (
              <Link href={nextHref} className="btn text-center">
                Kalimat berikutnya
              </Link>
            )}
            <button type="button" className="btn btn-outline" onClick={begin}>
              Coba rekam lagi
            </button>
          </div>
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
