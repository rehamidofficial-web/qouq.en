# Sumber Data dan Lisensi

Dokumen ini mencatat dari mana setiap data dan bahan di Qouq.en berasal, apa lisensinya, dan apa yang wajib dilakukan. Halaman yang sama versi ringkas untuk pengguna ada di `/tentang` di aplikasi.

Terakhir diperbarui: 26 Oktober 2026.

## Ringkasan cepat

| Bagian | Sumber | Lisensi | Kewajiban |
|---|---|---|---|
| Kata, definisi, sinonim, antonim | Princeton WordNet 3.0 | WordNet License | Cantumkan atribusi dan teks lisensi |
| Arti Indonesia | Wordnet Bahasa (Open Multilingual Wordnet) | MIT | Cantumkan atribusi |
| Ejaan IPA dan ejaan mudah | CMU Pronouncing Dictionary | BSD 2-clause | Cantumkan atribusi |
| Level A1-B2 | CEFR-J Vocabulary Profile 1.5 | Gratis dengan sitasi | Cantumkan sitasi |
| Level C1-C2 | Octanove Vocabulary Profile C1/C2 1.0 | CC BY-SA 4.0 | Atribusi; bagikan ulang dengan lisensi sama |
| Contoh kalimat kamus | Tatoeba (lewat ManyThings) | CC BY 2.0 France | Atribusi per kalimat (sudah di database) |
| Kalimat latihan (16 kategori) | Draf AI yang ditinjau pemilik proyek | Milik proyek ini | Tidak ada |
| Soal dan materi grammar | Ditulis untuk proyek ini dengan bantuan AI | Milik proyek ini | Tidak ada |
| **Audio contoh ucapan** | **Tidak ada berkas audio.** Suara bawaan browser (Web Speech API) | Bagian dari browser/perangkat pengguna | Tidak ada |
| Pengenalan suara (rekam) | Pengenalan suara bawaan browser | Bagian dari browser | Tidak ada |
| Penilaian ucapan dan grammar | Dibuat sendiri (`scoring.ts`, `grading.ts`) | Milik proyek ini | Tidak ada |
| Gambar kategori | Foto stok pilihan pemilik proyek | Lihat bagian Gambar | Lihat bagian Gambar |
| Font | Fraunces dan Plus Jakarta Sans (Google Fonts) | SIL Open Font License 1.1 | Tidak ada atribusi wajib di aplikasi |
| Ikon dan logo | Dibuat pemilik proyek | Milik pemilik proyek | Tidak ada |

## Kamus (DictionaryEntry, DictionarySense, DictionaryExample, WordRelation)

