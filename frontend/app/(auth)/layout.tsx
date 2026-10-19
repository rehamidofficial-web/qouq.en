import Link from "next/link";

// Halaman masuk dan daftar selalu bernuansa gelap di atas foto pohon dan bangku,
// jadi tidak ikut pilihan tema terang/gelap.
// HP/tablet: foto di atas, formulir naik dari bawah (bottom sheet).
// Desktop (lg): kartu di kiri, slogan besar di kanan.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden bg-[#0f2a22] text-[#f7f1e3] lg:bg-[#6f9b3f]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-20 h-[62dvh] bg-cover bg-[position:center_bottom] bg-no-repeat lg:inset-0 lg:h-auto lg:bg-[position:center_70%]"
        style={{ backgroundImage: "url(/images/tree.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[62dvh] bg-[linear-gradient(180deg,rgba(8,28,21,.9)_0%,rgba(8,28,21,.6)_30%,rgba(8,28,21,0)_52%,rgba(8,28,21,0)_80%,rgba(8,28,21,.7)_100%)] lg:inset-0 lg:h-auto lg:bg-[linear-gradient(180deg,rgba(8,28,21,.85)_0%,rgba(8,28,21,.45)_35%,rgba(8,28,21,0)_58%)]"
      />

      {/* HP: tombol kembali bulat, tanpa logo */}
      <Link
        href="/mulai"
        aria-label="Kembali"
        className="absolute left-3.5 top-4 z-10 grid h-[34px] w-[34px] place-items-center rounded-full border border-[rgba(230,201,127,.42)] bg-[rgba(15,42,34,.86)] lg:hidden"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#F7F1E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </Link>

      {/* Desktop: logo */}
      <header className="hidden px-11 pt-6 lg:block">
        <Link href="/" className="font-serif text-3xl font-bold">
          Qouq<span className="text-[#e6c97f]">.en</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col pt-[34dvh] lg:flex-row lg:items-start lg:gap-16 lg:px-11 lg:pb-6 lg:pt-10">
        {/* Desktop: slogan */}
        <div className="order-2 hidden lg:block lg:max-w-[640px] lg:pt-2">
          <h1 className="font-serif text-[52px] font-bold leading-[1.1] text-[#f7f1e3]">
            Istirahat boleh, <em className="text-[#e6c97f]">menyerah jangan.</em>
          </h1>
          <p className="mt-3 max-w-[480px] text-[17px] text-[#dde6d4]">
            Belajar bahasa Inggris, selangkah demi selangkah.
          </p>
        </div>

        <div className="mt-auto w-full rounded-t-[24px] border-t border-[rgba(230,201,127,.42)] bg-[rgba(15,42,34,.94)] px-4 pb-5 pt-[18px] backdrop-blur-xl lg:order-1 lg:mt-0 lg:w-[390px] lg:self-start lg:rounded-[24px] lg:border lg:bg-[rgba(15,42,34,.92)] lg:p-7">
          <div className="mx-auto w-full max-w-[420px] lg:max-w-none">{children}</div>
        </div>
      </main>
    </div>
  );
}
