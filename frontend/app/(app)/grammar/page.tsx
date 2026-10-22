"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pelajaran from "@/components/grammar/Pelajaran";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, levelChip, type GrammarProgress, type TopicDetail, type TopicItem } from "@/lib/grammar";

// Panel kanan (desktop): pelajaran topik yang dipilih. Hasil disimpan bersama slug-nya,
// jadi pindah topik otomatis memakai data yang benar tanpa mengosongkan state di effect.
function TopicPanel({ slug }: { slug: string }) {
  const [fetched, setFetched] = useState<{ slug: string; topic: TopicDetail | null } | null>(null);

  useEffect(() => {
    let alive = true;
    api<TopicDetail>(`/grammar/topics/${encodeURIComponent(slug)}`)
      .then((t) => alive && setFetched({ slug, topic: t }))
      .catch(() => alive && setFetched({ slug, topic: null }));
    return () => {
      alive = false;
    };
  }, [slug]);

  const done = fetched?.slug === slug;
  return (
    <section className="card !p-6" aria-label="Pelajaran topik">
      {!done && <p className="text-muted">Memuat pelajaran…</p>}
      {done && !fetched.topic && <p className="text-muted">Pelajaran belum bisa dimuat. Coba pilih topik lagi.</p>}
      {done && fetched.topic && <Pelajaran topic={fetched.topic} compact />}
    </section>
  );
}

export default function GrammarPage() {
  const { token, loading: authLoading } = useAuth();
  const [topics, setTopics] = useState<TopicItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [level, setLevel] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { best: number; attempts: number }>>({});

  useEffect(() => {
    let alive = true;
    api<TopicItem[]>("/grammar/topics")
      .then((rows) => {
        if (!alive) return;
        setError(null);
        setTopics(rows);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [tries]);

  // Sudah masuk: ambil skor terbaikmu per topik (hanya pelengkap; kalau gagal, daftar tetap tampil).
  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    api<GrammarProgress>("/grammar/progress", { token })
      .then((r) => {
        if (alive) setScores(Object.fromEntries(r.topics.map((t) => [t.topicId, { best: t.bestScore, attempts: t.attempts }])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token, authLoading]);

  const shown = useMemo(() => (topics ?? []).filter((t) => !level || t.level === level), [topics, level]);
  const activeSlug = shown.find((t) => t.slug === selected)?.slug ?? shown[0]?.slug ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold lg:text-3xl">Grammar</h1>
        <p className="mt-1 text-muted">{topics ? `${topics.length} topik · baca singkat, lalu jawab soal` : "Baca singkat, lalu jawab soal"}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring menurut level">
            <button type="button" aria-pressed={level === ""} className={`chip ${level === "" ? "chip-on" : ""}`} onClick={() => setLevel("")}>
              Semua
            </button>
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={level === l} className={`chip ${level === l ? "chip-on" : ""}`} onClick={() => setLevel(level === l ? "" : l)}>
                {l}
              </button>
            ))}
          </div>

          {error && (
            <div className="note note-bad" role="alert">
              <b>Topik belum bisa dimuat.</b>
              <p className="mt-1 text-[14px]">{error}</p>
              <button type="button" className="chip mt-3" onClick={() => setTries((n) => n + 1)}>
                Coba lagi
              </button>
            </div>
          )}

          {!topics && !error && <p className="text-muted">Memuat topik…</p>}

          {topics && shown.length === 0 && (
            <div className="note">
              <b>Belum ada topik untuk level ini.</b>
              <p className="mt-1 text-[14px]">Pilih “Semua” atau level lain.</p>
            </div>
          )}

          <ul className="flex flex-col gap-2.5">
            {shown.map((t) => {
              const sc = scores[t.id];
              const picked = activeSlug === t.slug;
              return (
                <li key={t.id}>
                  <Link
                    href={`/grammar/${t.slug}`}
                    onClick={(e) => {
                      // Layar lebar: tampilkan di panel kanan. HP: buka halaman pelajaran.
                      if (window.matchMedia("(min-width: 1024px)").matches) {
                        e.preventDefault();
                        setSelected(t.slug);
                      }
                    }}
                    className={`card flex flex-col gap-1.5 !p-3.5 transition-transform hover:-translate-y-0.5 ${picked ? "lg:!border-[var(--pri)]" : ""}`}
                  >
                    <span className="flex items-center justify-between">
                      <span className={`chip ${levelChip(t.level)} !h-6 !px-2.5 !text-[11px]`}>{t.level}</span>
                      <span className="text-[12px] text-muted">{t.questionCount} soal</span>
                    </span>
                    <b className="text-[15px]">{t.title}</b>
                    {t.description && <span className="line-clamp-2 text-[12.5px] text-muted">{t.description}</span>}
                    {token && (
                      <span className="mt-1 flex items-center gap-2">
                        <span className="bar grow" role="progressbar" aria-valuenow={sc?.best ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Skor terbaik">
                          <i style={{ width: `${sc?.best ?? 0}%` }} />
                        </span>
                        <span className="text-[12px] font-bold text-muted">{sc ? `Skor ${sc.best}` : "Belum dicoba"}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden lg:block">{activeSlug && <TopicPanel slug={activeSlug} />}</div>
      </div>
    </div>
  );
}
