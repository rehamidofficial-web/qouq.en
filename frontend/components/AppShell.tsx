"use client";

import Avatar from "@/components/Avatar";
import StreakChip from "@/components/stats/StreakChip";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/kamus", label: "Kamus", icon: "book" },
  { href: "/latih", label: "Latih", icon: "mic" },
  { href: "/statistik", label: "Statistik", icon: "stat" },
  { href: "/profil", label: "Profil", icon: "user" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  // Grammar bagian dari tab Latih.
  if (href === "/latih" && (path === "/grammar" || path.startsWith("/grammar/"))) return true;
  return path === href || path.startsWith(href + "/");
}

function Wordmark({ short = false }: { short?: boolean }) {
  return (
    <span className="font-serif text-2xl font-bold text-ink">
      {short ? "Q" : "Qouq"}
      {!short && <span className="text-gold">.en</span>}
    </span>
  );
}

// Kotak akun di bawah menu samping: foto + nama + level (desktop), foto saja (tablet).
function MeBox() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Link href="/profil" aria-label="Profil saya" className="mt-auto flex items-center gap-3 rounded-2xl p-2 hover:bg-soft">
      <Avatar name={user.name} src={user.profile?.avatarUrl} className="size-10" />
      <span className="hidden min-w-0 lg:block">
        <b className="block truncate text-[13px]">{user.name}</b>
        <span className="text-muted">Level {user.profile?.level ?? "A1"}</span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-1 md:grid md:grid-cols-[76px_1fr] lg:grid-cols-[230px_1fr]">
      {/* Tablet dan desktop: menu samping. Tablet = ikon saja, desktop = ikon + nama */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-1.5 border-r border-line bg-card p-3 backdrop-blur-md md:flex md:items-center lg:items-stretch lg:p-4">
        <Link href="/" aria-label="Qouq.en, ke beranda" className="mb-4 px-2 pt-2">
          <span className="lg:hidden">
            <Wordmark short />
          </span>
          <span className="hidden lg:inline">
            <Wordmark />
          </span>
        </Link>

        <nav aria-label="Menu utama" className="flex flex-col gap-1.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="nav-item md:max-lg:size-12 md:max-lg:justify-center md:max-lg:p-0"
            >
              <Icon name={item.icon} />
              <span className="md:max-lg:sr-only">{item.label}</span>
            </Link>
          ))}
        </nav>

        <MeBox />
      </aside>

      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
        {/* Ponsel: hanya nama aplikasi. Pilihan tema ada di Profil, sesuai desain */}
        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <StreakChip />
            {user && (
              <Link href="/profil" aria-label="Profil saya">
                <Avatar name={user.name} src={user.profile?.avatarUrl} className="size-9" />
              </Link>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-28 pt-6 md:px-8 md:pb-10 lg:pt-8">{children}</main>
      </div>

      {/* Ponsel: menu bawah */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className="tab-item"
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
