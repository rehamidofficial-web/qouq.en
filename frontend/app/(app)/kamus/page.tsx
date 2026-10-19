"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { posLabel, posShort, type Entry, type SearchResult, type WordItem } from "@/lib/dictionary";

type PosFilter = "" | "VERB" | "NOUN";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

// Tombol bunyi sederhana memakai suara bawaan browser.
// Pemutar lengkap (suara wanita/pria, kecepatan, putar lambat) dibuat di tugas 4.
function PlayButton({ word }: { word: string }) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  if (!supported) return null;

  function play() {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Putar bunyi ${word}`}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#F1DD9C,#DC8A45)] text-[#0F2A22] shadow-[0_8px_20px_rgba(220,138,69,.3)] transition-transform active:scale-95"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}

export default function KamusPage() {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  // filter (chip Semua / Verb / Noun / B1)
  const [pos, setPos] = useState<PosFilter>("");
  const [b1, setB1] = useState(false);

  // autocomplete (saran saat mengetik)
  const [suggest, setSuggest] = useState<WordItem[]>([]);
  const [active, setActive] = useState(-1);

  // hasil pencarian penuh (setelah Enter)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WordItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // detail kata
  const [entry, setEntry] = useState<Entry | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const suggestSeq = useRef(0);
  const searchSeq = useRef(0);
  const detailSeq = useRef(0);

  const filterParams = `${pos ? `&pos=${pos}` : ""}${b1 ? "&level=B1" : ""}`;

  // Autocomplete: tunggu 250 ms setelah berhenti mengetik, baru tanya server.
  useEffect(() => {
    const q = text.trim();
    if (!q) {
      suggestSeq.current++;
      setSuggest([]);
      return;
    }
    const seq = ++suggestSeq.current;
    const t = setTimeout(async () => {
      try {
        const rows = await api<WordItem[]>(`/dictionary/autocomplete?q=${encodeURIComponent(q)}&limit=8${filterParams}`);
        if (seq === suggestSeq.current) {
          setSuggest(rows);
          setActive(-1);
        }
      } catch {
        if (seq === suggestSeq.current) setSuggest([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text, filterParams]);

  const runSearch = useCallback(async (q: string, p: number, filters: string) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    setListError(null);
    try {
      const res = await api<SearchResult>(`/dictionary/search?q=${encodeURIComponent(q)}&page=${p}&limit=20${filters}`);
      if (seq !== searchSeq.current) return;
      setResults((old) => (p === 1 ? res.items : [...old, ...res.items]));
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch (err) {
      if (seq !== searchSeq.current) return;
      setListError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  }, []);

  const openEntry = useCallback(async (id: string) => {
    const seq = ++detailSeq.current;
    setShowDetail(true);
    setDetailBusy(true);
    setDetailError(null);
    setEntry(null);
    try {
      const data = await api<Entry>(`/dictionary/entries/${id}`);
      if (seq === detailSeq.current) setEntry(data);
    } catch (err) {
      if (seq === detailSeq.current) setDetailError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      if (seq === detailSeq.current) setDetailBusy(false);
    }
  }, []);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    setFocused(false);
    setQuery(q);
    setResults([]);
    setShowDetail(false);
    runSearch(q, 1, filterParams);
  }

  function changeFilter(nextPos: PosFilter, nextB1: boolean) {
    setPos(nextPos);
    setB1(nextB1);
    if (query) {
      setResults([]);
      runSearch(query, 1, `${nextPos ? `&pos=${nextPos}` : ""}${nextB1 ? "&level=B1" : ""}`);
    }
  }

  function pick(item: WordItem) {
    setText(item.headword);
    setFocused(false);
    openEntry(item.id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggest.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % suggest.length);
    } else if (e.key === "ArrowUp" && suggest.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggest.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && suggest[active]) {
      e.preventDefault();
      pick(suggest[active]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  const dropdownOpen = focused && text.trim() !== "" && suggest.length > 0;
  const hasSearched = query !== "";
  const noFilter = pos === "" && !b1;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <h1 className="text-[28px] font-bold lg:text-3xl">Kamus</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        {/* KIRI: cari, filter, daftar. Di HP daftar disembunyikan saat sebuah kata dibuka. */}
        <div className="card">
          <form onSubmit={submit} role="search" className="relative">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                onKeyDown={onKeyDown}
                placeholder="Cari kata bahasa Inggris"
                aria-label="Cari kata"
                role="combobox"
                aria-expanded={dropdownOpen}
                aria-controls="saran-kata"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="field pl-10"
              />
            </div>

            {dropdownOpen && (
              <ul
                id="saran-kata"
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-line bg-card shadow-[0_12px_28px_rgba(15,42,34,.18)]"
              >
                {suggest.map((s, i) => (
                  <li key={s.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(s)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] font-semibold ${i === active ? "bg-soft" : "bg-transparent hover:bg-soft"}`}
                    >
                      {s.headword}
                      {s.pos?.[0] && <span className="chip !h-6 !px-2.5 !text-[11px]">{posShort(s.pos[0])}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Saring hasil">
            <button type="button" aria-pressed={noFilter} className={`chip ${noFilter ? "chip-on" : ""}`} onClick={() => changeFilter("", false)}>
              Semua
            </button>
            <button type="button" aria-pressed={pos === "VERB"} className={`chip ${pos === "VERB" ? "chip-on" : ""}`} onClick={() => changeFilter(pos === "VERB" ? "" : "VERB", b1)}>
              Verb
            </button>
            <button type="button" aria-pressed={pos === "NOUN"} className={`chip ${pos === "NOUN" ? "chip-on" : ""}`} onClick={() => changeFilter(pos === "NOUN" ? "" : "NOUN", b1)}>
              Noun
            </button>
            <button type="button" aria-pressed={b1} className={`chip ${b1 ? "chip-on" : ""}`} onClick={() => changeFilter(pos, !b1)}>
              B1
            </button>
          </div>

          <div className={`mt-3 ${showDetail ? "hidden lg:block" : ""}`}>
            {!hasSearched && (
              <p className="text-muted">
                Ketik kata dalam bahasa Inggris. Saran muncul saat kamu mengetik; tekan Enter untuk melihat semua hasil.
              </p>
            )}

            {listError && (
              <div className="note note-bad" role="alert">
                <b>Pencarian gagal.</b>
                <p className="mt-1 text-[14px]">{listError}</p>
                <button type="button" className="chip mt-3" onClick={() => runSearch(query, page, filterParams)}>
                  Coba lagi
                </button>
              </div>
            )}

            {hasSearched && !listError && !searching && results.length === 0 && (
              <div className="note">
                <b>Kata tidak ditemukan.</b>
                <p className="mt-1 text-[14px]">
                  Periksa ejaannya, atau coba bentuk dasar katanya (misalnya “run”, bukan “running”).
                  {!noFilter && " Filter yang aktif juga bisa membatasi hasil."}
                </p>
              </div>
            )}

            {results.length > 0 && (
              <ul className="flex flex-col">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => openEntry(r.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold ${
                        entry?.id === r.id ? "bg-soft" : "bg-transparent hover:bg-soft"
                      }`}
                    >
                      {r.headword}
                      {r.pos?.[0] && <span className="chip !h-6 !px-2.5 !text-[11px]">{posShort(r.pos[0])}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {searching && <p className="py-3 text-muted">Mencari…</p>}

            {hasMore && !searching && (
              <button type="button" className="btn btn-outline mt-3 w-full" onClick={() => runSearch(query, page + 1, filterParams)}>
                Muat lebih banyak
              </button>
            )}
          </div>
        </div>

        {/* KANAN: detail kata. Di HP tampil tepat di bawah kolom cari, seperti desain. */}
        <div>
          {!showDetail && (
            <div className="card hidden lg:block">
              <p className="text-muted">Pilih sebuah kata di kiri untuk melihat arti, ejaan, dan contohnya.</p>
            </div>
          )}

          {detailBusy && (
            <div className="card" aria-busy="true">
              <p className="text-muted">Memuat kata…</p>
            </div>
          )}

          {detailError && (
            <div className="note note-bad" role="alert">
              <b>Kata tidak bisa dibuka.</b>
              <p className="mt-1 text-[14px]">{detailError}</p>
            </div>
          )}

          {entry && <EntryDetail entry={entry} />}
        </div>
      </div>
    </div>
  );
}

// Menebalkan kata yang sedang dicari di dalam kalimat contoh.
function Highlight({ text, word }: { text: string; word: string }) {
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(\\b${safe}\\w*)`, "i"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i}>{p}</b>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function EntryDetail({ entry }: { entry: Entry }) {
  const senses = [...entry.senses].sort((a, b) => a.sortOrder - b.sortOrder);
  const kinds = Array.from(new Set(senses.map((s) => s.partOfSpeech)));
  const syn = (entry.relations ?? []).filter((r) => r.type === "SYNONYM").map((r) => r.relatedEntry.headword);
  const ant = (entry.relations ?? []).filter((r) => r.type === "ANTONYM").map((r) => r.relatedEntry.headword);

  return (
    <article className="card lg:!p-[22px]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[30px] font-bold leading-tight lg:text-[42px]">{entry.headword}</h2>
        <PlayButton word={entry.headword} />
      </div>

      {(entry.phoneticIpa || entry.phoneticEasy) && (
        <p className="mt-1.5 text-[13px] font-semibold text-pri lg:text-[14px]">
          {entry.phoneticIpa}
          {entry.phoneticIpa && entry.phoneticEasy ? " · " : ""}
          {entry.phoneticEasy ? `“${entry.phoneticEasy}”` : ""}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <span key={k} className="chip !h-7 !px-2.5 !text-[11px]">
            {posLabel(k)}
          </span>
        ))}
        {entry.level && <span className="chip chip-ok !h-7 !px-2.5 !text-[11px]">{entry.level}</span>}
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {senses.map((s, i) => {
          const examples = [...s.examples].sort((a, b) => a.sortOrder - b.sortOrder);
          return (
            <section key={s.id} className={i > 0 ? "border-t border-line pt-4" : ""}>
              {senses.length > 1 && (
                <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">
                  {i + 1}. {posLabel(s.partOfSpeech)}
                </p>
              )}
              <p className="mt-1 text-[15px] font-bold lg:text-[17px]">{s.meaningId}</p>
              {s.definitionEn && <p className="text-[12px] text-muted lg:text-[13px]">{s.definitionEn}</p>}

              {examples.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-muted">Contoh</p>
                  <ul className="flex flex-col gap-2.5">
                    {examples.map((ex) => (
                      <li key={ex.id}>
                        <p className="text-[14px] lg:text-[15px]">
                          <Highlight text={ex.textEn} word={entry.headword} />
                        </p>
                        <p className="text-[12px] text-muted lg:text-[13px]">{ex.textId}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(syn.length > 0 || ant.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {syn.length > 0 && <span className="chip">Sinonim: {syn.slice(0, 4).join(", ")}</span>}
          {ant.length > 0 && <span className="chip">Antonim: {ant.slice(0, 4).join(", ")}</span>}
        </div>
      )}
    </article>
  );
}
