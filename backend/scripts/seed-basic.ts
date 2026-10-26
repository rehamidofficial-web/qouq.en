import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Menyiapkan data dasar untuk instalasi baru: peran (LEARNER, admin) dan 16 kategori latihan.
// Aman dijalankan berulang: yang sudah ada tidak diubah.
//   npx tsx scripts/seed-basic.ts

const ROLES = [
  { name: 'LEARNER', description: 'Pelajar' },
  { name: 'admin', description: 'Pengelola' },
];

const CATEGORIES: [slug: string, name: string][] = [
  ['sehari-hari', 'Sehari-hari'],
  ['perkenalan-diri', 'Perkenalan Diri'],
  ['keluarga-pertemanan', 'Keluarga & Pertemanan'],
  ['sekolah-pendidikan', 'Sekolah & Pendidikan'],
  ['belanja-makanan', 'Belanja & Makanan'],
  ['kerja-formal', 'Kerja Formal'],
  ['wawancara', 'Wawancara'],
  ['perjalanan-wisata', 'Perjalanan & Wisata'],
  ['kesehatan-kebutuhan', 'Kesehatan & Kebutuhan'],
  ['teknologi-internet', 'Teknologi & Internet'],
  ['diskusi-debat', 'Diskusi & Debat'],
  ['presentasi', 'Presentasi'],
  ['bisnis-negosiasi', 'Bisnis & Negosiasi'],
  ['akademik', 'Akademik'],
  ['sopan-orang-tua', 'Sopan ke Orang Tua'],
  ['gaul-santai', 'Gaul & Santai'],
];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const r of ROLES) {
      await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r });
    }
    for (const [i, [slug, name]] of CATEGORIES.entries()) {
      await prisma.category.upsert({ where: { slug }, update: {}, create: { slug, name, sortOrder: i + 1 } });
    }
    console.log(`Selesai: ${ROLES.length} peran dan ${CATEGORIES.length} kategori siap.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
