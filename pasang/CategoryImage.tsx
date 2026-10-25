"use client";

import { useState } from "react";

// Gambar kategori. Berkasnya: public/kategori/<slug>.jpg (slug = nama di alamat, mis. /latih/wawancara).
// Kalau gambarnya belum ada, tampil gradasi lembut dengan huruf pertama, jadi tampilan tetap rapi.
export default function CategoryImage({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={`grid place-items-center bg-[linear-gradient(135deg,#f9e3e7,#d2ece8)] font-serif text-3xl font-bold text-[var(--pri)] ${className}`}
      >
        {name.trim()[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/kategori/${slug}.jpg`} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
  );
}
