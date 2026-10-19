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
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {/* HP: hanya placeholder (label tetap ada untuk pembaca layar). Desktop: label terlihat. */}
      <label htmlFor={id} className="sr-only text-[13px] font-semibold text-[#DDE6D4] lg:not-sr-only">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-full min-w-0 rounded-[10px] border-[1.5px] border-[rgba(230,201,127,.42)] bg-[rgba(247,241,227,.08)] px-3 text-[13px] text-[#F7F1E3] placeholder:text-[#B7C4B4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C97F] lg:h-11 lg:text-[15px]"
      />
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
