"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Pelajaran from "@/components/grammar/Pelajaran";
import { api, ApiError } from "@/lib/api";
import type { TopicDetail } from "@/lib/grammar";

export default function PelajaranPage() {
  const { slug } = useParams<{ slug: string }>();
  // key={slug}: pindah topik = tampilan dibuat baru.
  return <Halaman key={slug} slug={slug} />;
}

function Halaman({ slug }: { slug: string }) {
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<TopicDetail>(`/grammar/topics/${encodeURIComponent(slug)}`)
      .then((t) => alive && setTopic(t))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/grammar"
        aria-label="Kembali ke daftar topik"
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </Link>

      {error && (
        <div className="note note-bad" role="alert">
          <b>Topik tidak bisa dibuka.</b>
          <p className="mt-1 text-[14px]">{error}</p>
        </div>
      )}
      {!topic && !error && <p className="text-muted">Memuat pelajaran…</p>}
      {topic && <Pelajaran topic={topic} />}
    </div>
  );
}
