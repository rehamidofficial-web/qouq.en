"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type Stats = {
  range: number;
  streak: number;
  today: { attempts: number; sentences: number; minutes: number; xp: number };
  sentences: number;
  attempts: number;
  avgScore: number | null;
  avgDelta: number | null;
  goalMinutes: number;
  xp: number;
  totalSentences: number;
  bestScore: number;
  trend: { date: string; attempts: number; avg: number | null; minutes: number }[];
  weakWords: { word: string; count: number }[];
};

export const GOAL_OPTIONS = [
  { minutes: 10, label: "10 menit" },
  { minutes: 15, label: "15 menit" },
  { minutes: 30, label: "30 menit" },
  { minutes: 60, label: "1 jam" },
];

// Ambil ringkasan belajar. Hasil disimpan bersama kuncinya supaya tidak ada setState langsung di effect.
export function useStats(days: 7 | 30) {
  const { token } = useAuth();
  const key = token ? `${days}:${token}` : "";
  const [got, setGot] = useState<{ key: string; data: Stats | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api<Stats>(`/practice/stats?days=${days}`, { token })
      .then((data) => alive && setGot({ key, data }))
      .catch(() => alive && setGot({ key, data: null }));
    return () => {
      alive = false;
    };
  }, [token, days, key]);

  const done = got !== null && got.key === key;
  return { stats: done ? got.data : null, loading: key !== "" && !done, loggedIn: !!token };
}
