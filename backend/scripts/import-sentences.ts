import 'dotenv/config';
import * as fs from 'fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Cara pakai:
//   npx ts-node scripts/import-sentences.ts data/kalimat-batch1.csv --cek
//   npx ts-node scripts/import-sentences.ts data/kalimat-batch1.csv
//   npx ts-node scripts/import-sentences.ts data/kalimat-batch1.csv --terbit

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  const file = process.argv[2];
  const cek = process.argv.includes('--cek');
  const terbit = process.argv.includes('--terbit');
  if (!file || !fs.existsSync(file)) {
    console.error('File CSV tidak ditemukan. Contoh: data/kalimat-batch1.csv');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const cats = await prisma.category.findMany();
  const catMap = new Map<string, string>();
  for (const c of cats) {
    catMap.set(c.slug, c.id);
    catMap.set(slugify(c.name), c.id);
  }

  const rows = parseCsv(fs.readFileSync(file, 'utf-8').replace(/^﻿/, ''));
  const header = rows.shift()!.map((h) => h.trim());
  const idx = (n: string) => header.indexOf(n);
  for (const n of ['category', 'level', 'textEn', 'textId']) {
    if (idx(n) < 0) { console.error(`Kolom "${n}" tidak ada di baris pertama CSV.`); process.exit(1); }
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  const data: any[] = [];
  rows.forEach((r, k) => {
    const line = k + 2;
    const cat = (r[idx('category')] ?? '').trim();
    const level = (r[idx('level')] ?? '').trim().toUpperCase();
    const textEn = (r[idx('textEn')] ?? '').trim();
    const textId = (r[idx('textId')] ?? '').trim();
    const notes = idx('notes') >= 0 ? (r[idx('notes')] ?? '').trim() : '';
    const categoryId = catMap.get(cat) ?? catMap.get(slugify(cat));
    if (!categoryId) { errors.push(`Baris ${line}: kategori "${cat}" tidak ada di database`); return; }
    if (!LEVELS.includes(level)) { errors.push(`Baris ${line}: level "${level}" salah (harus A1-C1)`); return; }
    if (!textEn || !textId) { errors.push(`Baris ${line}: textEn/textId kosong`); return; }
    if (textEn.length > 250) { errors.push(`Baris ${line}: kalimat terlalu panjang`); return; }
    const key = categoryId + '|' + textEn.toLowerCase();
    if (seen.has(key)) { errors.push(`Baris ${line}: kalimat dobel di file ("${textEn}")`); return; }
    seen.add(key);
    data.push({
      categoryId, textEn, textId, level,
      notes: notes || null,
      status: terbit ? 'PUBLISHED' : 'DRAFT',
      source: 'draf-ai-ditinjau',
    });
  });

  console.log(`Baris valid: ${data.length}, bermasalah: ${errors.length}`);
  errors.forEach((e) => console.log('  - ' + e));
  if (errors.length) console.log('Kategori yang ada di database:', cats.map((c) => c.slug).join(', '));

  if (cek) { console.log('Mode --cek: tidak ada yang disimpan.'); await prisma.$disconnect(); return; }
  if (errors.length) { console.error('Perbaiki dulu error di atas, lalu jalankan lagi.'); await prisma.$disconnect(); process.exit(1); }

  const res = await prisma.sentence.createMany({ data, skipDuplicates: true });
  console.log(`Masuk database: ${res.count} kalimat (status ${terbit ? 'PUBLISHED' : 'DRAFT'}).`);
  console.log(`Dilewati karena sudah ada: ${data.length - res.count}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
