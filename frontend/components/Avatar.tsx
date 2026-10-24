// Foto profil bulat. Kalau belum ada foto, tampil huruf pertama nama.
export default function Avatar({ name, src, className = "size-10" }: { name?: string; src?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} shrink-0 rounded-full border-2 border-[var(--card)] object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f1dd9c,#dc8a45)] font-bold text-[#0f2a22]`}
    >
      {(name?.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
