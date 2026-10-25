"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { api } from "@/lib/api";
import type { Category } from "@/lib/latih";
import type { CategoryProgress } from "@/lib/practice";
import { useAuth } from "@/lib/auth";
import CategoryImage from "@/components/CategoryImage";
import Avatar from "@/components/Avatar";
import { GOAL_OPTIONS, useStats } from "@/lib/useStats";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function today() {
  const d = new Date();
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
}

const TILES: { href: string; title: string; sub: string; icon: IconName }[] = [
  { href: "/kamus", title: "Cari kata", sub: "Kamus", icon: "search" },
  { href: "/grammar", title: "Latihan soal", sub: "Grammar", icon: "book" },
  { href: "/latih", title: "Pilih kategori", sub: "Latih", icon: "mic" },
  { href: "/statistik", title: "Lihat grafik", sub: "Statistik", icon: "stat" },
];

// Kategori yang paling banyak dilatih = "Lanjutkan belajar". Hasil disimpan bersama token.
function useLanjut(token: string | null) {
  const [got, setGot] = useState<{ token: string; name: string; slug: string; done: number; total: number } | null | undefined>(undefined);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    Promise.all([api<Category[]>("/categories"), api<CategoryProgress>("/practice/progress", { token })])
      .then(([cats, prog]) => {
        if (!alive) return;
        const best = [...prog.categories].sort((a, b) => b.practiced - a.practiced)[0];
        const c = best && cats.find((x) => x.id === best.categoryId);
        setGot(c ? { token, name: c.name, slug: c.slug, done: best.practiced, total: c.targetCount || c.sentenceCount } : null);
      })
      .catch(() => alive && setGot(null));
    return () => {
      alive = false;
    };
  }, [token]);
  return got && got.token === token ? got : null;
}

const MILESTONES = [3, 7, 14, 30, 60, 100];

function streakHint(streak: number) {
  const next = MILESTONES.find((m) => m > streak);
  if (streak === 0) return "Latih satu kalimat hari ini untuk memulai.";
  if (!next) return "Hebat, kamu konsisten sekali!";
  const left = next - streak;
  return `${left === 1 ? "Satu hari" : `${left} hari`} lagi untuk lencana Streak ${next}.`;
}

export default function BerandaPage() {
  const { user, token, loading, updateProfile } = useAuth();
  const { stats } = useStats(7);
  const lanjut = useLanjut(token);
  const [saving, setSaving] = useState(false);
  const first = user?.name.split(" ")[0];

  const goal = user?.profile?.dailyGoalMinutes ?? stats?.goalMinutes ?? 15;
  const minutes = stats?.today.minutes ?? 0;
  const pct = Math.min(100, Math.round((minutes / goal) * 100));
  const streak = stats?.streak ?? 0;
  const delta = stats?.avgDelta ?? null;

  async function pickGoal(m: number) {
    if (m === goal) return;
    setSaving(true);
    try {
      await updateProfile({ dailyGoalMinutes: m });
    } catch {
      // gagal menyimpan: pilihan lama tetap dipakai
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted">{today()}</p>
          <h1 className="text-4xl font-bold">{first ? `Hai, ${first}` : "Hai, selamat datang"}</h1>
        </div>
        {user && (
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/statistik" className="chip chip-gold h-10 gap-1.5 px-4">
              <Icon name="flame" className="size-4" />
              {streak} hari
            </Link>
            <Link href="/profil" aria-label="Profil">
              <Avatar name={user.name} src={user.profile?.avatarUrl} className="size-11" />
            </Link>
          </div>
        )}
      </div>

      {!loading && !user && (
        <section className="card flex flex-col gap-2">
          <b>Masuk untuk menyimpan progres belajarmu.</b>
          <p className="text-muted">Streak, skor, dan target harian muncul setelah kamu masuk.</p>
          <div className="flex gap-2">
            <Link href="/masuk" className="btn">Masuk</Link>
            <Link href="/daftar" className="btn btn-outline">Daftar</Link>
          </div>
        </section>
      )}

      {user && (
        <>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <section className="card flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-4">
                <div
                  className="grid size-20 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(var(--acc) ${pct}%, var(--line) 0)` }}
                  role="img"
                  aria-label={`Target harian ${pct} persen`}
                >
                  <span className="grid size-[60px] place-items-center rounded-full bg-[var(--bg)] font-serif text-lg font-bold">{pct}%</span>
                </div>
                <div>
                  <b>Target harian</b>
                  <p className="text-muted">
                    {minutes} dari {goal} menit
                  </p>
                  <p className="text-muted">+{stats?.today.xp ?? 0} XP hari ini</p>
                </div>
              </div>
              <div role="group" aria-label="Pilih target harian" className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((o) => (
                  <button
                    key={o.minutes}
                    type="button"
                    disabled={saving}
                    aria-pressed={goal === o.minutes}
                    onClick={() => void pickGoal(o.minutes)}
                    className={`chip ${goal === o.minutes ? "chip-on" : ""}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="card">
              <p className="text-muted">
                Skor rata-rata{delta !== null && delta !== 0 ? ` ${delta > 0 ? "naik" : "turun"} ${Math.abs(delta)}` : " minggu ini"}
              </p>
              <p className="mt-1 font-serif text-5xl font-bold">{stats?.avgScore ?? "–"}</p>
            </section>
          </div>

          <section className="card">
            <p className="text-muted">
              {streak > 0 ? `Streak ${streak} hari berturut-turut.` : "Belum ada streak."}
            </p>
            <b>{streakHint(streak)}</b>
          </section>

          <section className="card flex flex-col gap-3 overflow-hidden !p-0">
            {lanjut && <CategoryImage slug={lanjut.slug} name={lanjut.name} className="h-36 w-full sm:h-44" />}
            <div className="flex flex-col gap-3 p-5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Lanjutkan belajar</span>
            <b className="font-serif text-xl">{lanjut ? `${lanjut.name} · ${lanjut.done}/${lanjut.total}` : "Latihan mengucapkan kalimat"}</b>
            {lanjut && (
              <div className="bar" role="progressbar" aria-valuenow={lanjut.done} aria-valuemin={0} aria-valuemax={lanjut.total}>
                <i style={{ width: `${Math.min(100, (lanjut.done / Math.max(1, lanjut.total)) * 100)}%` }} />
              </div>
            )}
            <Link href={lanjut ? `/latih/${lanjut.slug}` : "/latih"} className="btn self-start">Lanjut latihan</Link>
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card flex flex-col gap-1.5">
            <Icon name={t.icon} />
            <b>{t.title}</b>
            <small className="text-muted">{t.sub}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
