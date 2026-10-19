"use client";

import { useSyncExternalStore } from "react";
import { Icon, type IconName } from "./icons";

type Theme = "light" | "dark" | "system";

const KEY = "qouq-theme";
const EVENT = "qouq-theme-change";

const OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: "light", label: "Terang", icon: "sun" },
  { value: "dark", label: "Gelap", icon: "moon" },
  { value: "system", label: "Ikut sistem", icon: "monitor" },
];

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function getServerSnapshot(): Theme {
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Penyimpanan diblokir: tema tetap berlaku sampai halaman ditutup.
  }
  window.dispatchEvent(new Event(EVENT));
}

export default function ThemeToggle({ variant = "icons" }: { variant?: "icons" | "labeled" }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (variant === "labeled") {
    return (
      <div role="group" aria-label="Pilih tampilan" className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => applyTheme(o.value)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc ${
                active
                  ? "border-pri bg-pri text-onpri"
                  : "border-line bg-card text-muted hover:text-ink"
              }`}
            >
              <Icon name={o.icon} className="size-5" />
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Pilih tampilan"
      className="inline-flex gap-1 rounded-full border border-line bg-soft p-1"
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
            onClick={() => applyTheme(o.value)}
            className={`grid size-9 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc ${
              active ? "bg-pri text-onpri" : "text-muted hover:text-ink"
            }`}
          >
            <Icon name={o.icon} className="size-4.5" />
          </button>
        );
      })}
    </div>
  );
}
