"use client";

import { useState, type FormEvent } from "react";
import { LEVELS, errText, qs, useAdminCall, useAdminData, type Paged } from "@/lib/admin";
import { posLabel, type Entry } from "@/lib/dictionary";
import { confirmDelete, Empty, ErrorNote, Field, Modal, Pager, RowActions, StatusChip, Toolbar } from "./ui";

type Row = {
  id: string;
  headword: string;
  level: string | null;
  status: string;
  phoneticEasy: string | null;
  senses: { partOfSpeech: string; meaningId: string }[];
};
type ExampleForm = { textEn: string; textId: string };
type SenseForm = { partOfSpeech: string; meaningId: string; definitionEn: string; examples: ExampleForm[] };
const POS = ["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PRONOUN", "PREPOSITION", "CONJUNCTION", "INTERJECTION", "DETERMINER", "OTHER"];
const blankSense = (): SenseForm => ({ partOfSpeech: "NOUN", meaningId: "", definitionEn: "", examples: [{ textEn: "", textId: "" }] });

type Detail = Entry & { status: string };

function toSenses(e: Detail | null): SenseForm[] {
  if (!e || e.senses.length === 0) return [blankSense()];
  return e.senses.map((s) => ({
    partOfSpeech: s.partOfSpeech,
    meaningId: s.meaningId,
    definitionEn: s.definitionEn ?? "",
    examples: s.examples.length ? s.examples.map((x) => ({ textEn: x.textEn, textId: x.textId })) : [{ textEn: "", textId: "" }],
  }));
}

function EntryForm({ initial, onDone, onClose }: { initial: Detail | null; onDone: () => void; onClose: () => void }) {
  const call = useAdminCall();
  const id = initial?.id ?? null;
  const [headword, setHeadword] = useState(initial?.headword ?? "");
  const [ipa, setIpa] = useState(initial?.phoneticIpa ?? "");
  const [easy, setEasy] = useState(initial?.phoneticEasy ?? "");
  const [level, setLevel] = useState<string>(initial?.level ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "PUBLISHED");
  const [senses, setSenses] = useState<SenseForm[]>(() => toSenses(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setSense(i: number, patch: Partial<SenseForm>) {
    setSenses((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }
  function setExample(i: number, k: number, patch: Partial<ExampleForm>) {
    setSenses((all) =>
      all.map((s, j) => (j === i ? { ...s, examples: s.examples.map((x, m) => (m === k ? { ...x, ...patch } : x)) } : s)),
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { headword, phoneticIpa: ipa, phoneticEasy: easy, level: level || null, status, senses };
      if (id) await call(`/admin/dictionary/${id}`, "PATCH", body);
      else await call("/admin/dictionary", "POST", body);
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={id ? "Ubah kata" : "Tambah kata"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <ErrorNote text={error} />
        <Field label="Kata (Inggris)">
          <input className="field" value={headword} onChange={(e) => setHeadword(e.target.value)} maxLength={80} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ejaan mudah" hint="Contoh: hə-LOU">
            <input className="field" value={easy} onChange={(e) => setEasy(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Ejaan IPA" hint="Contoh: həˈloʊ">
            <input className="field" value={ipa} onChange={(e) => setIpa(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Level">
            <select className="field" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Tidak diisi</option>
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
        </div>

        <h3 className="font-bold">Arti kata</h3>
        {senses.map((s, i) => (
          <fieldset key={i} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
            <legend className="px-1 font-semibold">Arti {i + 1}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Jenis kata">
                <select className="field" value={s.partOfSpeech} onChange={(e) => setSense(i, { partOfSpeech: e.target.value })}>
                  {POS.map((p) => (
                    <option key={p} value={p}>
                      {posLabel(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Arti (Indonesia)">
                <input className="field" value={s.meaningId} onChange={(e) => setSense(i, { meaningId: e.target.value })} maxLength={200} required />
              </Field>
            </div>
            <Field label="Definisi Inggris (boleh kosong)">
              <input className="field" value={s.definitionEn} onChange={(e) => setSense(i, { definitionEn: e.target.value })} maxLength={400} />
            </Field>
            {s.examples.map((x, k) => (
              <div key={k} className="grid gap-2 sm:grid-cols-2">
                <Field label={`Contoh ${k + 1} (Inggris)`}>
                  <input className="field" value={x.textEn} onChange={(e) => setExample(i, k, { textEn: e.target.value })} maxLength={300} />
                </Field>
                <Field label="Terjemahan Indonesia">
                  <input className="field" value={x.textId} onChange={(e) => setExample(i, k, { textId: e.target.value })} maxLength={300} />
                </Field>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" onClick={() => setSense(i, { examples: [...s.examples, { textEn: "", textId: "" }] })}>
                + Contoh kalimat
              </button>
              {senses.length > 1 && (
                <button type="button" className="chip !text-[var(--bad)]" onClick={() => setSenses((all) => all.filter((_, j) => j !== i))}>
                  Hapus arti ini
                </button>
              )}
            </div>
          </fieldset>
        ))}
        <button type="button" className="chip self-start" onClick={() => setSenses((a) => [...a, blankSense()])}>
          + Arti lain
        </button>

        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

function EntryLoader({ id, onDone, onClose }: { id: string; onDone: () => void; onClose: () => void }) {
  const { data, error } = useAdminData<Detail>(`/admin/dictionary/${id}`);
  if (!data) {
    return (
      <Modal title="Ubah kata" onClose={onClose}>
        {error ? <ErrorNote text={error} /> : <p className="text-muted">Memuat...</p>}
      </Modal>
    );
  }
  return <EntryForm initial={data} onDone={onDone} onClose={onClose} />;
}

function EntryHost({ id, onDone, onClose }: { id: string | null; onDone: () => void; onClose: () => void }) {
  return id ? <EntryLoader id={id} onDone={onDone} onClose={onClose} /> : <EntryForm initial={null} onDone={onDone} onClose={onClose} />;
}

export default function KamusPanel() {
  const call = useAdminCall();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | "baru" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, error: loadError, reload } = useAdminData<Paged<Row>>(`/admin/dictionary${qs({ q, status, page })}`);

  async function toggle(r: Row) {
    setError(null);
    try {
      await call(`/admin/dictionary/${r.id}/status`, "PATCH", { status: r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" });
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }
  async function remove(r: Row) {
    if (!confirmDelete(`kata "${r.headword}"`)) return;
    setError(null);
    try {
      await call(`/admin/dictionary/${r.id}`, "DELETE");
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Toolbar
        placeholder="Cari kata..."
        onSearch={(v) => {
          setQ(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onAdd={() => setEditing("baru")}
        addLabel="Kata baru"
      />
      <ErrorNote text={error ?? loadError} />
      <Empty loading={loading} count={data?.items.length ?? 0} />
      <ul className="flex flex-col gap-2">
        {data?.items.map((r) => (
          <li key={r.id} className="card flex flex-col gap-2 !p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[17px]">{r.headword}</b>
              {r.phoneticEasy && <span className="text-muted">{r.phoneticEasy}</span>}
              {r.level && <span className="chip">{r.level}</span>}
              <StatusChip status={r.status} />
            </div>
            <p className="text-muted">{r.senses.map((s) => `${posLabel(s.partOfSpeech)}: ${s.meaningId}`).join(" · ") || "Belum ada arti"}</p>
            <RowActions status={r.status} onEdit={() => setEditing(r.id)} onToggle={() => void toggle(r)} onDelete={() => void remove(r)} />
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
      {editing && (
        <EntryHost
          key={editing}
          id={editing === "baru" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
