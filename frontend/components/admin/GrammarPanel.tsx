"use client";

import { useState, type FormEvent } from "react";
import { LEVELS, errText, qs, useAdminCall, useAdminData, type Paged } from "@/lib/admin";
import { confirmDelete, Empty, ErrorNote, Field, Modal, Pager, RowActions, StatusChip, TextArea } from "./ui";

type Topic = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  sortOrder: number;
  _count: { questions: number; lessons: number };
};
type Lesson = { id: string; title: string; summary: string; examples: string | null; sortOrder: number };
type Option = { id?: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  topicId: string;
  type: "MULTIPLE_CHOICE" | "FILL_BLANK";
  prompt: string;
  explanation: string | null;
  level: string;
  status: string;
  sortOrder: number;
  acceptedAnswers: string[];
  options: Option[];
};

const StatusSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Field label="Status">
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="PUBLISHED">Tampil</option>
      <option value="DRAFT">Disembunyikan</option>
    </select>
  </Field>
);
const LevelSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Field label="Level">
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {LEVELS.map((l) => (
        <option key={l}>{l}</option>
      ))}
    </select>
  </Field>
);

// ---------------- Topik ----------------
function TopicForm({ item, onDone, onClose }: { item: Topic | null; onDone: () => void; onClose: () => void }) {
  const call = useAdminCall();
  const [title, setTitle] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [level, setLevel] = useState<string>(item?.level ?? "A1");
  const [status, setStatus] = useState<string>(item?.status ?? "PUBLISHED");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { title, slug, description, level, status, sortOrder: Number(sortOrder) || 0 };
      if (item) await call(`/admin/grammar/topics/${item.id}`, "PATCH", body);
      else await call("/admin/grammar/topics", "POST", body);
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Ubah topik" : "Tambah topik"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <ErrorNote text={error} />
        <Field label="Judul topik">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </Field>
        <Field label="Kode (slug)" hint="Huruf kecil dan tanda -, contoh: simple-present">
          <input className="field" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={60} required />
        </Field>
        <Field label="Deskripsi singkat">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <LevelSelect value={level} onChange={setLevel} />
          <StatusSelect value={status} onChange={setStatus} />
          <Field label="Urutan">
            <input className="field" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

// ---------------- Materi ----------------
function LessonForm({ topicId, item, onDone, onClose }: { topicId: string; item: Lesson | null; onDone: () => void; onClose: () => void }) {
  const call = useAdminCall();
  const [title, setTitle] = useState(item?.title ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [examples, setExamples] = useState(item?.examples ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { title, summary, examples, sortOrder: Number(sortOrder) || 0 };
      if (item) await call(`/admin/grammar/lessons/${item.id}`, "PATCH", body);
      else await call(`/admin/grammar/topics/${topicId}/lessons`, "POST", body);
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Ubah materi" : "Tambah materi"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <ErrorNote text={error} />
        <Field label="Judul materi">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </Field>
        <Field label="Penjelasan">
          <TextArea className="min-h-40" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={3000} required />
        </Field>
        <Field label="Contoh (boleh kosong)" hint="Satu contoh per baris">
          <TextArea value={examples} onChange={(e) => setExamples(e.target.value)} maxLength={2000} />
        </Field>
        <Field label="Urutan">
          <input className="field" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

// ---------------- Soal ----------------
function QuestionForm({ topicId, item, onDone, onClose }: { topicId: string; item: Question | null; onDone: () => void; onClose: () => void }) {
  const call = useAdminCall();
  const [type, setType] = useState<string>(item?.type ?? "MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState(item?.prompt ?? "");
  const [explanation, setExplanation] = useState(item?.explanation ?? "");
  const [level, setLevel] = useState<string>(item?.level ?? "A1");
  const [status, setStatus] = useState<string>(item?.status ?? "PUBLISHED");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [options, setOptions] = useState<Option[]>(
    item?.options.length ? item.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
  );
  const [accepted, setAccepted] = useState((item?.acceptedAnswers ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setOpt(i: number, patch: Partial<Option>) {
    setOptions((all) => all.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  }
  function markCorrect(i: number) {
    setOptions((all) => all.map((o, j) => ({ ...o, isCorrect: j === i })));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        topicId,
        type,
        prompt,
        explanation,
        level,
        status,
        sortOrder: Number(sortOrder) || 0,
        options,
        acceptedAnswers: accepted.split("\n"),
      };
      if (item) await call(`/admin/grammar/questions/${item.id}`, "PATCH", body);
      else await call("/admin/grammar/questions", "POST", body);
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? "Ubah soal" : "Tambah soal"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <ErrorNote text={error} />
        <Field label="Jenis soal">
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="MULTIPLE_CHOICE">Pilihan ganda</option>
            <option value="FILL_BLANK">Isian singkat</option>
          </select>
        </Field>
        <Field label="Soal" hint={type === "FILL_BLANK" ? "Tandai bagian kosong dengan ____" : undefined}>
          <TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={500} required />
        </Field>

        {type === "MULTIPLE_CHOICE" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-semibold">Pilihan jawaban (pilih satu yang benar)</legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="benar" checked={o.isCorrect} onChange={() => markCorrect(i)} aria-label={`Pilihan ${i + 1} benar`} className="size-5 accent-[var(--acc)]" />
                <input className="field" value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} maxLength={200} placeholder={`Pilihan ${i + 1}`} />
                {options.length > 2 && (
                  <button type="button" className="chip !text-[var(--bad)]" onClick={() => setOptions((a) => a.filter((_, j) => j !== i))}>
                    Hapus
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="chip self-start" onClick={() => setOptions((a) => [...a, { text: "", isCorrect: false }])}>
                + Pilihan
              </button>
            )}
          </fieldset>
        ) : (
          <Field label="Jawaban yang diterima" hint="Satu jawaban per baris. Besar kecil huruf tidak berpengaruh.">
            <TextArea value={accepted} onChange={(e) => setAccepted(e.target.value)} />
          </Field>
        )}

        <Field label="Penjelasan jawaban (boleh kosong)">
          <TextArea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={800} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <LevelSelect value={level} onChange={setLevel} />
          <StatusSelect value={status} onChange={setStatus} />
          <Field label="Urutan">
            <input className="field" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
        </div>
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </Modal>
  );
}

// ---------------- Isi satu topik: materi + soal ----------------
function TopicDetail({ topic, onBack }: { topic: Topic; onBack: () => void }) {
  const call = useAdminCall();
  const [error, setError] = useState<string | null>(null);
  const [lessonEdit, setLessonEdit] = useState<Lesson | "baru" | null>(null);
  const [qEdit, setQEdit] = useState<Question | "baru" | null>(null);
  const [qPage, setQPage] = useState(1);
  const lessons = useAdminData<Lesson[]>(`/admin/grammar/topics/${topic.id}/lessons`);
  const qs_ = useAdminData<Paged<Question>>(`/admin/grammar/questions${qs({ topicId: topic.id, page: qPage })}`);

  async function run(job: () => Promise<unknown>, after: () => void) {
    setError(null);
    try {
      await job();
      after();
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="chip" onClick={onBack}>
          ← Semua topik
        </button>
        <h2 className="font-serif text-xl font-bold">{topic.title}</h2>
      </div>
      <ErrorNote text={error ?? lessons.error ?? qs_.error} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Materi</h3>
          <button type="button" className="btn !h-10 !px-4" onClick={() => setLessonEdit("baru")}>
            + Materi
          </button>
        </div>
        <Empty loading={lessons.loading} count={lessons.data?.length ?? 0} />
        {lessons.data?.map((l) => (
          <div key={l.id} className="card flex flex-col gap-2 !p-3">
            <b>{l.title}</b>
            <p className="line-clamp-2 text-muted">{l.summary}</p>
            <RowActions
              onEdit={() => setLessonEdit(l)}
              onDelete={() => {
                if (confirmDelete(`materi "${l.title}"`)) void run(() => call(`/admin/grammar/lessons/${l.id}`, "DELETE"), lessons.reload);
              }}
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Soal latihan</h3>
          <button type="button" className="btn !h-10 !px-4" onClick={() => setQEdit("baru")}>
            + Soal
          </button>
        </div>
        <Empty loading={qs_.loading} count={qs_.data?.items.length ?? 0} />
        {qs_.data?.items.map((q) => (
          <div key={q.id} className="card flex flex-col gap-2 !p-3">
            <p className="font-semibold">{q.prompt}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{q.type === "MULTIPLE_CHOICE" ? "Pilihan ganda" : "Isian"}</span>
              <span className="chip">{q.level}</span>
              <StatusChip status={q.status} />
            </div>
            <RowActions
              status={q.status}
              onEdit={() => setQEdit(q)}
              onToggle={() =>
                void run(() => call(`/admin/grammar/questions/${q.id}/status`, "PATCH", { status: q.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }), qs_.reload)
              }
              onDelete={() => {
                if (confirmDelete("soal ini")) void run(() => call(`/admin/grammar/questions/${q.id}`, "DELETE"), qs_.reload);
              }}
            />
          </div>
        ))}
        {qs_.data && <Pager page={qs_.data.page} total={qs_.data.total} pageSize={qs_.data.pageSize} onPage={setQPage} />}
      </section>

      {lessonEdit && (
        <LessonForm
          key={lessonEdit === "baru" ? "baru" : lessonEdit.id}
          topicId={topic.id}
          item={lessonEdit === "baru" ? null : lessonEdit}
          onClose={() => setLessonEdit(null)}
          onDone={() => {
            setLessonEdit(null);
            lessons.reload();
          }}
        />
      )}
      {qEdit && (
        <QuestionForm
          key={qEdit === "baru" ? "baru" : qEdit.id}
          topicId={topic.id}
          item={qEdit === "baru" ? null : qEdit}
          onClose={() => setQEdit(null)}
          onDone={() => {
            setQEdit(null);
            qs_.reload();
          }}
        />
      )}
    </div>
  );
}

export default function GrammarPanel() {
  const call = useAdminCall();
  const [open, setOpen] = useState<Topic | null>(null);
  const [editing, setEditing] = useState<Topic | "baru" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, error: loadError, reload } = useAdminData<Topic[]>("/admin/grammar/topics");

  if (open) return <TopicDetail topic={open} onBack={() => { setOpen(null); reload(); }} />;

  async function run(job: () => Promise<unknown>) {
    setError(null);
    try {
      await job();
      reload();
    } catch (e) {
      setError(errText(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button type="button" className="btn !px-5" onClick={() => setEditing("baru")}>
          + Topik baru
        </button>
      </div>
      <ErrorNote text={error ?? loadError} />
      <Empty loading={loading} count={data?.length ?? 0} />
      <ul className="flex flex-col gap-2">
        {data?.map((t) => (
          <li key={t.id} className="card flex flex-col gap-2 !p-3">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[17px]">{t.title}</b>
              <span className="chip">{t.level}</span>
              <StatusChip status={t.status} />
            </div>
            <p className="text-muted">
              {t._count.lessons} materi · {t._count.questions} soal
            </p>
            <RowActions
              status={t.status}
              extra={
                <button type="button" className="chip chip-on" onClick={() => setOpen(t)}>
                  Isi materi dan soal
                </button>
              }
              onEdit={() => setEditing(t)}
              onToggle={() => void run(() => call(`/admin/grammar/topics/${t.id}/status`, "PATCH", { status: t.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }))}
              onDelete={() => {
                if (confirmDelete(`topik "${t.title}" beserta semua materi dan soalnya`)) void run(() => call(`/admin/grammar/topics/${t.id}`, "DELETE"));
              }}
            />
          </li>
        ))}
      </ul>
      {editing && (
        <TopicForm
          key={editing === "baru" ? "baru" : editing.id}
          item={editing === "baru" ? null : editing}
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
