# Dokumentasi API Qouq.en

API dibuat dengan NestJS. Semua data dikirim dan diterima sebagai **JSON**.

- **Alamat dasar (produksi):** `https://qouq-en.vercel.app`
- **Alamat dasar (lokal):** `http://localhost:4000`
- **Format kesalahan:** `{ "statusCode": 400, "message": "teks kesalahan", "error": "Bad Request" }`. `message` bisa berupa daftar teks untuk kesalahan isian.
- **Batas ukuran isi permintaan:** 1 MB (karena foto profil dikirim sebagai teks).

## Cara login (otentikasi)

Endpoint bertanda 🔒 butuh token. Dapatkan token dari `POST /auth/login` atau `POST /auth/register`, lalu kirim di setiap permintaan:

```
Authorization: Bearer <accessToken>
```

Token berlaku **7 hari**. Endpoint bertanda 👑 hanya untuk akun dengan peran `admin`.

| Kode | Arti |
|---|---|
| 200 / 201 | Berhasil |
| 400 | Isian tidak valid |
| 401 | Token tidak ada, salah, atau kedaluwarsa; atau email/password salah |
| 403 | Bukan admin (untuk endpoint 👑) |
| 404 | Data tidak ditemukan |
| 409 | Data kembar (misalnya email sudah terdaftar) |

## Ringkasan endpoint

