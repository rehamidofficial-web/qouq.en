"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ChangeEvent } from "react";
import Avatar from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { applyTheme, getThemeServerSnapshot, getThemeSnapshot, subscribeTheme } from "@/components/ThemeToggle";
import { useAuth, type Level } from "@/lib/auth";
import { COVERS, coverCss } from "@/lib/covers";
import { resizeImage } from "@/lib/images";
import { useStats } from "@/lib/useStats";

function subscribeDark(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

function Section({ icon, title, sub, children, open }: { icon: "user" | "moon" | "stat"; title: string; sub: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="card group p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
        <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#f1dd9c,#dc8a45)] text-[#0f2a22]">
          <Icon name={icon} className="size-[18px]" />
        </span>
        <span className="flex-1">
          <b className="block">{title}</b>
          <span className="text-muted">{sub}</span>
        </span>
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-3.5">{children}</div>
    </details>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--acc)]" : "bg-[var(--line)]"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function EditProfil() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [level, setLevel] = useState<Level>(user?.profile?.level ?? "A1");
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined); // undefined = tidak diubah, null = hapus
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;

  const shownAvatar = avatar === undefined ? user.profile?.avatarUrl : avatar;
  const shownCover = cover ?? user.profile?.coverUrl ?? "tpl:3";

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>, kind: "avatar" | "cover") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (kind === "avatar") setAvatar(await resizeImage(file, 256, 256, 0.85));
      else setCover(await resizeImage(file, 900, 360, 0.8));
      setMsg(null);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Foto tidak bisa dipakai." });
    }
  }

  async function save() {
    if (name.trim().length < 2) {
      setMsg({ ok: false, text: "Nama minimal 2 huruf." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile({
        name: name.trim(),
        level,
        ...(avatar !== undefined && { avatarUrl: avatar ?? "" }),
        ...(cover !== undefined && { coverUrl: cover }),
      });
      setAvatar(undefined);
      setCover(undefined);
      setMsg({ ok: true, text: "Perubahan tersimpan." });
    } catch {
      setMsg({ ok: false, text: "Belum bisa menyimpan. Coba lagi sebentar lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Foto profil</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={name || user.name} src={shownAvatar} className="size-10" />
            <span className="text-muted">Foto saat ini</span>
          </div>
          <div className="flex gap-2">
            <label className="chip cursor-pointer">
              Ganti foto
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void pickPhoto(e, "avatar")} />
            </label>
            {shownAvatar && (
              <button type="button" className="chip" onClick={() => setAvatar(null)}>
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Nama</span>
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Email</span>
        <input className="field opacity-70" value={user.email} readOnly aria-readonly="true" />
      </label>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Level</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih level">
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={level === l} className={`chip ${level === l ? "chip-on" : ""}`} onClick={() => setLevel(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Sampul profil</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {COVERS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={shownCover === c.id}
              onClick={() => setCover(c.id)}
              className={`h-12 rounded-xl border-2 ${shownCover === c.id ? "border-[var(--acc)]" : "border-transparent"}`}
              style={{ background: c.css }}
            />
          ))}
        </div>
        <label className="btn btn-outline mt-3 w-full cursor-pointer">
          <Icon name="user" className="size-4" />
          Unggah foto sendiri
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void pickPhoto(e, "cover")} />
        </label>
        <p className="mt-1.5 text-center text-muted">JPG atau PNG, maksimal 2 MB</p>
      </div>

      {msg && (
        <p role="status" className={`note ${msg.ok ? "" : "note-bad"}`}>
          {msg.text}
        </p>
      )}
      <button type="button" className="btn w-full" disabled={busy} onClick={() => void save()}>
        {busy ? "Menyimpan..." : "Simpan perubahan"}
      </button>
    </>
  );
}

export default function ProfilPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { stats } = useStats(7);
  const themeNow = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const systemDark = useSyncExternalStore(subscribeDark, getSystemDark, () => false);
  const dark = themeNow === "dark" || (themeNow === "system" && systemDark);

  if (loading) return <p className="text-muted">Memuat akunmu...</p>;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="text-3xl font-bold">Profil</h1>
        <section className="card flex flex-col gap-2">
          <h2 className="text-xl font-bold">Belum masuk</h2>
          <p className="text-muted">Masuk untuk menyimpan progres belajarmu.</p>
          <div className="mt-2 flex gap-2">
            <Link href="/masuk" className="btn">Masuk</Link>
            <Link href="/daftar" className="btn btn-outline">Daftar</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-3xl font-bold">Profil</h1>

      <section className="card overflow-hidden p-0">
        <div className="h-28 sm:h-36" style={{ background: coverCss(user.profile?.coverUrl) }} />
        <div className="px-4 pb-4">
          <Avatar name={user.name} src={user.profile?.avatarUrl} className="-mt-9 size-[72px] !border-[3px] text-3xl shadow-lg" />
          <b className="mt-2 block font-serif text-xl">{user.name}</b>
          <p className="break-all text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip chip-ok">Level {user.profile?.level ?? "A1"}</span>
            {stats && (
              <span className="chip chip-gold">
                <Icon name="flame" className="size-4" />
                Streak {stats.streak} hari
              </span>
            )}
            {user.roles.includes("admin") && <span className="chip">admin</span>}
          </div>
        </div>
      </section>

      <Section icon="user" title="Edit profil" sub="Nama dan foto">
        <EditProfil />
      </Section>

      <Section icon="moon" title="Tampilan" sub="Terang atau gelap">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b>Aktifkan mode gelap</b>
            <p className="text-muted">Mengubah tema seluruh aplikasi</p>
          </div>
          <Switch on={dark} label="Aktifkan mode gelap" onChange={(v) => applyTheme(v ? "dark" : "light")} />
        </div>
        <button type="button" className="chip self-start" onClick={() => applyTheme("system")}>
          Ikuti pengaturan perangkat
        </button>
      </Section>

      <Section icon="stat" title="Pengaturan" sub="Akun">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b>Tambah akun</b>
            <p className="text-muted">Masuk dengan akun lain</p>
          </div>
          <button
            type="button"
            className="chip"
            onClick={() => {
              logout();
              router.push("/masuk");
            }}
          >
            + Tambah
          </button>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-danger w-full"
          onClick={() => {
            logout();
            router.push("/masuk");
          }}
        >
          Keluar dari akun
        </button>
      </Section>
    </div>
  );
}
