# Frontend Qouq.en

Tampilan web Qouq.en. Dibuat dengan Next.js 16 (App Router), React 19, Tailwind CSS 4, dan TypeScript.

Cara instalasi lengkap ada di [README utama](../README.md).

## Perintah

```bash
npm install     # pasang paket
npm run dev     # jalankan di http://localhost:3000
npm run lint    # periksa kode
npm run build   # build produksi
```

## Variabel lingkungan (`frontend/.env.local`)

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_API_URL` | Alamat backend, misalnya `http://localhost:4000`. Awalan `NEXT_PUBLIC_` wajib agar terbaca di browser |

## Halaman

| Alamat | Halaman |
|---|---|
| `/` | Beranda (target harian, streak, lanjutkan belajar) |
| `/kamus` | Kamus |
| `/latih`, `/latih/[kategori]`, `/latih/[kategori]/[id]` | Kategori, daftar kalimat, latihan berbicara |
| `/grammar`, `/grammar/[topik]`, `/grammar/[topik]/latihan` | Grammar |
| `/statistik` | Statistik dan lencana |
| `/profil` | Profil dan pengaturan |
| `/admin` | Panel admin (hanya peran admin) |
| `/masuk`, `/daftar`, `/lupa-sandi`, `/mulai` | Akun dan layar sambutan |

## Struktur kode

| Folder | Isi |
|---|---|
| `app/(app)` | Halaman utama dengan menu (Beranda, Kamus, Latih, dst.) |
| `app/(auth)` | Halaman masuk dan daftar |
| `components` | Komponen: menu, audio, ejaan, rekam suara, grammar, admin |
| `lib` | Pembantu: panggilan API (`api.ts`), login (`auth.tsx`), suara, statistik |
| `public` | Gambar kategori (`public/kategori/<slug>.jpg`), ikon, `manifest.json` |

## Catatan teknis

- Ada aturan ESLint `react-hooks/set-state-in-effect`: jangan mengubah state secara langsung di dalam `useEffect`. Ambil data di dalam fungsi async lalu ubah state setelahnya.
- Berkas `page.tsx` hanya boleh mengekspor komponen halaman. Fungsi bersama taruh di `lib/` atau `components/`.
- Suara contoh memakai suara bawaan browser (Web Speech API). Jumlah suara berbeda tiap perangkat, jadi pilihan suara pria bisa tidak tersedia di HP.
- Rekam suara memakai pengenalan suara bawaan browser: jalan di Chrome dan Edge lewat HTTPS.
