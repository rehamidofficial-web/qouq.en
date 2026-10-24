"use client";

import { useSyncExternalStore } from "react";

// Kata yang disimpan di Kamus. Disimpan di browser ini saja (localStorage).
const KEY = "qouq-saved-words";
const EVENT = "qouq-saved-words-change";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useIsSaved(word: string): boolean {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return (JSON.parse(raw) as string[]).includes(word.toLowerCase());
  } catch {
    return false;
  }
}

export function toggleSaved(word: string) {
  const w = word.toLowerCase();
  try {
    const list = JSON.parse(read()) as string[];
    const next = list.includes(w) ? list.filter((x) => x !== w) : [...list, w];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // penyimpanan diblokir: tidak ada yang disimpan
  }
  window.dispatchEvent(new Event(EVENT));
}
