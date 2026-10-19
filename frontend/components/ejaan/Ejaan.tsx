"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";

// ---------- Pilihan tampilan (IPA / Mudah / Keduanya), diingat di browser ----------
export type Mode = "both" | "ipa" | "easy";
const KEY = "qouq-ejaan";

// Pilihan disimpan di browser dan dibagikan ke semua tampilan ejaan yang sedang terbuka.
const listeners = new Set<() => void>();
let chosen: Mode | null = null; // dipakai juga kalau penyimpanan browser diblokir

function readMode(): Mode {
  if (chosen) return chosen;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "both" || v === "ipa" || v === "easy") return v;
  } catch {
    /* diabaikan */
  }
  return "both";
}

function subscribeMode(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      chosen = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function useMode(): [Mode, (m: Mode) => void] {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "both" as Mode);
  const change = (m: Mode) => {
    chosen = m;
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* diabaikan */
    }
    listeners.forEach((l) => l());
  };
  return [mode, change];
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const items: [Mode, string][] = [
    ["both", "Keduanya"],
    ["ipa", "IPA"],
    ["easy", "Mudah"],
  ];
  return (
    <div role="radiogroup" aria-label="Tampilan ejaan" className="grid grid-cols-3 rounded-xl bg-soft p-[3px] text-[12px] font-semibold">
      {items.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={mode === v}
          onClick={() => onChange(v)}
          className={`rounded-[10px] px-3 py-1.5 ${mode === v ? "bg-card text-pri shadow-[0_1px_4px_rgba(0,0,0,.12)]" : "bg-transparent text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------- Ejaan mudah: suku kata yang ditekan ditulis HURUF BESAR, di sini ditebalkan ----------
export function EasyText({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, wi) => (
        <span key={wi}>
          {wi > 0 && " "}
          {word.split("-").map((syl, si) => {
            const stressed = syl !== syl.toLowerCase() && syl === syl.toUpperCase();
            return (
              <span key={si}>
                {si > 0 && "-"}
                {stressed ? <b className="text-pri">{syl}</b> : syl}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}

function Explain() {
  return (
    <details className="mt-3 text-[13px] text-muted">
      <summary className="cursor-pointer font-semibold text-pri">Apa itu IPA dan ejaan mudah?</summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <p>
          <b>IPA</b> adalah simbol standar dunia untuk menulis bunyi. Tanda ˈ di depan suku kata berarti suku kata itu ditekan.
        </p>
        <p>
          <b>Ejaan mudah</b> menuliskan bunyi dengan huruf biasa yang akrab bagi lidah Indonesia. Suku kata yang ditekan
          ditebalkan. Ejaan ini dibuat otomatis, jadi hanya perkiraan. Selalu dengarkan suaranya juga.
        </p>
      </div>
    </details>
  );
}

// ---------- 1) Ejaan satu kata (dipakai di detail Kamus) ----------
export function EjaanKata({ ipa, easy }: { ipa: string | null; easy: string | null }) {
  if (!ipa && !easy) return <p className="mt-1.5 text-[13px] text-muted">Ejaan untuk kata ini belum tersedia.</p>;
  return (
    <p className="mt-1.5 text-[13px] lg:text-[14px]">
      {ipa && <span className="font-semibold text-pri">{ipa}</span>}
      {ipa && easy ? <span className="text-muted"> · </span> : null}
      {easy && (
        <span className="text-muted">
          “<EasyText text={easy} />”
        </span>
      )}
    </p>
  );
}

// ---------- 2) Ejaan kalimat: gabungan dari ejaan tiap kata di kamus ----------
type WordInfo = { headword: string; phoneticIpa: string | null; phoneticEasy: string | null };

function tokenize(text: string) {
  const raws = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
  return raws.map((raw) => ({ raw, key: raw.toLowerCase().replace("’", "'") }));
}

const strip = (s: string) => s.replace(/^\/|\/$/g, "");

export function EjaanKalimat({ text, ipa, easy }: { text: string; ipa?: string | null; easy?: string | null }) {
  const [mode, setMode] = useMode();
  const words = useMemo(() => tokenize(text), [text]);
  const keys = useMemo(() => Array.from(new Set(words.map((w) => w.key))), [words]);
  const keyText = keys.join(",");
  // Hasil disimpan bersama "kunci"-nya, jadi kalau kalimat berganti, hasil lama otomatis tidak dipakai.
  const [fetched, setFetched] = useState<{ key: string; info: Record<string, WordInfo> | null } | null>(null);

  useEffect(() => {
    if (!keyText) return;
    let alive = true;
    api<WordInfo[]>(`/dictionary/phonetics?words=${encodeURIComponent(keyText)}`)
      .then((rows) => {
        if (!alive) return;
        const map: Record<string, WordInfo> = {};
        rows.forEach((r) => (map[r.headword.toLowerCase()] = r));
        setFetched({ key: keyText, info: map });
      })
      .catch(() => alive && setFetched({ key: keyText, info: null }));
    return () => {
      alive = false;
    };
  }, [keyText]);

  const current = fetched && fetched.key === keyText ? fetched : null;
  const info: Record<string, WordInfo> | null = keyText ? (current?.info ?? null) : {};
  const failed = Boolean(current && current.info === null);

  // Kalau kalimat punya ejaan sendiri di database, itu yang dipakai. Kalau tidak, disusun dari kata-kata.
  const composed = useMemo(() => {
    if (!info) return { ipa: null as string | null, easy: null as string | null, missing: 0 };
    let missing = 0;
    const ipas: string[] = [];
    const easies: string[] = [];
    words.forEach((w) => {
      const x = info[w.key];
      if (!x || (!x.phoneticIpa && !x.phoneticEasy)) missing++;
      ipas.push(x?.phoneticIpa ? strip(x.phoneticIpa) : "?");
      easies.push(x?.phoneticEasy ?? "?");
    });
    const anyIpa = ipas.some((v) => v !== "?");
    const anyEasy = easies.some((v) => v !== "?");
    return {
      ipa: anyIpa ? `/${ipas.join(" ")}/` : null,
      easy: anyEasy ? easies.join(" ") : null,
      missing,
    };
  }, [info, words]);

  const sentenceIpa = ipa || composed.ipa;
  const sentenceEasy = easy || composed.easy;
  const showIpa = mode !== "easy";
  const showEasy = mode !== "ipa";
  const hasAny = Boolean(sentenceIpa || sentenceEasy);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Ejaan</p>
        <div className="w-[210px] max-w-[60%]">
          <ModeSwitch mode={mode} onChange={setMode} />
        </div>
      </div>

      {!info && !failed && <p className="mt-2 text-[13px] text-muted">Memuat ejaan…</p>}

      {failed && !hasAny && (
        <p className="mt-2 text-[13px] text-muted">Ejaan belum bisa dimuat. Periksa koneksi, lalu muat ulang halaman.</p>
      )}

      {hasAny && (
        <div className="mt-2">
          {showIpa && sentenceIpa && <p className="text-[13px] font-semibold text-pri lg:text-[14px]">{sentenceIpa}</p>}
          {showEasy && sentenceEasy && (
            <p className="mt-0.5 text-[13px] text-muted lg:text-[14px]">
              “<EasyText text={sentenceEasy} />”
            </p>
          )}
        </div>
      )}

      {info && words.length > 0 && (
        <>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ejaan per kata">
            {words.map((w, i) => {
              const x = info[w.key];
              const none = !x || (!x.phoneticIpa && !x.phoneticEasy);
              return (
                <li key={`${w.key}-${i}`} className="min-w-[56px] rounded-xl border border-line bg-soft/50 px-2.5 py-2 text-center">
                  <p className="text-[14px] font-semibold">{w.raw}</p>
                  {none ? (
                    <p className="text-[11px] text-muted">—</p>
                  ) : (
                    <>
                      {showIpa && x.phoneticIpa && <p className="text-[11px] font-semibold text-pri">{x.phoneticIpa}</p>}
                      {showEasy && x.phoneticEasy && (
                        <p className="text-[11px] text-muted">
                          <EasyText text={x.phoneticEasy} />
                        </p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {composed.missing > 0 && !ipa && (
            <p className="mt-2 text-[12px] text-muted">
              Tanda “—” dan “?” berarti kata itu belum ada ejaannya di kamus ({composed.missing} dari {words.length} kata).
            </p>
          )}
        </>
      )}

      <Explain />
    </div>
  );
}

// ---------- Kartu arti ----------
export function ArtiCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-soft/50 p-3.5 text-[14px] lg:text-[15px]">
      <span className="text-[12px] text-muted">Arti</span>
      <p className="mt-0.5">{text}</p>
    </div>
  );
}
