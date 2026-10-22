"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import HasilGrammar from "@/components/grammar/HasilGrammar";
import Soal from "@/components/grammar/Soal";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAnswered, levelChip, type Answer, type GrammarResult, type TopicDetail, type TopicItem } from "@/lib/grammar";

export default function LatihanPage() {
  const { slug } = useParams<{ slug: string }>();
  // key={slug}: pindah topik = latihan dibuat baru.
  return <Latihan key={slug} slug={slug} />;
}

function Latihan({ slug }: { slug: string }) {
  const { token, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextSlug, setNextSlug] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarResult | null>(null);

  useEffect(() => {
    let alive = true;
    api<TopicDetail>(`/grammar/topics/${encodeURIComponent(slug)}`)
      .then((t) => alive && setTopic(t))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    // Untuk tombol "Topik berikutnya". Kalau gagal, tombolnya saja yang tidak muncul.
    api<TopicItem[]>("/grammar/topics")
      .then((rows) => {
        if (!alive) return;
        const i = rows.findIndex((r) => r.slug === slug);
        setNextSlug(i >= 0 && i < rows.length - 1 ? rows[i + 1].slug : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const questions = topic?.questions ?? [];
  const q = questions[index];
  const last = index === questions.length - 1;
  const answeredCount = questions.filter((x) => isAnswered(x, answers[x.id])).length;

  async function submit() {
    if (!topic || !token) return;
    setSending(true);
    setSendError(null);
    try {
      const body = {
        answers: topic.questions.map((x) => {
          const a = answers[x.id];
          if (x.type === "MULTIPLE_CHOICE") return { questionId: x.id, ...(a?.optionId ? { optionId: a.optionId } : {}) };
          const t = a?.text?.trim();
          return { questionId: x.id, ...(t ? { answerText: t } : {}) };
        }),
      };
      const res = await api<GrammarResult>(`/grammar/topics/${encodeURIComponent(slug)}/attempts`, { method: "POST", body, token });
      setResult(res);
    } catch (err) {
      setSendError(
        err instanceof ApiError && err.status === 401 ? "Sesi masukmu sudah habis. Masuk lagi, lalu coba kirim jawaban." : err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    } finally {
      setSending(false);
    }
  }

  function next() {
    if (last) void submit();
    else setIndex((i) => i + 1);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setSendError(null);
  }

  // ----- keadaan khusus -----
  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="note note-bad" role="alert">
          <b>Latihan tidak bisa dibuka.</b>
          <p className="mt-1 text-[14px]">{error}</p>
        </div>
      </div>
    );
  }
  if (!topic || authLoading) return <p className="mx-auto max-w-2xl text-muted">Memuat latihan…</p>;

  if (!token) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-[26px] font-bold">{topic.title}</h1>
        <div className="note">
          <b>Masuk dulu untuk berlatih.</b>
          <p className="mt-1 text-[14px]">Jawabanmu diperiksa dan disimpan di akunmu, supaya skornya tercatat.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/masuk" className="btn">
              Masuk
            </Link>
            <Link href="/daftar" className="btn btn-outline">
              Daftar
            </Link>
          </div>
        </div>
        <Link href={`/grammar/${slug}`} className="text-[14px] font-semibold text-pri">
          ← Baca pelajarannya dulu
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="note">Soal untuk topik ini belum tersedia.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <HasilGrammar result={result} title={topic.title} nextSlug={nextSlug} onRetry={restart} />
      </div>
    );
  }

  const answered = isAnswered(q, answers[q.id]);
  const pct = Math.round(((index + 1) / questions.length) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <section className="card flex flex-col gap-4 lg:!p-7" aria-label="Soal">
          <div className="flex items-center gap-3">
            <Link
              href={`/grammar/${slug}`}
              aria-label="Keluar dari latihan"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-card"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Link>
            <div className="bar grow" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan soal">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[13px] font-bold text-muted">
              {index + 1} / {questions.length}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="chip !h-6 !px-2.5 !text-[11px]">{q.type === "MULTIPLE_CHOICE" ? "Pilihan ganda" : "Isian"}</span>
            <span className={`chip ${levelChip(topic.level)} !h-6 !px-2.5 !text-[11px]`}>{topic.title}</span>
          </div>

          <Soal key={q.id} q={q} answer={answers[q.id]} onChange={(a) => setAnswers((old) => ({ ...old, [q.id]: a }))} onEnter={() => answered && !sending && next()} />

          {sendError && (
            <div className="note note-bad" role="alert">
              <b>Jawaban belum terkirim.</b>
              <p className="mt-1 text-[14px]">{sendError}</p>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <button type="button" className="btn" disabled={!answered || sending} onClick={next}>
              {sending ? "Memeriksa…" : last ? "Periksa jawaban" : "Lanjut"}
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <button type="button" className="btn btn-outline flex-1" onClick={() => setIndex((i) => i - 1)} disabled={sending}>
                  Kembali
                </button>
              )}
              {!answered && (
                <button type="button" className="btn btn-outline flex-1" onClick={next} disabled={sending}>
                  Lewati soal ini
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <div className="card hidden lg:block">
            <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Nomor soal</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {questions.map((x, i) => {
                const done = isAnswered(x, answers[x.id]);
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Soal ${i + 1}${done ? ", sudah dijawab" : ""}`}
                    aria-current={i === index ? "step" : undefined}
                    className={`chip !h-8 w-[34px] justify-center !px-0 ${i === index ? "chip-on" : done ? "chip-ok" : ""}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card hidden lg:block">
            <b>{q.type === "FILL_BLANK" ? "Kirim dengan Enter" : "Petunjuk"}</b>
            <p className="mt-1.5 text-muted">
              {q.type === "FILL_BLANK"
                ? "Di komputer, tekan Enter untuk lanjut ke soal berikutnya."
                : "Pilih satu jawaban. Hasil dan pembahasan muncul di akhir."}
            </p>
            <p className="mt-2 text-[12.5px] text-muted">
              Terjawab {answeredCount} dari {questions.length}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
