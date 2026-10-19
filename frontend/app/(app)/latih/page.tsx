"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/latih";

export default function LatihPage() {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api<Category[]>("/categories")
      .then((rows) => alive && setCats(rows))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [tries]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (cats ?? []).filter((c) => !k || c.name.toLowerCase().includes(k));
  }, [cats, q]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold lg:text-3xl">Pilih kategori</h1>
        <p className="mt-1 text-muted">Target hingga 500 kalimat per kategori</p>
      </div>

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
          const pct = Math.min(100, Math.round((c.sentenceCount / Math.max(1, c.targetCount)) * 100));
          return (
            <Link
              key={c.id}
              href={`/latih/${c.slug}`}
              className="card block !p-3 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            >
              <p className="text-[13px] font-semibold">{c.name}</p>
              <p className="mb-2 mt-0.5 text-[11px] text-muted">
                {c.sentenceCount} / {c.targetCount} kalimat
              </p>
              <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Terisi ${pct} persen`}>
                <i style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
