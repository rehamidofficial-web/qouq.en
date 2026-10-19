"use client";

import Link from "next/link";
import { useState } from "react";

// Layar A (Selamat datang) dan B (Mulai) dari desain mobile.
// Selalu gelap di atas foto pohon dan bangku, tidak ikut pilihan tema.
const STEPS = [
  {
    title: (
      <>
        Istirahat boleh, <em className="font-semibold italic text-[#e6c97f]">menyerah jangan.</em>
      </>
    ),
    text: "Belajar bahasa Inggris, selangkah demi selangkah.",
  },
  {
    title: <>Setiap hari, satu kata baru.</>,
    text: "Kamus lengkap dan latihan harian, siap kapan saja.",
  },
];

export default function MulaiPage() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#6f9b3f] text-[#f7f1e3]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/tree.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,28,21,.9)_0%,rgba(8,28,21,.6)_30%,rgba(8,28,21,0)_52%,rgba(8,28,21,0)_80%,rgba(8,28,21,.7)_100%)]"
      />

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-[18px] pb-[26px] pt-6">
        <div className="font-serif text-2xl font-bold">
          Qouq<span className="text-[#e6c97f]">.en</span>
        </div>

        <div className="mt-8 flex flex-col gap-2.5" aria-live="polite">
          <h1 className="font-serif text-[26px] font-bold leading-[1.12] text-[#f7f1e3]">{s.title}</h1>
          <p className="text-[12.5px] leading-normal text-[#dde6d4]">{s.text}</p>
          <div className="mt-1 flex gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <i
                key={i}
                className={
                  i < 5
                    ? "h-2.5 w-2.5 rounded-full bg-[#e6c97f]"
                    : "h-2.5 w-2.5 rounded-full border-[1.5px] border-[#e6c97f]"
                }
              />
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-10">
          {last ? (
            <>
              <Link href="/daftar" className="btn h-11 w-full text-sm">
                Daftar
              </Link>
              <p className="text-center text-[12.5px] text-[#dde6d4]">
                Sudah punya akun?{" "}
                <Link href="/masuk" className="font-semibold text-[#e6c97f]">
                  Masuk
                </Link>
              </p>
            </>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)} className="btn h-11 w-full text-sm">
              Mulai belajar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
