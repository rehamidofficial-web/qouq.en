"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type PhoneticInfo = { headword: string; phoneticIpa: string | null; phoneticEasy: string | null };

// Mengambil ejaan beberapa kata sekaligus dari kamus. `keyText` = kata-kata dipisah koma, huruf kecil.
// Hasil disimpan bersama kuncinya, jadi kalau kata berganti, hasil lama otomatis tidak dipakai.
export function usePhonetics(keyText: string): { map: Record<string, PhoneticInfo> | null; loading: boolean } {
  const [fetched, setFetched] = useState<{ key: string; map: Record<string, PhoneticInfo> | null } | null>(null);

  useEffect(() => {
    if (!keyText) return;
    let alive = true;
    api<PhoneticInfo[]>(`/dictionary/phonetics?words=${encodeURIComponent(keyText)}`)
      .then((rows) => {
        if (!alive) return;
        const map: Record<string, PhoneticInfo> = {};
        rows.forEach((r) => (map[r.headword.toLowerCase()] = r));
        setFetched({ key: keyText, map });
      })
      .catch(() => alive && setFetched({ key: keyText, map: null }));
    return () => {
      alive = false;
    };
  }, [keyText]);

  const done = fetched !== null && fetched.key === keyText;
  return { map: done ? fetched.map : null, loading: keyText !== "" && !done };
}
