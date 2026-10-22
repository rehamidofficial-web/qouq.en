"use client";

import { useState } from "react";
import { ERROR_TEXT, type RecError } from "@/lib/recognizer";

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

// Layar "Mikrofon belum aktif": pesan ramah + langkah mengatasinya + jalan keluar (mode dengar-saja).
export default function Kendala({ code, onRetry, onListenOnly }: { code: RecError; onRetry: () => void; onListenOnly: () => void }) {
  const info = ERROR_TEXT[code];
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" role="alert">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-soft text-muted" aria-hidden="true">
          <MicOffIcon />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.06em] text-muted">Mikrofon belum aktif</p>
          <p className="text-[16px] font-bold leading-snug">{info.title}</p>
        </div>
      </div>

      <div className="note note-bad text-[14px]">{info.why}</div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-muted">Cara mengatasinya</p>
        <ol className="flex flex-col gap-2">
          {info.steps.map((step, i) => (
            <li key={i} className="card flex items-start gap-3 !p-3 text-[13.5px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-soft text-[12px] font-bold text-pri">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        {info.retry && (
          <button type="button" className="btn" onClick={onRetry}>
            Coba lagi
          </button>
        )}
        {info.copyLink && (
          <button type="button" className="btn" onClick={copyLink}>
            {copied ? "Alamat tersalin" : "Salin alamat halaman"}
          </button>
        )}
        <button type="button" className="btn btn-outline" onClick={onListenOnly}>
          Latihan tanpa merekam
        </button>
      </div>

      <p className="note text-[13px]">
        <b>Tetap bisa belajar.</b> Dengarkan contoh pada pemutar, baca ejaan dan arti, sambil mengatasi masalah ini. Aplikasi ini tidak menyimpan rekaman suara.
      </p>
    </div>
  );
}
