"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

export type User = { id: string; email: string; name: string; roles: string[] };

type AuthResponse = { accessToken: string; user: User };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const KEY = "qouq-token";
const AuthContext = createContext<AuthState | null>(null);

function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
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
        const me = await api<User>("/auth/me", { token: saved });
        if (!cancelled) {
          setToken(saved);
          setUser({ id: me.id, email: me.email, name: me.name, roles: me.roles });
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

  const applyAuth = useCallback((res: AuthResponse) => {
    saveToken(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      applyAuth(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }));
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

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
