#!/bin/bash
# Jalankan dari folder proyek (yang berisi folder frontend dan backend):  bash pasang.sh
set -e
H="$(cd "$(dirname "$0")" && pwd)/pasang"
F=frontend
[ -d "$F" ] || { echo "Jalankan dari folder proyek (yang ada folder frontend-nya)."; exit 1; }
cp "$H/beranda.tsx"        "$F/app/(app)/page.tsx"
cp "$H/statistik.tsx"      "$F/app/(app)/statistik/page.tsx"
cp "$H/profil.tsx"         "$F/app/(app)/profil/page.tsx"
cp "$H/kamus.tsx"          "$F/app/(app)/kamus/page.tsx"
cp "$H/latih-daftar.tsx"   "$F/app/(app)/latih/page.tsx"
cp "$H/latih-kategori.tsx" "$F/app/(app)/latih/[slug]/page.tsx"
cp "$H/masuk.tsx"          "$F/app/(auth)/masuk/page.tsx"
mkdir -p "$F/components/stats" "$F/public/kategori"
cp "$H"/CategoryImage.tsx "$H"/AppShell.tsx "$H"/ThemeToggle.tsx "$H"/Avatar.tsx "$H"/icons.tsx "$F/components/"
cp "$H/StreakChip.tsx" "$F/components/stats/"
cp "$H"/useSpeech.ts "$H"/auth.tsx "$H"/useStats.ts "$H"/covers.ts "$H"/images.ts "$H"/savedWords.ts "$F/lib/"
echo "Selesai. Memeriksa..."
grep -q "export default function BerandaPage" "$F/app/(app)/page.tsx" && echo "OK  Beranda"
grep -q "export default function StatistikPage" "$F/app/(app)/statistik/page.tsx" && echo "OK  Statistik"
grep -q "export default function ProfilPage" "$F/app/(app)/profil/page.tsx" && echo "OK  Profil"
echo "Sekarang jalankan: cd frontend && npm run dev"
