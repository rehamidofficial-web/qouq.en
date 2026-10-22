import Link from "next/link";
import { levelChip, splitExamples, splitSentences, type TopicDetail } from "@/lib/grammar";

// Ringkasan aturan + contoh satu topik. Dipakai di halaman pelajaran (HP) dan panel kanan (desktop).
export default function Pelajaran({ topic, compact = false }: { topic: TopicDetail; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className={`chip ${levelChip(topic.level)} !h-6 !px-2.5 !text-[11px]`}>{topic.level}</span>
        <span className="text-[13px] text-muted">Baca dulu, lalu jawab soal</span>
      </div>
      <div>
        <h2 className={`font-bold leading-tight ${compact ? "text-[28px]" : "text-[26px] lg:text-3xl"}`}>{topic.title}</h2>
        {topic.description && <p className="mt-1 text-[14.5px] text-muted">{topic.description}</p>}
      </div>

      {topic.lessons.map((l) => {
        const rules = splitSentences(l.summary);
        const examples = splitExamples(l.examples);
        return (
          <div key={l.id} className="flex flex-col gap-3">
            <div className="card">
              <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">{l.title}</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px] leading-relaxed">
                {rules.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-acc" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            {examples.length > 0 && (
              <div className="card">
                <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Contoh</p>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {examples.map((ex, i) => (
                    <li key={i} className={`font-serif text-[16px] font-bold leading-snug ${i > 0 ? "border-t border-line pt-2.5" : ""}`}>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {topic.questions.length > 0 ? (
        <Link href={`/grammar/${topic.slug}/latihan`} className="btn self-start">
          Mulai latihan · {topic.questions.length} soal
        </Link>
      ) : (
        <p className="note text-[14px]">Soal untuk topik ini belum tersedia.</p>
      )}
    </div>
  );
}