| Kelompok | Jumlah | Bagian |
|---|---|---|
| Umum dan kesehatan | 3 | [Kesehatan](#kesehatan) |
| Akun | 7 | [Akun](#akun-auth) |
| Kamus | 4 | [Kamus](#kamus-dictionary) |
| Kategori dan kalimat | 4 | [Kategori dan kalimat](#kategori-dan-kalimat) |
| Latihan berbicara | 8 | [Latihan berbicara](#latihan-berbicara-practice) |
| Grammar | 4 | [Grammar](#grammar) |
| Admin | 29 | [Admin](#admin-) |

---

## Kesehatan

| Metode | Alamat | Fungsi |
|---|---|---|
| GET | `/` | Teks sapaan (cek server hidup) |
| GET | `/health` | `{ "status": "ok", "time": "..." }` |
| GET | `/health/db` | Seperti `/health`, ditambah `"database": "ok"` atau `"error"` |

## Akun (`/auth`)

### POST `/auth/register`
Daftar akun baru (peran otomatis `LEARNER`).

| Isian | Aturan |
|---|---|
| `name` | teks, minimal 2 huruf |
| `email` | format email |
| `password` | minimal 8 karakter |

Respons 201:
```json
{ "accessToken": "eyJ...", "user": { "id": "...", "email": "a@b.com", "name": "Budi", "roles": ["LEARNER"] } }
```
Kesalahan: 409 `Email sudah terdaftar`.

### POST `/auth/login`
Isian: `email`, `password`. Respons 200 sama seperti register. Kesalahan: 401 `Email atau password salah`.

### POST `/auth/logout` 🔒
Respons 200: `{ "message": "..." }`. Token tidak dicabut di server; aplikasi menghapusnya dari perangkat.

### POST `/auth/forgot-password`
Isian: `email`. Respons 200 selalu `{ "message": "Jika email terdaftar, instruksi reset password sudah dibuat." }` (tidak membocorkan apakah email terdaftar). Token reset berlaku 1 jam. Pengiriman email belum tersedia; di mode pengembangan token dicatat di log server.

### POST `/auth/reset-password`
Isian: `token`, `newPassword` (minimal 8 karakter). Respons 200: `{ "message": "Password berhasil diubah. Silakan login." }`. Kesalahan: 400 jika token salah, sudah dipakai, atau kedaluwarsa.

### GET `/auth/me` 🔒
Data akun yang sedang login.
```json
{
  "id": "...", "email": "a@b.com", "name": "Budi", "createdAt": "2026-10-06T...",
  "roles": ["LEARNER"],
  "profile": { "level": "A1", "dailyGoalMinutes": 15, "avatarUrl": null, "coverUrl": "tpl:1", "theme": "SYSTEM" }
}
```

### PATCH `/auth/me` 🔒
Ubah profil. Semua isian opsional.

| Isian | Aturan |
|---|---|
| `name` | 2 sampai 60 huruf |
| `level` | `A1`, `A2`, `B1`, `B2`, atau `C1` |
| `dailyGoalMinutes` | `10`, `15`, `30`, atau `60` |
| `avatarUrl` | gambar JPG/PNG/WebP sebagai data URL (maks 200 KB); `""` untuk menghapus |
| `coverUrl` | `tpl:1` sampai `tpl:6` atau data URL gambar (maks 400 KB); `""` untuk menghapus |

Respons 200: sama seperti `GET /auth/me`.

---

## Kamus (`/dictionary`)

Hanya kata berstatus tampil (PUBLISHED) yang dikembalikan.

### GET `/dictionary/autocomplete`
Saran saat mengetik.

| Parameter | Keterangan |
|---|---|
| `q` | kata yang diketik |
| `limit` | 1 sampai 20, bawaan 8 |
| `pos` | opsional: `NOUN`, `VERB`, `ADJECTIVE`, `ADVERB`, `PRONOUN`, `PREPOSITION`, `CONJUNCTION`, `INTERJECTION`, `DETERMINER`, `OTHER` |
| `level` | opsional: `A1` sampai `C1` |

Respons 200: daftar `{ id, headword, score, level, pos: ["NOUN", ...] }`.

### GET `/dictionary/search`
Hasil lengkap dengan halaman. Parameter: `q`, `page` (bawaan 1), `limit` (1 sampai 50, bawaan 20), `pos`, `level`.
```json
{ "page": 1, "hasMore": true, "items": [ { "id": "...", "headword": "run", "score": 1, "level": "A1", "pos": ["VERB", "NOUN"] } ] }
```

### GET `/dictionary/phonetics?words=tell,me,about`
Ejaan banyak kata sekaligus (maksimal 60 kata, dipisah koma). Respons: daftar `{ headword, phoneticIpa, phoneticEasy }`. Kata yang tidak ada di kamus diambil dari daftar tambahan.

### GET `/dictionary/entries/:id`
Detail satu kata.
```json
{
  "id": "...", "headword": "run", "phoneticIpa": "rʌn", "phoneticEasy": "RAN", "level": "A1",
  "senses": [ { "id": "...", "partOfSpeech": "VERB", "meaningId": "berlari", "definitionEn": "move fast by using one's feet", "sortOrder": 0,
                "examples": [ { "id": "...", "textEn": "I run every morning.", "textId": "Saya berlari setiap pagi.", "sortOrder": 0 } ] } ],
  "relations": [ { "id": "...", "type": "SYNONYM", "relatedEntry": { "id": "...", "headword": "sprint" } } ]
}
```
Kesalahan: 404 `Kata tidak ditemukan`.

---

## Kategori dan kalimat

Hanya kalimat berstatus tampil yang dikembalikan.

### GET `/categories`
Daftar kategori: `[{ id, slug, name, description, sortOrder, targetCount, sentenceCount }]`.

### GET `/categories/:idOrSlug/sentences`
Kalimat dalam satu kategori. Parameter: `level`, `q` (cari di kalimat Inggris dan artinya), `page` (bawaan 1), `limit` (1 sampai 50, bawaan 20).
```json
{
  "category": { "id": "...", "slug": "wawancara", "name": "Wawancara" },
  "items": [ { "id": "...", "textEn": "Tell me about yourself.", "textId": "Ceritakan tentang dirimu.", "phoneticIpa": null, "phoneticEasy": null, "level": "A1", "notes": null, "tags": [] } ],
  "page": 1, "limit": 20, "total": 100, "totalPages": 5
}
```

### GET `/sentences/:id`
Satu kalimat beserta `category`. Kesalahan: 404.

### GET `/sentences/:id/neighbors`
Posisi dalam kategori: `{ "position": 3, "total": 100, "prevId": "...", "nextId": "..." }`.

---

## Latihan berbicara (`/practice`)

Alurnya: browser merekam suara dan mengubahnya jadi teks (`spokenText`), lalu API menilai teks itu terhadap kalimat target. **Rekaman suara tidak dikirim dan tidak disimpan.**

### POST `/practice/compare`
Menilai tanpa menyimpan (tidak perlu login).

| Isian | Aturan |
|---|---|
| `targetText` | kalimat target, maksimal 500 huruf |
| `spokenText` | teks yang terdengar, maksimal 500 huruf |
| `confidence` | opsional, 0 sampai 1 |

Respons 200:
```json
{
  "words": [ { "status": "correct", "target": "tell", "heard": "tell" }, { "status": "missing", "target": "me" } ],
  "totalTarget": 4, "correctCount": 3, "wrongCount": 0, "missingCount": 1, "extraCount": 0,
  "wordScore": 75, "orderScore": 100, "confidenceScore": null,
  "finalScore": 80, "label": "Good", "feedback": "Bagus. Coba perbaiki kata yang ditandai."
}
```
`status` kata: `correct`, `wrong`, `missing`, `extra`. `label` menurut skor akhir: `Excellent` (90 ke atas), `Good` (75 sampai 89), `Needs practice` (50 sampai 74), `Try again` (di bawah 50).

### POST `/practice/sessions` 🔒
Mulai sesi latihan. Isian opsional: `categoryId`, `mode` (`PRACTICE` atau `TEST`). Respons: data sesi dengan `id`.

### POST `/practice/sessions/:id/attempts` 🔒
Kirim satu percobaan ke sesi. Isian: `sentenceId`, `spokenText` (maksimal 500), `confidence` (opsional). Respons: seperti `/practice/compare` ditambah `attemptId` dan `sentenceId`. Kesalahan: 404 jika sesi atau kalimat tidak ditemukan, 400 jika sesi sudah selesai atau kalimat bukan dari kategori sesi itu.

### POST `/practice/sessions/:id/finish` 🔒
Menutup sesi, respons seperti `GET /practice/sessions/:id`.

### GET `/practice/sessions/:id` 🔒
Detail sesi beserta percobaannya.
```json
{
  "id": "...", "categoryId": "...", "mode": "PRACTICE",
  "startedAt": "...", "finishedAt": null, "durationSeconds": null,
  "summary": { "totalAttempts": 5, "averageScore": 84, "bestScore": 99, "lowestScore": 60 },
  "attempts": [ { "...": "..." } ]
}
```

### GET `/practice/stats?days=7` 🔒
Statistik untuk Beranda dan Statistik. `days` bernilai `7` atau `30` (selain itu dianggap 7).
```json
{
  "range": 7, "streak": 3, "goalMinutes": 15,
  "today": { "attempts": 4, "sentences": 4, "minutes": 5, "xp": 32 },
  "sentences": 20, "attempts": 28, "avgScore": 84, "avgDelta": 3, "xp": 210,
  "totalSentences": 1624, "bestScore": 99,
  "trend": [ { "date": "2026-10-24", "attempts": 5, "avg": 82, "minutes": 7 } ],
  "weakWords": [ { "word": "through", "count": 3 } ]
}
```
`streak` dan tanggal dihitung dengan zona waktu WIB (UTC+7). Menit adalah perkiraan dari jumlah percobaan. XP: tiap percobaan bicara = skor dibagi 10, tiap latihan grammar = skor dibagi 5. `weakWords` berisi sampai 8 kata yang paling sering salah atau terlewat.

### GET `/practice/progress` 🔒
Jumlah kalimat yang sudah dilatih per kategori: `{ "categories": [ { "categoryId": "...", "practiced": 12 } ] }`.

### GET `/practice/progress/:idOrSlug` 🔒
Daftar kalimat satu kategori beserta skor terbaikmu. Parameter: `status` (`all`, `todo`, `done`), `level`, `q`, `page`, `limit` (1 sampai 50). Respons seperti daftar kalimat di atas, dengan tiap item ditambah `bestScore` dan `attempts`, serta `summary: { done, total }`.

---

## Grammar

### GET `/grammar/topics`
Daftar topik yang tampil. Parameter opsional: `level`. Respons: `[{ id, slug, title, description, level, lessonCount, questionCount }]`.

### GET `/grammar/topics/:id`
`:id` boleh id atau slug. Respons: topik beserta `lessons` (`title`, `summary`, `examples`) dan `questions` (`id`, `type`, `prompt`, `level`, `options`). **Kunci jawaban tidak dikirim.**

### POST `/grammar/topics/:id/attempts` 🔒
Kirim jawaban untuk dinilai.
```json
{ "answers": [ { "questionId": "...", "optionId": "..." }, { "questionId": "...", "answerText": "goes" } ] }
```
`answers`: 1 sampai 100 item. Pilihan ganda memakai `optionId`, isian memakai `answerText` (maksimal 200 huruf). Respons 201:
```json
{
  "attemptId": "...", "topicId": "...", "score": 80, "correctCount": 4, "totalQuestions": 5,
  "label": "Good", "feedback": "...",
  "results": [ { "questionId": "...", "type": "FILL_BLANK", "prompt": "She ____ to school.", "correct": true, "yourAnswer": "goes", "correctAnswer": "goes", "explanation": "..." } ]
}
```
Penilaian isian tidak membedakan huruf besar kecil, mengabaikan spasi berlebih dan tanda baca di akhir (. ! ? , ; :).

### GET `/grammar/progress` 🔒
Skor terbaik per topik: `{ "topics": [ { "topicId": "...", "bestScore": 80, "attempts": 2 } ] }`.

---

## Admin 👑

Semua alamat di bawah `/admin` membutuhkan token akun berperan `admin`; peran dicek ke database setiap permintaan. Konten punya status `PUBLISHED` (tampil), `DRAFT` atau `IN_REVIEW` (disembunyikan dari pelajar). Daftar memakai halaman 20 data (`?page=1`), respons `{ page, total, pageSize, items }`.

| Metode | Alamat | Fungsi |
|---|---|---|
| GET | `/admin/overview` | Jumlah pengguna, kata, kalimat, topik, soal, dan yang disembunyikan |
| GET | `/admin/users?q=&page=` | Daftar pengguna |
| DELETE | `/admin/users/:id` | Hapus akun pelajar (akun admin dan akunmu sendiri ditolak) |
| GET | `/admin/dictionary?q=&status=&page=` | Daftar kata |
| POST | `/admin/dictionary` | Tambah kata |
| GET | `/admin/dictionary/:id` | Detail kata untuk diubah |
| PATCH | `/admin/dictionary/:id` | Ubah kata (daftar arti diganti seluruhnya) |
| PATCH | `/admin/dictionary/:id/status` | Sembunyikan atau tampilkan `{ "status": "DRAFT" }` |
| DELETE | `/admin/dictionary/:id` | Hapus kata |
| GET | `/admin/categories` | Kategori beserta jumlah kalimat |
| GET | `/admin/sentences?q=&categoryId=&status=&page=` | Daftar kalimat |
| POST | `/admin/sentences` | Tambah kalimat |
| PATCH | `/admin/sentences/:id` | Ubah kalimat |
| PATCH | `/admin/sentences/:id/status` | Sembunyikan atau tampilkan |
| DELETE | `/admin/sentences/:id` | Hapus kalimat beserta riwayat latihannya |
| GET | `/admin/grammar/topics` | Daftar topik |
| POST | `/admin/grammar/topics` | Tambah topik |
| PATCH | `/admin/grammar/topics/:id` | Ubah topik |
| PATCH | `/admin/grammar/topics/:id/status` | Sembunyikan atau tampilkan |
| DELETE | `/admin/grammar/topics/:id` | Hapus topik beserta materi dan soalnya |
| GET | `/admin/grammar/topics/:id/lessons` | Daftar materi satu topik |
| POST | `/admin/grammar/topics/:id/lessons` | Tambah materi |
| PATCH | `/admin/grammar/lessons/:id` | Ubah materi |
| DELETE | `/admin/grammar/lessons/:id` | Hapus materi |
| GET | `/admin/grammar/questions?topicId=&status=&page=` | Daftar soal |
| POST | `/admin/grammar/questions` | Tambah soal |
| PATCH | `/admin/grammar/questions/:id` | Ubah soal (pilihan jawaban diganti seluruhnya) |
| PATCH | `/admin/grammar/questions/:id/status` | Sembunyikan atau tampilkan |
| DELETE | `/admin/grammar/questions/:id` | Hapus soal |

### Isian utama

**Kata** (POST/PATCH `/admin/dictionary`): `headword` (wajib, maks 80), `phoneticIpa`, `phoneticEasy`, `level` (`A1` sampai `C1` atau kosong), `status`, dan `senses` (wajib, 1 sampai 12): tiap arti berisi `partOfSpeech`, `meaningId` (arti Indonesia, wajib), `definitionEn`, `examples` (`[{ textEn, textId }]`, maks 10).

**Kalimat** (POST/PATCH `/admin/sentences`): `categoryId`, `textEn`, `textId` (wajib, maks 400), `phoneticIpa`, `phoneticEasy`, `level`, `notes`, `status`. Kalimat Inggris yang sama dalam satu kategori ditolak (409).

**Topik grammar**: `title`, `slug` (huruf kecil, angka, `-`; harus unik), `description`, `level`, `status`, `sortOrder`.

**Materi grammar**: `title`, `summary` (wajib, maks 3000), `examples`, `sortOrder`.

**Soal grammar**: `topicId`, `type` (`MULTIPLE_CHOICE` atau `FILL_BLANK`), `prompt` (bagian kosong ditulis `____`), `explanation`, `level`, `status`, `sortOrder`. Pilihan ganda butuh `options` (2 sampai 8, `[{ text, isCorrect }]`, **tepat satu** `isCorrect: true`). Isian butuh `acceptedAnswers` (daftar jawaban yang diterima, minimal satu).
