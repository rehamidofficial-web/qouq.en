# Backend Qouq.en

API untuk kamus, latihan pelafalan, grammar, akun, dan panel admin. Dibuat dengan NestJS 11, Prisma 7, dan PostgreSQL.

Cara instalasi lengkap ada di [README utama](../README.md). Daftar endpoint ada di [docs/API.md](../docs/API.md). Sumber data dan lisensi ada di [DATA_SOURCES.md](DATA_SOURCES.md).

## Perintah

```bash
npm install            # pasang paket
npx prisma generate    # buat klien database
npx prisma migrate deploy --config prisma7.config.ts   # buat/ubah tabel
npm run start:dev      # jalankan (muat ulang otomatis)
npm run lint           # periksa kode
npm test               # tes
npm run build          # build produksi
```

## Variabel lingkungan (`backend/.env`)

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Alamat database PostgreSQL |
| `JWT_SECRET` | Kunci rahasia token login (wajib, minimal 32 karakter acak) |
| `FRONTEND_URL` | Satu alamat frontend yang diizinkan (CORS) |
| `PORT` | Port server, bawaan 4000 |

## Skrip data (folder `scripts/`)

| Skrip | Fungsi |
|---|---|
| `seed-basic.ts` | Peran (LEARNER, admin) dan 16 kategori. Wajib untuk instalasi baru |
| `seed-grammar.ts` | Topik dan soal grammar awal |
| `import-dictionary.ts` | Impor kamus dari WordNet, Wordnet Bahasa, CMUdict, CEFR-J, Octanove, Tatoeba (`npm run import:dictionary`) |
| `build-extra-phonetics.ts` | Membuat daftar ejaan untuk kata yang tidak ada di kamus (what, is, it, ...) |
| `import-sentences.ts` | Impor kalimat latihan dari CSV. Opsi `--cek` untuk uji, `--terbit` untuk langsung ditampilkan |
| `set-admin-password.ts` | Membuat atau mengganti password akun admin (`ADMIN_PASSWORD='...'`) |

Jalankan skrip dengan `npx tsx scripts/<nama>.ts` dari folder `backend`. Berkas data besar ada di `backend/data/` dan sengaja tidak masuk Git.

## Struktur kode (`src/`)

| Folder | Isi |
|---|---|
| `auth` | Daftar, masuk, token JWT, profil, lupa/reset password |
| `dictionary` | Pencarian kata, saran otomatis, detail kata, ejaan |
| `categories` | Kategori dan kalimat latihan |
| `practice` | Sesi latihan, penilaian ucapan (`scoring.ts`), statistik, kemajuan |
| `grammar` | Topik, soal, penilaian jawaban (`grading.ts`) |
| `admin` | Endpoint pengelolaan konten, hanya untuk peran `admin` |
| `health` | Cek server dan database |
| `prisma` | Koneksi database |
