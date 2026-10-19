// Membuat daftar ejaan untuk kata-kata di kalimat latihan yang TIDAK ada di kamus
// (misalnya what, is, it, the, going). Sumbernya cmudict.dict yang sudah ada di backend/data.
// Hasilnya ditulis ke src/dictionary/extra-phonetics.ts lalu dipakai endpoint /dictionary/phonetics.
//
// Cara pakai (dari folder backend):  npx tsx scripts/build-extra-phonetics.ts
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DATA_DIR = join(__dirname, '..', 'data');
const CMU_FILE = join(DATA_DIR, 'cmudict.dict');
const OUT_FILE = join(__dirname, '..', 'src', 'dictionary', 'extra-phonetics.ts');

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

/* Bagian di bawah ini SAMA PERSIS dengan scripts/import-dictionary.ts,
   supaya ejaan kata tambahan tampil sama dengan ejaan kata di kamus. */

/* ---------- Pelafalan (CMUdict -> IPA dan ejaan mudah) ---------- */

interface Phone {
  symbol: string;
  stress: number | null;
}

const VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

const IPA: Record<string, string> = {
  AA: 'ɑ', AE: 'æ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', EY: 'eɪ', IH: 'ɪ', IY: 'i',
  OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l',
  M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v',
  W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

const EASY_VOWEL: Record<string, string> = {
  AA: 'a', AE: 'e', AO: 'o', AW: 'au', AY: 'ai', EH: 'e', EY: 'ei', IH: 'i', IY: 'i',
  OW: 'ou', OY: 'oi', UH: 'u', UW: 'u', ER: 'er',
};

const EASY_CONSONANT: Record<string, string> = {
  B: 'b', CH: 'c', D: 'd', DH: 'dh', F: 'f', G: 'g', HH: 'h', JH: 'j', K: 'k', L: 'l',
  M: 'm', N: 'n', NG: 'ng', P: 'p', R: 'r', S: 's', SH: 'sy', T: 't', TH: 'th', V: 'v',
  W: 'w', Y: 'y', Z: 'z', ZH: 'zy',
};

const ONSET2 = new Set([
  'P L', 'P R', 'B L', 'B R', 'T R', 'D R', 'K L', 'K R', 'G L', 'G R', 'F L', 'F R',
  'TH R', 'SH R', 'S P', 'S T', 'S K', 'S L', 'S M', 'S N', 'S W', 'T W', 'K W', 'D W', 'HH Y',
]);
const ONSET3 = new Set(['S P L', 'S P R', 'S T R', 'S K R', 'S K W']);

function loadCmudict(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!existsSync(CMU_FILE)) {
    console.warn(`DILEWATI (file tidak ada): ${CMU_FILE}`);
    return map;
  }
  for (const raw of readLines(CMU_FILE)) {
    const line = raw.split('#')[0].trim();
    if (!line || line.startsWith(';')) continue;
    const [word, ...phones] = line.split(/\s+/);
    if (!word || phones.length === 0 || word.includes('(')) continue;
    if (!map.has(word)) map.set(word, phones);
  }
  return map;
}

function parsePhones(raw: string[]): Phone[] {
  return raw.map((p) => {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    return { symbol: m ? m[1] : p, stress: m && m[2] !== undefined ? Number(m[2]) : null };
  });
}

function isVowel(p: Phone): boolean {
  return VOWELS.has(p.symbol);
}

function onsetStart(phones: Phone[], vowelIndex: number): number {
  let start = vowelIndex;
  while (start > 0 && !isVowel(phones[start - 1])) start--;
  if (start === 0) return 0;
  const cluster = phones.slice(start, vowelIndex).map((p) => p.symbol);
  if (cluster.length === 0) return vowelIndex;
  if (cluster.length >= 3 && ONSET3.has(cluster.slice(-3).join(' '))) return vowelIndex - 3;
  if (cluster.length >= 2 && ONSET2.has(cluster.slice(-2).join(' '))) return vowelIndex - 2;
  return vowelIndex - 1;
}

function vowelIndexes(phones: Phone[]): number[] {
  const result: number[] = [];
  phones.forEach((p, i) => {
    if (isVowel(p)) result.push(i);
  });
  return result;
}

