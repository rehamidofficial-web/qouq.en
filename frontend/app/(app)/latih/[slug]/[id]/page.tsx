"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { ArtiCard, EjaanKalimat } from "@/components/ejaan/Ejaan";
import Rekam from "@/components/rekam/Rekam";
import { api, ApiError } from "@/lib/api";
import type { SentenceDetail } from "@/lib/latih";

export default function PemutarPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  // key={id}: pindah kalimat = tampilan dibuat baru, jadi tidak perlu mengosongkan state satu per satu.
  return <Pemutar key={id} slug={slug} id={id} />;
}

function Pemutar({ slug, id }: { slug: string; id: string }) {
  const [s, setS] = useState<SentenceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
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
          <section className="card flex flex-col gap-4 lg:!p-[22px]">
            <h1 className="text-[22px] font-bold leading-[1.25] lg:text-[28px]">{s.textEn}</h1>
            <EjaanKalimat text={s.textEn} ipa={s.phoneticIpa} easy={s.phoneticEasy} />
            <ArtiCard text={s.textId} />
            {s.notes && <p className="text-[13px] text-muted">{s.notes}</p>}
          </section>

          <div className="flex flex-col gap-4">
            <section className="card lg:!p-[22px]" aria-label="Pemutar suara">
              <AudioPlayer text={s.textEn} />
            </section>
            <section className="card lg:!p-[22px]" aria-label="Rekam suara">
              <Rekam sentenceId={s.id} categoryId={s.category.id} text={s.textEn} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
