"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SentenceItem, SentencePage } from "@/lib/latih";

export default function KategoriPage() {
  const { slug } = useParams<{ slug: string }>();
  const [name, setName] = useState("");
  const [items, setItems] = useState<SentenceItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api<SentencePage>(`/categories/${encodeURIComponent(slug)}/sentences?page=${p}&limit=20`);
        setName(res.category.name);
        setItems((old) => (p === 1 ? res.items : [...old, ...res.items]));
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
      } finally {
        setBusy(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    setItems([]);
    load(1);
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <Link href="/latih" className="text-[13px] font-semibold text-pri">
          ← Semua kategori
        </Link>
        <h1 className="mt-2 text-[28px] font-bold lg:text-3xl">{name || "Kategori"}</h1>
        {!busy && !error && <p className="mt-1 text-muted">{total} kalimat</p>}
      </div>

      {error && (
        <div className="note note-bad" role="alert">
          <b>Kalimat belum bisa dimuat.</b>
          <p className="mt-1 text-[14px]">{error}</p>
          <button type="button" className="chip mt-3" onClick={() => load(page)}>
            Coba lagi
          </button>
        </div>
      )}

      {!busy && !error && items.length === 0 && (
        <div className="note">
          <b>Belum ada kalimat di kategori ini.</b>
          <p className="mt-1 text-[14px]">Kalimat baru ditambahkan bertahap. Coba kategori lain dulu.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {items.map((s) => (
          <li key={s.id}>
            <Link href={`/latih/${slug}/${s.id}`} className="card flex items-start justify-between gap-3 !p-3.5 hover:bg-soft">
              <span>
                <span className="block text-[15px] font-semibold">{s.textEn}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{s.textId}</span>
              </span>
              <span className="chip chip-ok !h-6 !px-2.5 !text-[11px]">{s.level}</span>
            </Link>
          </li>
        ))}
      </ul>

      {busy && <p className="text-muted">Memuat…</p>}

      {!busy && page < totalPages && (
        <button type="button" className="btn btn-outline w-full" onClick={() => load(page + 1)}>
          Muat lebih banyak
        </button>
      )}
    </div>
  );
}
