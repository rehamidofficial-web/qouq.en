import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type Pos = 'n' | 'v' | 'a' | 'r';
type PartOfSpeechName = 'NOUN' | 'VERB' | 'ADJECTIVE' | 'ADVERB';

const SOURCE = 'Princeton WordNet 3.0 + Wordnet Bahasa (Open Multilingual Wordnet)';
const LICENSE = 'WordNet License (Princeton); MIT (Wordnet Bahasa)';
const MAX_SENSES_PER_WORD = 6;
const MAX_INDONESIAN_WORDS = 5;

const DICT_DIR = join(__dirname, '..', 'data', 'dict');
const IND_FILE = join(__dirname, '..', 'data', 'wn-data-ind.tab');

const POS_NAME: Record<Pos, PartOfSpeechName> = {
  n: 'NOUN',
  v: 'VERB',
  a: 'ADJECTIVE',
  r: 'ADVERB',
};

const DATA_FILES: Array<[Pos, string]> = [
  ['n', 'data.noun'],
  ['v', 'data.verb'],
  ['a', 'data.adj'],
  ['r', 'data.adv'],
];

interface Synset {
  pos: Pos;
  lemmas: string[];
  definition: string;
}

interface SenseRow {
  pos: Pos;
  meaningId: string;
  definitionEn: string;
  tagCount: number;
}

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function loadSynsets(): Map<string, Synset> {
  const synsets = new Map<string, Synset>();
  for (const [pos, file] of DATA_FILES) {
    for (const line of readLines(join(DICT_DIR, file))) {
      if (!/^\d{8} /.test(line)) continue;
      const bar = line.indexOf(' | ');
      if (bar === -1) continue;
      const parts = line.slice(0, bar).split(' ');
      const offset = parts[0];
      const wordCount = parseInt(parts[3], 16);
      const lemmas: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const word = parts[4 + i * 2].replace(/\([a-z]+\)$/, '');
        if (/^[a-z]+$/.test(word)) lemmas.push(word);
      }
      if (lemmas.length === 0) continue;
      const gloss = line.slice(bar + 3).trim();
      const cut = gloss.indexOf('; "');
      const definition = (cut === -1 ? gloss : gloss.slice(0, cut)).trim();
      synsets.set(`${offset}-${pos}`, { pos, lemmas, definition });
    }
  }
  return synsets;
}

function loadTagCounts(): Map<string, number> {
  const posByType: Record<string, Pos> = { '1': 'n', '2': 'v', '3': 'a', '4': 'r', '5': 'a' };
  const counts = new Map<string, number>();
  for (const line of readLines(join(DICT_DIR, 'index.sense'))) {
    const [senseKey, offset, , tagCount] = line.split(' ');
    if (!senseKey || !senseKey.includes('%')) continue;
    const [lemma, rest] = senseKey.split('%');
    const pos = posByType[rest.split(':')[0]];
    if (!pos) continue;
    counts.set(`${lemma}|${offset}-${pos}`, Number(tagCount));
  }
  return counts;
}

function loadIndonesian(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of readLines(IND_FILE)) {
    if (!line || line.startsWith('#')) continue;
    const [rawId, kind, lemma] = line.split('\t');
    if (kind !== 'ind:lemma' || !lemma) continue;
    const synsetId = rawId.replace(/-s$/, '-a');
    const word = lemma.trim();
    if (!word) continue;
    const list = map.get(synsetId) ?? [];
    if (!list.includes(word)) list.push(word);
    map.set(synsetId, list);
  }
  return map;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  const synsets = loadSynsets();
  const tagCounts = loadTagCounts();
  const indonesian = loadIndonesian();
  console.log(
    `Dibaca: ${synsets.size} makna Inggris, ${tagCounts.size} data frekuensi, ${indonesian.size} makna dengan arti Indonesia`,
  );

  const byWord = new Map<string, SenseRow[]>();
  for (const [id, synset] of synsets) {
    const meaning = indonesian.get(id);
    if (!meaning || meaning.length === 0) continue;
    for (const lemma of synset.lemmas) {
      const tagCount = tagCounts.get(`${lemma}|${id}`) ?? 0;
      if (tagCount < 1) continue;
      const rows = byWord.get(lemma) ?? [];
      rows.push({
        pos: synset.pos,
        meaningId: meaning.slice(0, MAX_INDONESIAN_WORDS).join(', '),
        definitionEn: synset.definition,
        tagCount,
      });
      byWord.set(lemma, rows);
    }
  }

  const entries: Array<{ id: string; headword: string; source: string; license: string }> = [];
  const senses: Array<{
    entryId: string;
    partOfSpeech: PartOfSpeechName;
    meaningId: string;
    definitionEn: string;
    sortOrder: number;
  }> = [];

  for (const [headword, rows] of byWord) {
    rows.sort((a, b) => b.tagCount - a.tagCount);
    const entryId = randomUUID();
    entries.push({ id: entryId, headword, source: SOURCE, license: LICENSE });
    rows.slice(0, MAX_SENSES_PER_WORD).forEach((row, index) => {
      senses.push({
        entryId,
        partOfSpeech: POS_NAME[row.pos],
        meaningId: row.meaningId,
        definitionEn: row.definitionEn,
        sortOrder: index,
      });
    });
  }

  console.log(`Siap diimpor: ${entries.length} kata, ${senses.length} makna`);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const removed = await prisma.dictionaryEntry.deleteMany({ where: { source: SOURCE } });
    console.log(`Data lama dari sumber yang sama dihapus: ${removed.count} kata`);

    for (const part of chunk(entries, 1000)) {
      await prisma.dictionaryEntry.createMany({ data: part });
    }
    console.log('Kata selesai dimasukkan');

    for (const part of chunk(senses, 2000)) {
      await prisma.dictionarySense.createMany({ data: part });
    }
    console.log('Makna selesai dimasukkan');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
