"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useStats } from "@/lib/useStats";

// Chip streak di bilah atas ponsel. Hanya tampil kalau sudah masuk dan datanya ada.
export default function StreakChip() {
  const { stats } = useStats(7);
  if (!stats) return null;
  return (
    <Link href="/statistik" className="chip chip-gold" aria-label={`Streak ${stats.streak} hari`}>
      <Icon name="flame" className="size-4" />
      {stats.streak} hari
    </Link>
  );
}
