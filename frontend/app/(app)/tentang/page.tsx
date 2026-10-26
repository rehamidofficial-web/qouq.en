import Link from "next/link";

const SOURCES: { name: string; used: string; license: string; href: string }[] = [
  {
    name: "Princeton WordNet 3.0",
    used: "Kata, jenis kata, definisi, sinonim, antonim",
    license: "WordNet License. © 2006 Princeton University.",
    href: "https://wordnet.princeton.edu/license-and-commercial-use",
  },
  {
    name: "Wordnet Bahasa (Open Multilingual Wordnet)",
    used: "Arti bahasa Indonesia",
    license: "MIT",
    href: "https://github.com/omwn/omw-data",
  },
  {
    name: "CMU Pronouncing Dictionary",
    used: "Ejaan IPA dan ejaan mudah",
    license: "BSD 2-clause",
    href: "https://github.com/cmusphinx/cmudict",
  },
  {
    name: "CEFR-J Vocabulary Profile 1.5 (Tono Laboratory, Tokyo University of Foreign Studies)",
    used: "Level kata A1 sampai B2",
    license: "Gratis dengan sitasi",
    href: "http://www.cefr-j.org/download.html",
  },
  {
    name: "Octanove Vocabulary Profile C1/C2 1.0 (Octanove Labs)",
    used: "Level kata C1 dan C2",
    license: "CC BY-SA 4.0",
    href: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    name: "Tatoeba (lewat ManyThings)",
    used: "Contoh kalimat di kamus",
    license: "CC BY 2.0 France",
    href: "https://tatoeba.org",
  },
  {
    name: "Fraunces dan Plus Jakarta Sans (Google Fonts)",
    used: "Huruf pada tampilan",
    license: "SIL Open Font License 1.1",
    href: "https://fonts.google.com",
  },
];

export const metadata = { title: "Tentang | Qouq.en" };

export default function TentangPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold lg:text-3xl">Tentang Qouq.en</h1>
        <p className="mt-1 text-muted">Web gratis untuk belajar bahasa Inggris: kamus, latihan berbicara, dan grammar.</p>
      </div>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-bold">Suara dan privasi</h2>
        <p>
          Suara contoh dibacakan oleh suara bawaan browser atau HP kamu, jadi pilihan suaranya bisa berbeda di tiap perangkat. Saat kamu merekam, browser mengubah suaramu menjadi teks.
          Aplikasi ini <b>tidak menyimpan rekaman suara</b>; hanya teks hasil dan skor yang dikirim.
        </p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-xl font-bold">Sumber data dan lisensi</h2>
        <p className="text-muted">Terima kasih kepada proyek-proyek terbuka berikut. Tanpa mereka, kamus ini tidak mungkin ada.</p>
        <ul className="flex flex-col gap-3">
          {SOURCES.map((s) => (
            <li key={s.name} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-bold text-pri underline underline-offset-2">
                {s.name}
              </a>
              <p className="text-muted">
                {s.used} · {s.license}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[12.5px] text-muted">
          Contoh kalimat dari Tatoeba dibuat oleh para kontributornya; nama kontributor tersimpan bersama tiap kalimat. Kata-kata yang dipakai pada tingkat C1 dan C2
          berasal dari data berlisensi CC BY-SA 4.0. Sitasi CEFR-J: The CEFR-J Wordlist Version 1.5, Tono Laboratory, Tokyo University of Foreign Studies.
        </p>
      </section>

      <Link href="/" className="chip self-start">
        ← Kembali ke Beranda
      </Link>
    </div>
  );
}
