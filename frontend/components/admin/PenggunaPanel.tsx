"use client";

import { useState } from "react";
import { errText, qs, useAdminCall, useAdminData, type Paged } from "@/lib/admin";
import { confirmDelete, Empty, ErrorNote, Pager, Toolbar } from "./ui";

type U = { id: string; email: string; name: string; createdAt: string; level: string | null; roles: string[]; sessions: number; grammarTries: number };

export default function PenggunaPanel() {
  const call = useAdminCall();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, error: loadError, reload } = useAdminData<Paged<U>>(`/admin/users${qs({ q, page })}`);

  async function remove(u: U) {
    if (!confirmDelete(`akun ${u.email} beserta semua progres belajarnya`)) return;
    setError(null);
    try {
      await call(`/admin/users/${u.id}`, "DELETE");
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Toolbar
        placeholder="Cari nama atau email..."
        onSearch={(v) => {
          setQ(v);
          setPage(1);
        }}
      />
      <ErrorNote text={error ?? loadError} />
      <Empty loading={loading} count={data?.items.length ?? 0} />
      <ul className="flex flex-col gap-2">
        {data?.items.map((u) => (
          <li key={u.id} className="card flex flex-col gap-2 !p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b>{u.name}</b>
              {u.roles.includes("admin") && <span className="chip chip-gold">admin</span>}
              {u.level && <span className="chip">Level {u.level}</span>}
            </div>
            <p className="break-all text-muted">{u.email}</p>
            <p className="text-muted">
              Daftar {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {u.sessions} sesi latihan · {u.grammarTries} kuis grammar
            </p>
            {!u.roles.includes("admin") && (
              <div>
                <button type="button" className="chip !border-[var(--bad)] !text-[var(--bad)]" onClick={() => void remove(u)}>
                  Hapus akun
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
    </div>
  );
}
