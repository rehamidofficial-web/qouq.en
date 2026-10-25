"use client";

import { useState, type FormEvent } from "react";
import { LEVELS, errText, qs, useAdminCall, useAdminData, type Paged } from "@/lib/admin";
import { confirmDelete, Empty, ErrorNote, Field, Modal, Pager, RowActions, StatusChip, TextArea, Toolbar } from "./ui";

type Category = { id: string; slug: string; name: string; _count: { sentences: number } };
type Sentence = {
  id: string;
  categoryId: string;
  textEn: string;
  textId: string;
  phoneticIpa: string | null;
  phoneticEasy: string | null;
  level: string;
  notes: string | null;
  status: string;
  category: { name: string };
};

function SentenceForm({ item, categories, defaultCategory, onDone, onClose }: { item: Sentence | null; categories: Category[]; defaultCategory: string; onDone: () => void; onClose: () => void }) {
  const call = useAdminCall();
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? (defaultCategory || categories[0]?.id || ""));
  const [textEn, setTextEn] = useState(item?.textEn ?? "");
  const [textId, setTextId] = useState(item?.textId ?? "");
  const [easy, setEasy] = useState(item?.phoneticEasy ?? "");
  const [ipa, setIpa] = useState(item?.phoneticIpa ?? "");
  const [level, setLevel] = useState<string>(item?.level ?? "A1");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [status, setStatus] = useState<string>(item?.status ?? "PUBLISHED");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { categoryId, textEn, textId, phoneticEasy: easy, phoneticIpa: ipa, level, notes, status };
      if (item) await call(`/admin/sentences/${item.id}`, "PATCH", body);
      else await call("/admin/sentences", "POST", body);
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={item ? "Ubah kalimat" : "Tambah kalimat"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <ErrorNote text={error} />
        <Field label="Kategori">
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kalimat (Inggris)">
          <TextArea value={textEn} onChange={(e) => setTextEn(e.target.value)} maxLength={400} required />
        </Field>
        <Field label="Terjemahan (Indonesia)">
          <TextArea value={textId} onChange={(e) => setTextId(e.target.value)} maxLength={400} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Level">
            <select className="field" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PUBLISHED">Tampil</option>
              <option value="DRAFT">Disembunyikan</option>
            </select>
          </Field>
          <Field label="Ejaan mudah (boleh kosong)">
            <input className="field" value={easy} onChange={(e) => setEasy(e.target.value)} maxLength={300} />
          </Field>
          <Field label="Ejaan IPA (boleh kosong)">
            <input className="field" value={ipa} onChange={(e) => setIpa(e.target.value)} maxLength={300} />
          </Field>
        </div>
        <Field label="Catatan (boleh kosong)">
          <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={400} />
        </Field>
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

export default function KalimatPanel() {
  const call = useAdminCall();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Sentence | "baru" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cats = useAdminData<Category[]>("/admin/categories");
  const { data, loading, error: loadError, reload } = useAdminData<Paged<Sentence>>(`/admin/sentences${qs({ q, status, categoryId, page })}`);
  const categories = cats.data ?? [];

  async function toggle(r: Sentence) {
    setError(null);
    try {
      await call(`/admin/sentences/${r.id}/status`, "PATCH", { status: r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" });
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }
  async function remove(r: Sentence) {
    if (!confirmDelete("kalimat ini beserta riwayat latihannya")) return;
    setError(null);
    try {
      await call(`/admin/sentences/${r.id}`, "DELETE");
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Toolbar
        placeholder="Cari kalimat..."
        onSearch={(v) => {
          setQ(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onAdd={categories.length ? () => setEditing("baru") : undefined}
        addLabel="Kalimat baru"
        extra={
          <select
            className="field sm:!w-52"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            aria-label="Saring kategori"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c._count.sentences})
              </option>
            ))}
          </select>
        }
      />
      <ErrorNote text={error ?? loadError} />
      <Empty loading={loading} count={data?.items.length ?? 0} />
      <ul className="flex flex-col gap-2">
        {data?.items.map((r) => (
          <li key={r.id} className="card flex flex-col gap-2 !p-3">
            <p className="font-semibold">{r.textEn}</p>
            <p className="text-muted">{r.textId}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{r.category.name}</span>
              <span className="chip">{r.level}</span>
              <StatusChip status={r.status} />
            </div>
            <RowActions status={r.status} onEdit={() => setEditing(r)} onToggle={() => void toggle(r)} onDelete={() => void remove(r)} />
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
      {editing && (
        <SentenceForm
          key={editing === "baru" ? "baru" : editing.id}
          item={editing === "baru" ? null : editing}
          categories={categories}
          defaultCategory={categoryId}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
            cats.reload();
          }}
        />
      )}
    </div>
  );
}
