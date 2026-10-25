"use client";

import { useAdminData } from "@/lib/admin";
import { ErrorNote } from "./ui";

type Overview = {
  users: number;
  entries: number;
  sentences: number;
  topics: number;
  questions: number;
  hidden: { entries: number; sentences: number; questions: number };
};

export default function RingkasanPanel({ go }: { go: (tab: "kamus" | "kalimat" | "grammar" | "pengguna") => void }) {
  const { data, loading, error } = useAdminData<Overview>("/admin/overview");
  const tiles: { label: string; value: number; hidden?: number; tab: "kamus" | "kalimat" | "grammar" | "pengguna" }[] = data
    ? [
        { label: "Kata di kamus", value: data.entries, hidden: data.hidden.entries, tab: "kamus" },
        { label: "Kalimat latihan", value: data.sentences, hidden: data.hidden.sentences, tab: "kalimat" },
        { label: "Soal grammar", value: data.questions, hidden: data.hidden.questions, tab: "grammar" },
        { label: "Topik grammar", value: data.topics, tab: "grammar" },
        { label: "Pengguna", value: data.users, tab: "pengguna" },
      ]
    : [];
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote text={error} />
      {loading && !data && <p className="text-muted">Memuat...</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={() => go(t.tab)} className="card flex flex-col items-start gap-1 text-left">
            <span className="text-muted">{t.label}</span>
            <b className="font-serif text-3xl">{t.value}</b>
            {t.hidden ? <span className="chip chip-gold">{t.hidden} disembunyikan</span> : null}
          </button>
        ))}
      </div>
      <p className="note">
        Konten yang <b>disembunyikan</b> tidak tampil untuk pelajar, tetapi datanya tetap tersimpan dan bisa ditampilkan lagi kapan saja. Pakai <b>Hapus</b> hanya kalau memang tidak dipakai lagi.
      </p>
    </div>
  );
}
