"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth";

export default function ProfilPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="mt-1 text-muted">Akun dan pengaturanmu.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr] lg:items-start">
        <section className="card flex flex-col gap-2" aria-live="polite">
          <span className="grid size-12 place-items-center rounded-full bg-soft text-pri">
            <Icon name="user" />
          </span>

          {loading ? (
            <p className="text-muted">Memuat akunmu...</p>
          ) : user ? (
            <>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="break-all text-muted">{user.email}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {user.roles.map((r) => (
                  <span key={r} className="chip chip-ok">
                    {r}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-danger mt-3 w-full"
                onClick={() => {
                  logout();
                  router.push("/masuk");
                }}
              >
                Keluar dari akun
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Belum masuk</h2>
              <p className="text-muted">Masuk untuk menyimpan progres belajarmu.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href="/masuk" className="btn">
                  Masuk
                </Link>
                <Link href="/daftar" className="btn btn-outline">
                  Daftar
                </Link>
              </div>
            </>
          )}
        </section>

        <section className="card flex flex-col gap-4" aria-labelledby="judul-tampilan">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#f1dd9c,#dc8a45)] text-[#0f2a22]">
              <Icon name="moon" className="size-[18px]" />
            </span>
            <div>
              <h2 id="judul-tampilan" className="text-lg font-bold">
                Tampilan
              </h2>
              <p className="text-muted">Terang, gelap, atau ikut pengaturan perangkat.</p>
            </div>
          </div>
          <ThemeToggle variant="labeled" />
        </section>
      </div>
    </div>
  );
}
