"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { useAuth } from "./auth";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export const STATUS_LABEL: Record<string, string> = { PUBLISHED: "Tampil", DRAFT: "Disembunyikan", IN_REVIEW: "Disembunyikan" };
export type Paged<T> = { page: number; total: number; pageSize: number; items: T[] };

export function errText(e: unknown): string {
  return e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.";
}

// Ambil data admin. path = null berarti belum perlu mengambil.
// "loading" dihitung dari kunci, jadi tidak ada setState langsung di dalam effect.
export function useAdminData<T>(path: string | null) {
  const { token } = useAuth();
  const [bump, setBump] = useState(0);
  const key = `${path ?? ""}|${bump}`;
  const [res, setRes] = useState<{ key: string; data: T | null; error: string | null }>({ key: "", data: null, error: null });

  useEffect(() => {
    if (!path || !token) return;
    let off = false;
    api<T>(path, { token })
      .then((data) => {
        if (!off) setRes({ key, data, error: null });
      })
      .catch((e) => {
        if (!off) setRes((r) => ({ key, data: r.data, error: errText(e) }));
      });
    return () => {
      off = true;
    };
  }, [path, token, key]);

  const reload = useCallback(() => setBump((b) => b + 1), []);
  const loading = !!path && res.key !== key;
  return { data: res.data, loading, error: res.key === key ? res.error : null, reload };
}

// Kirim perubahan (tambah, ubah, hapus) dengan token admin.
export function useAdminCall() {
  const { token } = useAuth();
  return useCallback(
    <T,>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) => api<T>(path, { method, body, token }),
    [token],
  );
}

export function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