| Data | Sumber | Lisensi dan tautan |
|---|---|---|
| Kata, jenis kata, definisi Inggris, sinonim, antonim | Princeton WordNet 3.0 | WordNet License. https://wordnet.princeton.edu/license-and-commercial-use |
| Arti bahasa Indonesia | Wordnet Bahasa (Open Multilingual Wordnet) | MIT. https://github.com/omwn/omw-data |
| Ejaan IPA dan ejaan mudah | CMU Pronouncing Dictionary, diubah otomatis | BSD 2-clause. https://github.com/cmusphinx/cmudict |
| Level A1-B2 | CEFR-J Vocabulary Profile 1.5 (Tono Laboratory, TUFS) | Gratis riset dan komersial dengan sitasi. http://www.cefr-j.org/download.html |
| Level C1-C2 (C2 dicatat sebagai C1) | Octanove Vocabulary Profile C1/C2 1.0 (Octanove Labs) | CC BY-SA 4.0 |
| Contoh kalimat dan arti Indonesia | Tatoeba melalui ManyThings (https://www.manythings.org/anki/) | CC BY 2.0 France. Atribusi per kalimat ada di kolom `source` tabel DictionaryExample. |

Catatan lisensi per sumber juga disimpan di kolom `source` dan `license` tabel DictionaryEntry saat impor.

Sitasi CEFR-J: The CEFR-J Wordlist Version 1.5. Tono Laboratory, Tokyo University of Foreign Studies.
Sitasi WordNet: Princeton University "About WordNet." WordNet. Princeton University. 2010.

### Berkas data untuk impor ulang

Berkas ini besar dan tidak masuk Git (folder `backend/data/` diabaikan). Unduh sendiri dari sumber di atas, lalu taruh di `backend/data/`:

| Berkas di `backend/data/` | Asal |
|---|---|
| `dict/data.noun`, `data.verb`, `data.adj`, `data.adv` | Basis data WordNet 3.0 |
| `wn-data-ind.tab` | Wordnet Bahasa (Open Multilingual Wordnet), bahasa Indonesia |
| `cmudict.dict` | CMU Pronouncing Dictionary |
| `cefrj-vocabulary-profile-1.5.csv` | CEFR-J |
| `octanove-vocabulary-profile-c1c2-1.0.csv` | Octanove |
| `ind.txt` (atau `ind-eng/ind.txt`) | Tatoeba dari ManyThings (pasangan Inggris-Indonesia) |

Lalu jalankan `npm run import:dictionary` dari folder `backend`.

### Cara pemilihan data
- Hanya makna yang tercatat di data frekuensi WordNet dan punya arti Indonesia di Wordnet Bahasa.
- Maksimal 6 makna per kata, 5 kata arti Indonesia per makna, 6 sinonim per kata, 2 contoh kalimat per kata (maksimal 12 kata per contoh).
- Ejaan IPA berasal dari aksen Amerika. Ejaan mudah dihasilkan otomatis dan hanya perkiraan.
- Contoh kalimat ditempelkan ke makna paling umum dari kata tersebut.
- Kata fungsi yang tidak ada di kamus (what, is, it, ...) mendapat ejaan dari `src/dictionary/extra-phonetics.ts`, dibuat oleh `scripts/build-extra-phonetics.ts` dari CMUdict.

### Kualitas
Data kamus dibuat otomatis dan belum seluruhnya ditinjau manusia. Arti dan contoh kalimat bisa kurang pas; admin dapat memperbaiki atau menyembunyikannya lewat Panel admin.

### Belum tersedia
- Bentuk kata (V1-V2-V3, bentuk jamak)
- Contoh kalimat untuk semua kata

## Kalimat latihan (Sentence, Category)

- 16 kategori dan sekitar 1.600 kalimat. Kalimat dibuat sebagai **draf dengan bantuan AI**, lalu ditinjau sebelum ditampilkan (kolom `source` bernilai `draf-ai-ditinjau`).
- Kalimat baru dari admin tercatat dengan `source` = `admin`.
- Impor dari CSV: `scripts/import-sentences.ts` (kolom wajib: `category`, `level`, `textEn`, `textId`). Tanpa opsi `--terbit`, kalimat masuk sebagai draf (tidak tampil).
- Ejaan kalimat ditampilkan dari ejaan per kata di kamus, kecuali kalimat punya ejaan sendiri.

## Grammar (GrammarTopic, GrammarLesson, GrammarQuestion)

Topik, materi singkat, dan soal ditulis untuk proyek ini (`scripts/seed-grammar.ts`) dengan bantuan AI, ditujukan pelajar level A1 dan A2. Bukan salinan dari buku atau situs lain.

## Audio dan suara

| Fungsi | Cara kerja | Catatan |
|---|---|---|
| Suara contoh ucapan | Browser membacakan teks dengan **suara bawaan perangkat** (Web Speech API, `speechSynthesis`). Aplikasi tidak menyimpan atau mengirim berkas audio. | Daftar suara berbeda tiap perangkat. Di Chrome HP biasanya hanya satu suara wanita, jadi pilihan pria tidak selalu tersedia. Tidak ada biaya dan tidak ada lisensi audio yang perlu dicantumkan. |
| Rekam suara | Browser mengubah suara menjadi teks (`SpeechRecognition`). Hanya **teks hasil dan skor** yang dikirim ke server. | **Rekaman suara tidak disimpan dan tidak dikirim.** Di Chrome, pengenalan suara dapat memakai layanan Google di belakang layar; itu diatur oleh browser, bukan aplikasi ini. Jalan di Chrome dan Edge lewat HTTPS. |
| Penilaian | Dihitung di server dari teks hasil: kecocokan kata, urutan kata, dan tingkat keyakinan browser (`backend/src/practice/scoring.ts`). | Bukan penilaian akustik; hanya membandingkan teks. |

Rencana pengembangan (belum dikerjakan): suara pria/wanita yang konsisten di semua perangkat. Pilihannya antara lain suara AI open-source di browser (misalnya Piper atau Kokoro) atau rekaman audio per kalimat. Kalau salah satunya dipakai, **lisensi model atau rekaman itu wajib dicatat di sini**.

## Gambar

| Berkas | Sumber | Lisensi |
|---|---|---|
| `frontend/public/kategori/<slug>.jpg` (16 foto kategori) | Foto stok yang dipilih pemilik proyek (pencarian di Pexels, lalu diperkecil dan dikompres) | Lisensi situs asalnya. Lisensi Pexels memperbolehkan pemakaian gratis, termasuk komersial, tanpa atribusi wajib, tetapi atribusi fotografer dianjurkan |
| Ikon aplikasi, logo, `manifest.json` | Dibuat pemilik proyek | Milik pemilik proyek |

**Yang perlu dilengkapi pemilik proyek:** daftar nama fotografer dan tautan asli tiap foto kategori. Catat di tabel berikut supaya ada bukti sumbernya.

| Kategori (slug) | Fotografer / tautan sumber |
|---|---|
| sehari-hari | (isi) |
| perkenalan-diri | (isi) |
| keluarga-pertemanan | (isi) |
| sekolah-pendidikan | (isi) |
| belanja-makanan | (isi) |
| kerja-formal | (isi) |
| wawancara | (isi) |
| perjalanan-wisata | (isi) |
| kesehatan-kebutuhan | (isi) |
| teknologi-internet | (isi) |
| diskusi-debat | (isi) |
| presentasi | (isi) |
| bisnis-negosiasi | (isi) |
| akademik | (isi) |
| sopan-orang-tua | (isi) |
| gaul-santai | (isi) |

## Font

Fraunces (judul) dan Plus Jakarta Sans (teks), dimuat lewat `next/font/google`. Keduanya berlisensi SIL Open Font License 1.1, boleh dipakai gratis termasuk komersial.

## Kewajiban saat aplikasi tampil ke pengguna

- Atribusi WordNet, Wordnet Bahasa, CMUdict, CEFR-J, Octanove, dan Tatoeba dicantumkan di halaman **Tentang** (`/tentang`) di aplikasi.
- Teks lisensi WordNet (hak cipta Princeton University, termasuk penafian) harus ikut dicantumkan. Salin teks lengkapnya dari https://wordnet.princeton.edu/license-and-commercial-use, jangan diringkas.
- Data level C1/C2 (Octanove) bila dibagikan ulang harus berlisensi CC BY-SA 4.0.
- Kalau repo atau database kamus dibagikan ulang, sertakan berkas ini.
