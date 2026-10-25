"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { usePhonetics } from "@/lib/usePhonetics";
import { useStats, type Stats } from "@/lib/useStats";

const TGL = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

// Grafik garis skor rata-rata per hari. Hari tanpa latihan dilewati.
function TrenSkor({ trend }: { trend: Stats["trend"] }) {
  const W = 300;
  const H = 100;
  const pts = trend
    .map((t, i) => ({ x: trend.length === 1 ? W / 2 : (i / (trend.length - 1)) * W, y: t.avg === null ? null : H - (t.avg / 100) * H, t }))
    .filter((p): p is { x: number; y: number; t: Stats["trend"][number] } => p.y !== null);

  if (pts.length === 0) return <p className="text-muted">Belum ada latihan di rentang ini.</p>;
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 6}`} className="h-36 w-full overflow-visible" role="img" aria-label="Grafik tren skor rata-rata per hari">
        {[0, 50, 100].map((v) => (
          <line key={v} x1="0" x2={W} y1={H - v} y2={H - v} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
        <polyline points={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.length > 1 && <circle cx={last.x} cy={last.y} r="4" fill="var(--acc)" />}
        {pts.length === 1 && <circle cx={last.x} cy={last.y} r="4" fill="var(--acc)" />}
      </svg>
      <div className="mt-1 flex justify-between text-muted">
        <span>{TGL.format(new Date(trend[0].date))}</span>
        <span>{TGL.format(new Date(trend[trend.length - 1].date))}</span>
      </div>
    </div>
  );
}

function Lencana({ stats }: { stats: Stats }) {
  const items = [
    { label: `Streak ${stats.streak}`, on: stats.streak >= 3 },
    { label: "100 kalimat", on: stats.totalSentences >= 100 },
    { label: "Skor 90", on: stats.bestScore >= 90 },
    { label: "Streak 7", on: stats.streak >= 7 },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((b) => (
        <span key={b.label} className={`chip ${b.on ? "chip-ok" : ""}`} style={b.on ? undefined : { opacity: 0.55 }}>
          {b.on ? "✓" : "🔒"} {b.label}
        </span>
      ))}
    </div>
  );
}

function PerluDilatih({ words }: { words: Stats["weakWords"] }) {
  const { map } = usePhonetics(words.map((w) => w.word).join(","));
  if (words.length === 0) return <p className="text-muted">Belum ada kata yang sering salah. Bagus!</p>;
  return (
    <ul className="flex flex-col gap-2">
      {words.map((w) => {
        const ipa = map?.[w.word]?.phoneticIpa;
        return (
          <li key={w.word} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-3.5 py-2.5">
            <span>
              <b>{w.word}</b> {ipa && <span className="text-muted">/{ipa.replace(/^\/|\/$/g, "")}/</span>}
            </span>
            <span className="chip chip-gold h-6 px-2.5 text-[11px]">{w.count}×</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function StatistikPage() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState<7 | 30>(7);
  const { stats, loading } = useStats(days);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Perkembanganmu</h1>
        <p className="mt-1 text-muted">Lihat seberapa jauh kamu sudah melangkah.</p>
      </div>

      {!authLoading && !user ? (
        <section className="card flex flex-col gap-2">
          <b>Masuk dulu untuk melihat statistikmu.</b>
          <Link href="/masuk" className="btn self-start">Masuk</Link>
        </section>
      ) : (
        <>
          <div className="flex gap-2" role="group" aria-label="Rentang waktu">
            {([7, 30] as const).map((d) => (
              <button key={d} type="button" className={`chip ${days === d ? "chip-on" : ""}`} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d === 7 ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>

          {loading && <p className="text-muted">Memuat statistik...</p>}
          {!loading && !stats && user && (
            <p role="alert" className="note note-bad">
              Statistik belum bisa dimuat. Coba lagi sebentar lagi.
            </p>
          )}

          {stats && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
                <div className="card">
                  <p className="text-muted">Kalimat</p>
                  <p className="font-serif text-3xl font-bold">{stats.sentences}</p>
                </div>
                <div className="card">
                  <p className="text-muted">Skor rata-rata</p>
                  <p className="font-serif text-3xl font-bold">
                    {stats.avgScore ?? "–"}
                    {stats.avgDelta ? (
                      <span className={`ml-1.5 text-sm ${stats.avgDelta > 0 ? "text-ok" : "text-bad"}`}>
                        {stats.avgDelta > 0 ? "▲" : "▼"} {Math.abs(stats.avgDelta)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="card">
                  <p className="text-muted">Streak</p>
                  <p className="flex items-center gap-1.5 font-serif text-3xl font-bold">
                    <Icon name="flame" className="size-6 text-acc" />
                    {stats.streak} hari
                  </p>
                </div>
                <div className="card">
                  <p className="text-muted">XP</p>
                  <p className="font-serif text-3xl font-bold">{stats.xp.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <section className="card flex flex-col gap-3">
                <h2 className="text-lg font-bold">Tren skor</h2>
                <TrenSkor trend={stats.trend} />
              </section>

              <div className="flex flex-col gap-4">
                <section className="card flex flex-col gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-[.08em] text-muted">Perlu dilatih</h2>
                  <PerluDilatih words={stats.weakWords} />
                </section>
                <section className="card flex flex-col gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-[.08em] text-muted">Lencana</h2>
                  <Lencana stats={stats} />
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
