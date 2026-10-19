"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { api, ApiError } from "@/lib/api";
import type { SentenceDetail } from "@/lib/latih";

export default function PemutarPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const [s, setS] = useState<SentenceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setS(null);
    setError(null);
    api<SentenceDetail>(`/sentences/${encodeURIComponent(id)}`)
      .then((d) => alive && setS(d))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <Link href={`/latih/${slug}`} className="text-[13px] font-semibold text-pri">
          ← {s?.category.name ?? "Daftar kalimat"}
        </Link>
        <p className="mt-2 text-[13px] text-muted">{s ? `${s.category.name} · Mode Latihan` : "Mode Latihan"}</p>
      </div>

      {error && (
        <div className="note note-bad" role="alert">
          <b>Kalimat tidak bisa dibuka.</b>
          <p className="mt-1 text-[14px]">{error}</p>
        </div>
      )}

      {!s && !error && <p className="text-muted">Memuat kalimat…</p>}

      {s && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <section className="card lg:!p-[22px]">
            <h1 className="text-[22px] font-bold leading-[1.25] lg:text-[28px]">{s.textEn}</h1>
            {s.phoneticIpa && <p className="mt-2 text-[13px] font-semibold text-pri">{s.phoneticIpa}</p>}
            {s.phoneticEasy && <p className="mt-0.5 text-[13px] text-muted">“{s.phoneticEasy}”</p>}
            <div className="mt-4 rounded-2xl border border-line bg-soft/50 p-3.5 text-[14px]">
              <span className="text-muted">Arti</span>
              <br />
              {s.textId}
            </div>
            {s.notes && <p className="mt-3 text-[13px] text-muted">{s.notes}</p>}
          </section>

          <section className="card lg:!p-[22px]" aria-label="Pemutar suara">
            <AudioPlayer text={s.textEn} />
          </section>
        </div>
      )}
    </div>
  );
}
