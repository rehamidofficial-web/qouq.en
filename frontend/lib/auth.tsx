"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export type Profile = { level: Level; dailyGoalMinutes: number; avatarUrl: string | null; coverUrl: string | null };
export type User = { id: string; email: string; name: string; roles: string[]; profile: Profile | null };
export type ProfilePatch = { name?: string; level?: Level; dailyGoalMinutes?: number; avatarUrl?: string; coverUrl?: string };

type AuthResponse = { accessToken: string; user: Omit<User, "profile"> };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  // Ubah data profil. avatarUrl/coverUrl berisi "" artinya dihapus.
  updateProfile: (patch: ProfilePatch) => Promise<void>;
};

const KEY = "qouq-token";
type MeResponse = Omit<User, "profile"> & { profile?: Partial<Profile> | null };

function toUser(me: MeResponse): User {
  const p = me.profile;
  return {
    id: me.id,
    email: me.email,
    name: me.name,
    roles: me.roles,
    profile: p
      ? { level: p.level ?? "A1", dailyGoalMinutes: p.dailyGoalMinutes ?? 15, avatarUrl: p.avatarUrl ?? null, coverUrl: p.coverUrl ?? null }
      : null,
  };
}

const AuthContext = createContext<AuthState | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// remember=false: token hanya disimpan sampai tab ditutup ("Ingat saya" tidak dicentang).
function saveToken(token: string | null, remember = true) {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(KEY, token);
  } catch {
    // Penyimpanan diblokir: login hanya berlaku sampai halaman ditutup.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Saat halaman dibuka: kalau ada token tersimpan, tanya backend siapa pemiliknya.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const saved = readToken();
      if (!saved) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await api<MeResponse>("/auth/me", { token: saved });
        if (!cancelled) {
          setToken(saved);
          setUser(toUser(me));
        }
      } catch {
        saveToken(null); // token kedaluwarsa atau tidak valid
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuth = useCallback((res: AuthResponse, remember = true) => {
    saveToken(res.accessToken, remember);
    setToken(res.accessToken);
    setUser({ ...res.user, profile: null });
    // Profil (foto, target harian) diambil terpisah; kalau gagal, tidak apa-apa.
    api<MeResponse>("/auth/me", { token: res.accessToken })
      .then((me) => setUser(toUser(me)))
      .catch(() => {});
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      applyAuth(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }), remember);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      applyAuth(await api<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password } }));
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    saveToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!token) throw new Error("Belum masuk");
      setUser(toUser(await api<MeResponse>("/auth/me", { method: "PATCH", body: patch, token })));
    },
    [token],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, updateProfile }),
    [user, token, loading, login, register, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
