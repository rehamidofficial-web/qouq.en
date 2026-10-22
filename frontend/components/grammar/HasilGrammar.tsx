import Link from "next/link";
import { labelId, splitPrompt, type GrammarResult } from "@/lib/grammar";

function Prompt({ text, fill }: { text: string; fill?: string }) {
  const parts = splitPrompt(text);
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <u className="font-bold text-acc decoration-2">{fill ?? "___"}</u>}
        </span>
      ))}
    </span>
  );
}

type Props = {
  result: GrammarResult;
  title: string;
  nextSlug: string | null;
  onRetry: () => void;
};

// Layar hasil: skor, lalu pembahasan setiap soal beserta penjelasannya.
export default function HasilGrammar({ result, title, nextSlug, onRetry }: Props) {
  const color = result.score >= 75 ? "var(--ok)" : result.score >= 50 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
      <section className="card flex flex-col items-center gap-3 text-center lg:!p-7" aria-label="Skor">
        <div
          className="grid h-[120px] w-[120px] place-items-center rounded-full"
          style={{ background: `conic-gradient(${color} ${result.score}%, var(--line) 0)` }}
          role="img"
          aria-label={`Skor ${result.score} dari 100`}
        >
          <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-bg font-serif text-[32px] font-bold" style={{ color }}>
            {result.score}
          </div>
        </div>
        <h1 className="text-[24px] font-bold leading-tight">{labelId(result.label)}</h1>
        <p className="text-muted">
          {result.correctCount} dari {result.totalQuestions} benar di {title}.
        </p>
        <p className="text-[13.5px] text-muted">{result.feedback}</p>
        <div className="mt-1 flex w-full flex-col gap-2">
          <button type="button" className="btn w-full" onClick={onRetry}>
            Ulangi topik ini
          </button>
          {nextSlug && (
            <Link href={`/grammar/${nextSlug}`} className="btn btn-outline w-full text-center">
              Topik berikutnya
            </Link>
          )}
          <Link href="/grammar" className="btn btn-outline w-full text-center">
            Kembali ke daftar
          </Link>
        </div>
      </section>

      <section className="card flex flex-col gap-2.5 lg:!p-6" aria-label="Pembahasan">
        <h2 className="text-[18px] font-bold">Pembahasan</h2>
        {result.results.map((r, i) => (
          <div key={r.questionId} className={`rounded-[14px] border px-3.5 py-3 ${r.correct ? "border-line bg-card" : "border-[var(--bad)] bg-card"}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${r.correct ? "bg-okbg text-ok" : "bg-badbg text-bad"}`}>{i + 1}</span>
              <div className="min-w-0 grow">
                <p className="text-[14.5px] font-semibold leading-snug">
                  <Prompt text={r.prompt} fill={r.correctAnswer} />
                </p>
                {r.correct ? (
                  r.explanation && (
                    <details className="mt-1.5 text-[13px] text-muted">
                      <summary className="cursor-pointer font-semibold text-pri">Lihat penjelasan</summary>
                      <p className="mt-1">{r.explanation}</p>
                    </details>
                  )
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
                      {r.yourAnswer ? (
                        <span className="rounded-full bg-badbg px-2.5 py-0.5 font-bold text-bad line-through">{r.yourAnswer}</span>
                      ) : (
                        <span className="rounded-full bg-warnbg px-2.5 py-0.5 font-bold text-warn">Belum dijawab</span>
                      )}
                      <span aria-hidden="true">→</span>
                      <span className="rounded-full bg-okbg px-2.5 py-0.5 font-bold text-ok">{r.correctAnswer}</span>
                    </p>
                    {r.explanation && <p className="text-[13.5px]">{r.explanation}</p>}
                  </div>
                )}
              </div>
              <span className={`shrink-0 text-[12px] font-bold ${r.correct ? "text-ok" : "text-bad"}`}>{r.correct ? "Benar" : "Perlu dibenahi"}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
