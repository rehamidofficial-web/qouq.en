"use client";

import CategoryImage from "@/components/CategoryImage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/lib/latih";
import type { CategoryProgress } from "@/lib/practice";

export default function LatihPage() {
  const { token, loading: authLoading } = useAuth();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [practiced, setPracticed] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    api<Category[]>("/categories")
      .then((rows) => {
        if (alive) {
          setError(null);
          setCats(rows);
        }
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [tries]);

  // Sudah masuk: ambil berapa kalimat yang sudah kamu latih di tiap kategori.
  useEffect(() => {
    if (authLoading || !token) return;
    let alive = true;
    api<CategoryProgress>("/practice/progress", { token })
      .then((r) => {
        if (alive) setPracticed(Object.fromEntries(r.categories.map((c) => [c.categoryId, c.practiced])));
      })
      .catch(() => {
        /* kemajuan hanya pelengkap: kalau gagal, kartu tetap tampil biasa */
      });
    return () => {
      alive = false;
    };
  }, [token, authLoading]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (cats ?? []).filter((c) => !k || c.name.toLowerCase().includes(k) || (c.description ?? "").toLowerCase().includes(k));
  }, [cats, q]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold lg:text-3xl">Kategori pelafalan</h1>
        <p className="mt-1 text-muted">
          {cats ? `${cats.length} kategori · pilih satu untuk mulai berlatih` : "Pilih satu kategori untuk mulai berlatih"}
        </p>
      </div>

      <Link href="/grammar" className="card flex items-center justify-between gap-3 !p-3.5 transition-transform hover:-translate-y-0.5">
        <span>
          <b className="block text-[15px]">Latihan grammar</b>
          <span className="text-[12.5px] text-muted">Baca aturan singkat, lalu jawab soal pilihan ganda dan isian.</span>
        </span>
        <span aria-hidden="true" className="text-[18px] text-pri">
          →
        </span>
      </Link>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari kategori"
        aria-label="Cari kategori"
        className="field max-w-md"
      />

      {error && (
        <div className="note note-bad" role="alert">
          <b>Kategori belum bisa dimuat.</b>
          <p className="mt-1 text-[14px]">{error}</p>
          <button type="button" className="chip mt-3" onClick={() => setTries((n) => n + 1)}>
            Coba lagi
          </button>
        </div>
      )}

      {!cats && !error && <p className="text-muted">Memuat kategori…</p>}

      {cats && shown.length === 0 && (
        <div className="note">
          <b>Kategori tidak ditemukan.</b>
          <p className="mt-1 text-[14px]">Coba kata lain, misalnya “wawancara”.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 lg:gap-3.5">
        {shown.map((c) => {
          const mine = token ? (practiced[c.id] ?? 0) : null;
          const pct =
            mine === null
              ? Math.min(100, Math.round((c.sentenceCount / Math.max(1, c.targetCount)) * 100))
              : Math.min(100, Math.round((mine / Math.max(1, c.sentenceCount)) * 100));
          const empty = c.sentenceCount === 0;
          return (
            <Link
              key={c.id}
              href={`/latih/${c.slug}`}
              className="card flex min-w-0 flex-col gap-1.5 overflow-hidden !p-0 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            >
              <CategoryImage slug={c.slug} name={c.name} className="aspect-[16/9] w-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 pt-2">
              <p className="text-[14px] font-bold leading-tight">{c.name}</p>
              {c.description && <p className="line-clamp-2 text-[11.5px] text-muted">{c.description}</p>}
              <div className="mt-auto flex items-center gap-2 pt-1.5">
                <div className="bar grow" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${mine === null ? "Terisi" : "Sudah dilatih"} ${pct} persen`}>
                  <i style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11.5px] font-bold text-muted">{empty ? "Kosong" : mine === null ? `${c.sentenceCount}` : `${mine}/${c.sentenceCount}`}</span>
              </div>
              <p className="text-[11px] text-muted">{empty
                  ? "Belum ada kalimat"
                  : mine === null
                    ? `${c.sentenceCount} dari ${c.targetCount} kalimat`
                    : `${mine} dari ${c.sentenceCount} sudah dilatih`}
              </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
