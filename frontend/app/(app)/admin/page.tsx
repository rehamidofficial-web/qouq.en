"use client";

import Link from "next/link";
import { useState } from "react";
import GrammarPanel from "@/components/admin/GrammarPanel";
import KalimatPanel from "@/components/admin/KalimatPanel";
import KamusPanel from "@/components/admin/KamusPanel";
import PenggunaPanel from "@/components/admin/PenggunaPanel";
import RingkasanPanel from "@/components/admin/RingkasanPanel";
import { useAuth } from "@/lib/auth";

const TABS = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "kamus", label: "Kamus" },
  { id: "kalimat", label: "Kalimat latihan" },
  { id: "grammar", label: "Grammar" },
  { id: "pengguna", label: "Pengguna" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("ringkasan");

  if (loading) return <p className="text-muted">Memuat akunmu...</p>;

  if (!user || !user.roles.includes("admin")) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <h1 className="text-3xl font-bold">Admin</h1>
        <section className="card flex flex-col gap-2">
          <h2 className="text-xl font-bold">Halaman ini khusus admin</h2>
          <p className="text-muted">{user ? "Akunmu bukan admin." : "Masuk dulu dengan akun admin."}</p>
          <Link href={user ? "/" : "/masuk"} className="btn mt-2">
            {user ? "Kembali ke Beranda" : "Masuk"}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-3xl font-bold">Panel admin</h1>
      <div role="tablist" aria-label="Bagian admin" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`chip shrink-0 ${tab === t.id ? "chip-on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "ringkasan" && <RingkasanPanel go={setTab} />}
      {tab === "kamus" && <KamusPanel />}
      {tab === "kalimat" && <KalimatPanel />}
      {tab === "grammar" && <GrammarPanel />}
      {tab === "pengguna" && <PenggunaPanel />}
    </div>
  );
}
