# Qouq.en

Web app **gratis** untuk belajar bahasa Inggris, dibuat untuk pelajar Indonesia.
Cari kata di kamus, dengar contoh ucapannya, latihan berbicara dengan penilaian per kata, dan kerjakan latihan grammar.

Alamat web (produksi): https://qouq-app.vercel.app

## Fitur

| Fitur | Isi singkat |
|---|---|
| Kamus | Cari kata dengan saran otomatis. Arti Indonesia, jenis kata, level (A1-C1), ejaan IPA dan ejaan mudah, contoh kalimat, sinonim dan antonim. |
| Latih (pelafalan) | 16 kategori kalimat. Dengarkan contoh, rekam suaramu, dapat skor 0-100 dan koreksi per kata (benar, salah, terlewat, tambahan). |
| Grammar | Topik dengan penjelasan singkat, lalu soal pilihan ganda dan isian beserta pembahasan. |
| Beranda dan Statistik | Target harian (10, 15, 30 menit atau 1 jam), XP, streak, tren skor, kata yang perlu dilatih, lencana. |
| Profil | Foto profil dan sampul, level, mode terang/gelap. |
| Panel admin | Khusus admin: kelola kamus, kalimat latihan, grammar, dan pengguna; sembunyikan atau hapus konten. |

Rekam suara memakai pengenalan suara bawaan browser, jadi berjalan di **Chrome dan Edge** (Android dan laptop). Aplikasi **tidak menyimpan rekaman suara**, hanya teks hasil dan skor.

## Teknologi

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Backend:** NestJS 11, Prisma 7, TypeScript
- **Database:** PostgreSQL (Neon)
- **Hosting:** Vercel (dua project: backend dan frontend)
- **Pengujian dan CI:** Jest, oxlint, ESLint, GitHub Actions

## Struktur folder

```
qouq.en/
├─ backend/    API (NestJS + Prisma). Skema di backend/prisma, skrip data di backend/scripts
├─ frontend/   Tampilan web (Next.js)
├─ docs/       Dokumentasi (API.md)
└─ .github/    CI (GitHub Actions)
```

## Cara instalasi (di komputer sendiri)

### 1. Yang harus ada dulu

| Alat | Versi | Cek dengan |
|---|---|---|
| Node.js | 20 atau lebih baru (disarankan LTS) | `node -v` |
| npm | ikut Node.js | `npm -v` |
| Git | terbaru | `git --version` |
| Database PostgreSQL | gratis di https://neon.tech (cukup buat satu project) | - |

### 2. Ambil kodenya

```bash
git clone https://github.com/rehamidofficial-web/qouq.en.git
cd qouq.en
```

### 3. Siapkan backend

```bash
cd backend
npm install
```

Buat berkas `backend/.env` (jangan pernah di-commit, sudah diabaikan Git). Isinya:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_SECRET="isi-dengan-teks-acak-minimal-32-karakter"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

| Variabel | Fungsi | Cara mengisi |
|---|---|---|
| `DATABASE_URL` | Alamat database | Salin "connection string" dari Neon |
| `JWT_SECRET` | Kunci rahasia untuk token login | Buat dengan `openssl rand -base64 48` |
| `FRONTEND_URL` | Alamat frontend yang boleh memanggil API (CORS) | Lokal: `http://localhost:3000` |
| `PORT` | Port backend | `4000` |

Lalu buat tabel dan data dasar:

```bash
npx prisma generate
npx prisma migrate deploy --config prisma7.config.ts
npx tsx scripts/seed-basic.ts
npx tsx scripts/seed-grammar.ts
```

- `migrate deploy` membuat semua tabel di database.
- `seed-basic.ts` membuat peran (LEARNER, admin) dan 16 kategori. **Wajib**, tanpa peran LEARNER pendaftaran akun gagal.
- `seed-grammar.ts` mengisi topik dan soal grammar awal.

Isi kamus dan kalimat latihan (opsional, perlu berkas data; lihat [backend/DATA_SOURCES.md](backend/DATA_SOURCES.md)):

