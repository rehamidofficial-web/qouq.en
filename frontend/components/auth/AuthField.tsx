"use client";

import { useState } from "react";

export default function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  // Kotak kata sandi punya tombol mata untuk melihat atau menyembunyikan isinya.
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {/* HP: hanya placeholder (label tetap ada untuk pembaca layar). Desktop: label terlihat. */}
      <label htmlFor={id} className="sr-only text-[13px] font-semibold text-[#DDE6D4] lg:not-sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && shown ? "text" : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 w-full min-w-0 rounded-[10px] border-[1.5px] border-[rgba(230,201,127,.42)] bg-[rgba(247,241,227,.08)] px-3 text-[16px] text-[#F7F1E3] placeholder:text-[#B7C4B4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C97F] lg:h-11 lg:text-[15px] ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={shown}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-[10px] text-[#CFD8C8] hover:text-[#F7F1E3] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E6C97F]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {shown ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.6 12.6 0 0 1-2.6 3.4M6.4 7.6A12.4 12.4 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9.7 9.7 0 0 0 4-.9" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </>
              ) : (
                <>
                  <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-[#4A2A24] px-3 py-2.5 text-[13px] text-[#FF9A85]">
      {message}
    </p>
  );
}

// Garis "atau" dan tiga tombol bulat (hanya di HP, sesuai desain).
// Login sosial belum didukung backend, jadi tombolnya dinonaktifkan dulu.
export function SocialRow() {
  const ring =
    "grid h-[38px] w-[38px] place-items-center rounded-full border-[1.5px] border-[rgba(230,201,127,.42)] text-[15px] font-bold opacity-60";
  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2.5 text-[11px] text-[#CFD8C8]">
        <i className="h-px flex-1 bg-[rgba(230,201,127,.4)]" />
        atau
        <i className="h-px flex-1 bg-[rgba(230,201,127,.4)]" />
      </div>
      <div className="mt-[9px] flex justify-center gap-3">
        <button type="button" disabled title="Segera hadir" aria-label="Google (segera hadir)" className={`${ring} font-serif`}>
          G
        </button>
        <button type="button" disabled title="Segera hadir" aria-label="Facebook (segera hadir)" className={`${ring} font-serif`}>
          f
        </button>
        <button type="button" disabled title="Segera hadir" aria-label="Pesan (segera hadir)" className={ring}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16.5h-7L8 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
