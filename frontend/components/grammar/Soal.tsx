"use client";

import { splitPrompt, type Answer, type Question } from "@/lib/grammar";

const KEYS = ["A", "B", "C", "D", "E", "F"];

// Kalimat soal dengan bagian kosong yang digambar sebagai garis bawah (diisi jawaban yang dipilih).
export function Kalimat({ prompt, filled }: { prompt: string; filled?: string }) {
  const parts = splitPrompt(prompt);
  return (
    <h1 className="font-serif text-[26px] font-bold leading-[1.3] lg:text-[30px]">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="inline-block min-w-[64px] border-b-[3px] border-acc px-1 text-center text-acc">{filled || " "}</span>
          )}
        </span>
      ))}
    </h1>
  );
}

type Props = {
  q: Question;
  answer: Answer | undefined;
  onChange: (a: Answer) => void;
  onEnter: () => void;
};

// Satu soal: pilihan ganda (tombol A, B, C, D) atau isian (kotak teks).
export default function Soal({ q, answer, onChange, onEnter }: Props) {
  const chosen = q.options.find((o) => o.id === answer?.optionId)?.text;

  if (q.type === "MULTIPLE_CHOICE") {
    return (
      <div className="flex flex-col gap-4">
        <Kalimat prompt={q.prompt} filled={chosen} />
        <p className="text-muted">Pilih jawaban yang paling tepat untuk melengkapi kalimat.</p>
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Pilihan jawaban">
          {q.options.map((o, i) => {
            const on = answer?.optionId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ optionId: o.id })}
                className={`flex items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left font-semibold transition-colors ${
                  on ? "border-[var(--pri)] bg-soft" : "border-line bg-card"
                }`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] ${on ? "bg-pri text-onpri" : "bg-soft"}`}>{KEYS[i] ?? i + 1}</span>
                {o.text}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Kalimat prompt={q.prompt} />
      <p className="text-muted">Tulis bentuk kata kerja yang benar untuk kata di dalam kurung.</p>
      <div>
        <label htmlFor="jawaban" className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">
          Jawabanmu
        </label>
        <input
          id="jawaban"
          type="text"
          value={answer?.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          maxLength={200}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="field mt-1.5 !h-14 !text-[18px] font-semibold"
        />
      </div>
    </div>
  );
}