function ipaOf(p: Phone): string {
  if (p.symbol === 'AH') return p.stress === 0 ? 'ə' : 'ʌ';
  if (p.symbol === 'ER') return p.stress === 0 ? 'ɚ' : 'ɝ';
  return IPA[p.symbol] ?? '';
}

function toIpa(phones: Phone[]): string {
  const vowels = vowelIndexes(phones);
  const marks = new Map<number, string>();
  if (vowels.length > 1) {
    for (const i of vowels) {
      const stress = phones[i].stress;
      if (stress === 1) marks.set(onsetStart(phones, i), 'ˈ');
      else if (stress === 2 && !marks.has(onsetStart(phones, i))) marks.set(onsetStart(phones, i), 'ˌ');
    }
  }
  let out = '';
  phones.forEach((p, i) => {
    out += (marks.get(i) ?? '') + ipaOf(p);
  });
  return `/${out}/`;
}

function easyOf(p: Phone): string {
  if (p.symbol === 'AH') return p.stress === 0 ? 'e' : 'a';
  return EASY_VOWEL[p.symbol] ?? EASY_CONSONANT[p.symbol] ?? '';
}

function toEasy(phones: Phone[]): string {
  const vowels = vowelIndexes(phones);
  if (vowels.length <= 1) return phones.map(easyOf).join('');
  const starts = vowels.map((v, k) => (k === 0 ? 0 : onsetStart(phones, v)));
  const parts: string[] = [];
  starts.forEach((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : phones.length;
    let syllable = phones.slice(start, end).map(easyOf).join('');
    if (phones[vowels[k]].stress === 1) syllable = syllable.toUpperCase();
    parts.push(syllable);
  });
  return parts.join('-');
}


/* ---------- Program utama ---------- */

export function wordsOf(text: string): string[] {
  const found = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
  return found.map((w) => w.toLowerCase().replace('’', "'"));
}

export function buildExtra(
  needed: Iterable<string>,
  cmu: Map<string, string[]>,
): { out: Record<string, [string, string]>; notFound: string[] } {
  const out: Record<string, [string, string]> = {};
  const notFound: string[] = [];
  for (const w of [...needed].sort()) {
    const raw = cmu.get(w);
    if (!raw) {
      notFound.push(w);
      continue;
    }
    const phones = parsePhones(raw);
    out[w] = [toIpa(phones), toEasy(phones)];
  }
  return { out, notFound };
}

async function main() {
  const cmu = loadCmudict();
  if (cmu.size === 0 || !existsSync(CMU_FILE)) {
    console.error('Berhenti: file backend/data/cmudict.dict tidak ditemukan.');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const sentences = await prisma.sentence.findMany({ select: { textEn: true } });
    const entries = await prisma.dictionaryEntry.findMany({ select: { headword: true } });
    const known = new Set(entries.map((e) => e.headword.toLowerCase()));

    const needed = new Set<string>();
    for (const s of sentences) for (const w of wordsOf(s.textEn)) if (!known.has(w)) needed.add(w);

    const { out, notFound } = buildExtra(needed, cmu);

    const body =
      '// DIBUAT OTOMATIS oleh scripts/build-extra-phonetics.ts. Jangan diedit tangan.\n' +
      '// Ejaan kata yang tidak ada di kamus: [IPA, ejaan mudah]. Sumber: CMUdict (BSD 2-clause).\n' +
      `export const EXTRA_PHONETICS: Record<string, [string, string]> = ${JSON.stringify(out, null, 1)};\n`;
    writeFileSync(OUT_FILE, body, 'utf8');

    console.log(`Kalimat dibaca: ${sentences.length}`);
    console.log(`Kata yang belum ada di kamus: ${needed.size}`);
    console.log(`  - berhasil diberi ejaan: ${Object.keys(out).length}`);
    console.log(`  - tidak ada di CMUdict: ${notFound.length}`);
    if (notFound.length) console.log(`    contoh: ${notFound.slice(0, 20).join(', ')}`);
    console.log(`Ditulis ke: ${OUT_FILE}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
