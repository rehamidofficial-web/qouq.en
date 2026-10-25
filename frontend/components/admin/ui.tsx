"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { STATUS_LABEL } from "@/lib/admin";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto !rounded-b-none bg-[var(--bg)] sm:!rounded-b-[18px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold">{title}</h2>
          <button type="button" className="chip" onClick={onClose} aria-label="Tutup">
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field !h-auto min-h-20 py-2.5 ${props.className ?? ""}`} />;
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip ${status === "PUBLISHED" ? "chip-ok" : "chip-gold"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="note note-bad">
      {text}
    </p>
  );
}

export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const last = Math.max(Math.ceil(total / pageSize), 1);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">
        {total} data · halaman {page} dari {last}
      </span>
      <div className="flex gap-2">
        <button type="button" className="chip" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Sebelumnya
        </button>
        <button type="button" className="chip" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}

// Kotak cari + saring status + tombol tambah.
export function Toolbar({
  placeholder,
  onSearch,
  status,
  onStatus,
  onAdd,
  addLabel,
  extra,
}: {
  placeholder: string;
  onSearch: (q: string) => void;
  status?: string;
  onStatus?: (s: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  extra?: ReactNode;
}) {
  const [q, setQ] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(q.trim());
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form onSubmit={submit} className="flex flex-1 gap-2">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <button type="submit" className="btn btn-outline !px-4">
          Cari
        </button>
      </form>
      {extra}
      {onStatus && (
        <select className="field sm:!w-44" value={status ?? ""} onChange={(e) => onStatus(e.target.value)} aria-label="Saring status">
          <option value="">Semua status</option>
          <option value="PUBLISHED">Tampil</option>
          <option value="DRAFT">Disembunyikan</option>
        </select>
      )}
      {onAdd && (
        <button type="button" className="btn !px-5" onClick={onAdd}>
          + {addLabel ?? "Tambah"}
        </button>
      )}
    </div>
  );
}

// Tombol kecil di tiap baris: Ubah, Sembunyikan/Tampilkan, Hapus.
export function RowActions({
  status,
  onEdit,
  onToggle,
  onDelete,
  extra,
}: {
  status?: string;
  onEdit?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {extra}
      {onEdit && (
        <button type="button" className="chip" onClick={onEdit}>
          Ubah
        </button>
      )}
      {onToggle && (
        <button type="button" className="chip" onClick={onToggle}>
          {status === "PUBLISHED" ? "Sembunyikan" : "Tampilkan"}
        </button>
      )}
      {onDelete && (
        <button type="button" className="chip !border-[var(--bad)] !text-[var(--bad)]" onClick={onDelete}>
          Hapus
        </button>
      )}
    </div>
  );
}

export function confirmDelete(what: string) {
  return window.confirm(`Hapus ${what}? Ini tidak bisa dibatalkan.`);
}

export function Empty({ loading, count }: { loading: boolean; count: number }) {
  if (loading && count === 0) return <p className="text-muted">Memuat...</p>;
  if (count === 0) return <p className="text-muted">Belum ada data.</p>;
  return null;
}
