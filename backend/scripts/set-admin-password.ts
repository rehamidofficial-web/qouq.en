import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Mengatur password asli untuk akun admin, supaya login rahasia di kode bisa dihapus.
// Cara pakai (dari folder backend, password JANGAN ditulis di berkas, cukup di terminal):
//   ADMIN_PASSWORD='password-baru-yang-kuat' npx tsx scripts/set-admin-password.ts
// Aman dijalankan berulang.

const EMAIL = 'qouqen@gmail.com';
const OLD_ID = 'admin-hamid-id'; // id yang dulu dipakai login rahasia

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (password.length < 10) {
    throw new Error('Isi ADMIN_PASSWORD minimal 10 karakter (lihat cara pakai di atas).');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // Cari akun lama: berdasarkan email, atau id yang dulu dipakai.
    const found =
      (await prisma.user.findUnique({ where: { email: EMAIL } })) ??
      (await prisma.user.findUnique({ where: { id: OLD_ID } }));

    const user = found
      ? await prisma.user.update({
          where: { id: found.id },
          data: { email: EMAIL, passwordHash },
        })
      : await prisma.user.create({
          data: { id: OLD_ID, email: EMAIL, name: 'Hamid Admin', passwordHash, profile: { create: {} } },
        });

    const role = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Pengelola' },
    });
    const hasRole = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
    if (!hasRole) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const ok = await bcrypt.compare(password, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash);
    console.log(`Selesai. Akun ${EMAIL} (${user.id}) ${found ? 'diperbarui' : 'dibuat'}. Cek password: ${ok ? 'cocok' : 'GAGAL'}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
