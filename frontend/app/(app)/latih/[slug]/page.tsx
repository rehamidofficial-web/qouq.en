"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EjaanKalimat, ArtiCard } from "@/components/ejaan/Ejaan";
import { api, ApiError } from "@/lib/api";
import { readAudioPrefs } from "@/lib/audioPrefs";
import { useAuth } from "@/lib/auth";
import type { SentencePage } from "@/lib/latih";
import { scoreTone, TONE_CLASS, type ProgressItem, type ProgressPage } from "@/lib/practice";
import { useSpeech } from "@/lib/useSpeech";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

type Loaded = {
  base: string;
  name: string;
  items: ProgressItem[];
  page: number;
  totalPages: number;
  total: number;
  summary: { done: number; total: number } | null;
};
const TABS = [
  ["all", "Semua"],
  ["todo", "Belum"],
  ["done", "Sudah"],
] as const;
type Tab = (typeof TABS)[number][0];

function ScoreTag({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-[11px] font-semibold text-muted">Baru</span>;
  return <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${TONE_CLASS[scoreTone(score)]}`}>{score}</span>;
}

function MiniPlay({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#F1DD9C,#DC8A45)] text-[#0F2A22] shadow-[0_6px_14px_rgba(220,138,69,.28)] transition-transform active:scale-95"
    >
      {playing ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
        </svg>
      )}
    </button>
  );
}

export default function KategoriPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { supported, playing, speak, stop } = useSpeech();
  const { token, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("all");
  const [text, setText] = useState("");
  const [q, setQ] = useState(""); // nilai yang sudah "tenang" (setelah jeda mengetik)
  const [level, setLevel] = useState<string>("");
  const [tries, setTries] = useState(0); // naik 1 setiap kali tombol "Coba lagi" ditekan

  const [selected, setSelected] = useState<ProgressItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // "base" = gabungan semua syarat daftar (kategori, filter, pencarian, status masuk).
  // Hasil yang datang disimpan bersama base-nya. Kalau syarat berganti, hasil lama otomatis tidak dipakai,
  // jadi tidak perlu mengosongkan state satu per satu di dalam effect.
  const base = `${slug}|${level}|${q}|${tab}|${token ? "u" : "g"}|${tries}`;
  const [want, setWant] = useState<{ base: string; page: number }>({ base: "", page: 1 });
  const page = want.base === base ? want.page : 1;
  const [data, setData] = useState<Loaded | null>(null);
  const [fail, setFail] = useState<{ key: string; message: string } | null>(null);

  // Jeda 300 ms setelah berhenti mengetik, baru mencari ke server.
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    const qs = `page=${page}&limit=20${level ? `&level=${level}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    const key = encodeURIComponent(slug);

    async function fetchPage(): Promise<ProgressPage | SentencePage> {
      // Sudah masuk: ambil daftar beserta skor milikmu. Belum masuk (atau masuknya kedaluwarsa): daftar biasa.
      if (token) {
        try {
          return await api<ProgressPage>(`/practice/progress/${key}?${qs}&status=${tab}`, { token });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 401)) throw err;
        }
      }
      return api<SentencePage>(`/categories/${key}/sentences?${qs}`);
    }

    fetchPage()
      .then((res) => {
        if (!alive) return;
        const rows: ProgressItem[] = res.items.map((i) => ({ bestScore: null, attempts: 0, ...i }));
        setFail(null);
        setData((old) => ({
          base,
          name: res.category.name,
          items: res.page > 1 && old && old.base === base ? [...old.items, ...rows] : rows,
          page: res.page,
          totalPages: res.totalPages,
          total: res.total,
          summary: "summary" in res ? res.summary : null,
        }));
      })
      .catch((err) => {
        if (alive) setFail({ key: `${base}|${page}`, message: err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi." });
      });
    return () => {
      alive = false;
    };
  }, [slug, level, q, tab, token, authLoading, page, base]);

  const current = data && data.base === base ? data : null;
  const items = current?.items ?? [];
  const total = current?.total ?? 0;
  const totalPages = current?.totalPages ?? 1;
  const summary = current?.summary ?? null;
  const name = data?.name ?? "";
  const error = fail && fail.key === `${base}|${page}` ? fail.message : null;
  const busy = !error && (authLoading || !current || current.page < page);

  function listen(s: ProgressItem) {
    if (playing && activeId === s.id) {
      stop();
      return;
    }
    const p = readAudioPrefs();
    setActiveId(s.id);
    speak(s.textEn, { accent: p.accent, gender: p.gender, rate: p.rate });
  }

  function open(s: ProgressItem) {
    // Layar lebar: tampilkan di panel kanan. HP: langsung ke halaman pemutar.
    if (window.matchMedia("(min-width: 1024px)").matches) setSelected(s);
    else router.push(`/latih/${slug}/${s.id}`);
  }

  function changeTab(t: Tab) {
    setSelected(null);
    setTab(t);
  }

  function changeLevel(v: string) {
    setSelected(null);
    setLevel(v);
  }

  const filtered = Boolean(q || level || tab !== "all");
  const pct = summary && summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex items-start gap-3">
        <Link
          href="/latih"
          aria-label="Kembali ke kategori"
          className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-card"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[24px] font-bold leading-tight lg:text-3xl">{name || "Kategori"}</h1>
          <p className="mt-0.5 text-muted">{!error && (busy && items.length === 0 ? "Memuat…" : `${total} kalimat · latihan pelafalan`)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        {/* KIRI: cari, filter, daftar */}
        <div className="flex flex-col gap-3">
          {summary && (
            <div className="card !p-3">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-bold">
                  {summary.done} dari {summary.total} sudah dilatih
                </span>
                <span className="font-bold text-acc">{pct}%</span>
              </div>
              <div className="bar mt-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct} persen sudah dilatih`}>
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <input
            type="search"
            value={text}
            onChange={(e) => {
                        setSelected(null);
              setText(e.target.value);
            }}
            placeholder="Cari kalimat atau artinya"
            aria-label="Cari kalimat"
            className="field"
          />

          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring menurut level">
            <button type="button" aria-pressed={level === ""} className={`chip ${level === "" ? "chip-on" : ""}`} onClick={() => changeLevel("")}>
              Semua
            </button>
            {LEVELS.map((l) => (
              <button key={l} type="button" aria-pressed={level === l} className={`chip ${level === l ? "chip-on" : ""}`} onClick={() => changeLevel(level === l ? "" : l)}>
                {l}
              </button>
            ))}
          </div>

          {token && (
            <div className="grid grid-cols-3 rounded-[14px] bg-soft p-[3px] text-center text-[13px] font-semibold" role="group" aria-label="Saring menurut status latihan">
              {TABS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={tab === v}
                  onClick={() => changeTab(v)}
                  className={`rounded-[11px] py-2.5 ${tab === v ? "bg-card text-pri shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "bg-transparent text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="note note-bad" role="alert">
              <b>Kalimat belum bisa dimuat.</b>
              <p className="mt-1 text-[14px]">{error}</p>
              <button type="button" className="chip mt-3" onClick={() => setTries((n) => n + 1)}>
                Coba lagi
              </button>
            </div>
          )}

          {!busy && !error && items.length === 0 && (
            <div className="note">
              <b>{filtered ? "Tidak ada kalimat yang cocok." : "Belum ada kalimat di kategori ini."}</b>
              <p className="mt-1 text-[14px]">
                {filtered ? "Coba kata lain, atau pilih “Semua” untuk melepas filter." : "Kalimat baru ditambahkan bertahap. Coba kategori lain dulu."}
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-2.5">
            {items.map((s) => (
              <li
                key={s.id}
                className={`card flex items-center gap-3 !p-3 ${selected?.id === s.id ? "!border-[var(--pri)]" : ""}`}
              >
                {supported && (
                  <MiniPlay
                    playing={playing && activeId === s.id}
                    onClick={() => listen(s)}
                    label={playing && activeId === s.id ? "Hentikan suara" : `Putar: ${s.textEn}`}
                  />
                )}
                <button type="button" onClick={() => open(s)} className="flex min-w-0 grow items-center justify-between gap-3 bg-transparent text-left">
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-bold leading-snug">{s.textEn}</span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">{s.textId}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="chip !h-6 !px-2.5 !text-[11px]">{s.level}</span>
                    {token && <ScoreTag score={s.bestScore} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {busy && items.length > 0 && <p className="text-muted">Memuat…</p>}

          {!busy && page < totalPages && (
            <button type="button" className="btn btn-outline w-full" onClick={() => setWant({ base, page: page + 1 })}>
              Muat lebih banyak
            </button>
          )}
        </div>

        {/* KANAN (desktop): kalimat yang dipilih */}
        <div className="hidden lg:block">
          {!selected ? (
            <div className="card">
              <p className="text-muted">Pilih sebuah kalimat di kiri untuk melihat ejaan dan artinya.</p>
            </div>
          ) : (
            <section className="card flex flex-col gap-4 !p-6" aria-label="Kalimat yang dipilih">
              <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Dipilih</p>
              <h2 className="text-[28px] font-bold leading-[1.25]">{selected.textEn}</h2>
              <EjaanKalimat key={selected.id} text={selected.textEn} ipa={selected.phoneticIpa} easy={selected.phoneticEasy} />
              <ArtiCard text={selected.textId} />
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href={`/latih/${slug}/${selected.id}`} className="btn">
                  Mulai latihan
                </Link>
                {supported && (
                  <button type="button" className="btn btn-outline" onClick={() => listen(selected)}>
                    {playing && activeId === selected.id ? "■ Hentikan" : "Dengarkan dulu"}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