```bash
npm run import:dictionary
npx tsx scripts/import-sentences.ts data/kalimat-batch1.csv --cek     # cek dulu
npx tsx scripts/import-sentences.ts data/kalimat-batch1.csv --terbit  # simpan dan tampilkan
```

Buat akun admin (ganti passwordnya, jangan dibagikan):

```bash
ADMIN_PASSWORD='password-kuat-minimal-10-karakter' npx tsx scripts/set-admin-password.ts
```

Jalankan backend:

```bash
npm run start:dev
```

Cek di browser: http://localhost:4000/health harus menampilkan `{"status":"ok",...}`.

### 4. Siapkan frontend

Buka terminal baru:

```bash
cd frontend
npm install
```

Buat berkas `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Jalankan:

```bash
npm run dev
```

Buka http://localhost:3000. Kalau port 3000 sedang dipakai aplikasi lain, pakai `npm run dev -- -p 3001` dan ubah `FRONTEND_URL` di backend menjadi `http://localhost:3001`.

### 5. Kalau gagal

| Pesan atau masalah | Artinya | Solusi |
|---|---|---|
| `JWT_SECRET` tidak ditemukan saat backend jalan | `.env` belum dibuat atau salah folder | Pastikan `backend/.env` ada dan berisi `JWT_SECRET` |
| `Can't reach database server` | `DATABASE_URL` salah | Salin ulang dari Neon, pastikan ada `?sslmode=require` |
| Daftar akun gagal: "Role LEARNER belum ada" | Data dasar belum dibuat | Jalankan `npx tsx scripts/seed-basic.ts` |
| `prisma migrate deploy` minta alamat database atau tidak menemukan konfigurasi | Perintah dijalankan tanpa berkas konfigurasi Prisma | Jalankan dari folder `backend` dengan `--config prisma7.config.ts` seperti di atas, dan pastikan `.env` terisi |
| Browser: "Tidak bisa terhubung ke server" | Backend mati atau alamat salah | Cek backend jalan di port 4000 dan `NEXT_PUBLIC_API_URL` benar |
| Error CORS di console browser | `FRONTEND_URL` tidak sama dengan alamat frontend | Samakan persis (termasuk port), lalu jalankan ulang backend |
| `npm run build` frontend gagal | Ada error kode | Baca pesan merahnya; jalankan `npm run lint` untuk detail |

## Perintah penting

| Folder | Perintah | Fungsi |
|---|---|---|
| backend | `npm run start:dev` | Jalankan API (otomatis muat ulang) |
| backend | `npm run build` | Build produksi |
| backend | `npm run lint` | Periksa kode |
| backend | `npm test` | Jalankan tes (penilaian ucapan dan grammar) |
| frontend | `npm run dev` | Jalankan web (pengembangan) |
| frontend | `npm run lint` | Periksa kode |
| frontend | `npm run build` | Build produksi |

## Deploy (Vercel)

Dua project di Vercel dari repo yang sama:

| Project | Root Directory | Variabel lingkungan |
|---|---|---|
| Backend | `backend` | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (alamat frontend) |
| Frontend | `frontend` | `NEXT_PUBLIC_API_URL` (alamat backend) |

Setiap push ke branch `main` otomatis memicu deploy. Ubah variabel lingkungan lalu **Redeploy** agar berlaku.

## Keamanan

- Jangan menulis password, `DATABASE_URL`, atau `JWT_SECRET` di kode atau di GitHub. Simpan di `.env` dan di pengaturan Vercel.
- Repo ini publik. Kalau rahasia pernah tertulis di sini, ganti rahasianya, jangan hanya menghapus tulisannya.
- Halaman dan API admin dicek di server berdasarkan peran `admin`.

## Dokumentasi lain

- [Dokumentasi API](docs/API.md)
- [Sumber data dan lisensi](backend/DATA_SOURCES.md)
- [Catatan backend](backend/README.md) dan [catatan frontend](frontend/README.md)
