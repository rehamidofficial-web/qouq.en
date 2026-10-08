import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

type Pos = 'n' | 'v' | 'a' | 'r';
type PartOfSpeechName = 'NOUN' | 'VERB' | 'ADJECTIVE' | 'ADVERB';
type LevelName = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
type RelationName = 'SYNONYM' | 'ANTONYM';

const SOURCE = 'Princeton WordNet 3.0 + Wordnet Bahasa + CMUdict + CEFR-J/Octanove + Tatoeba';
const OLD_SOURCE = 'Princeton WordNet 3.0 + Wordnet Bahasa (Open Multilingual Wordnet)';
const LICENSE =
  'WordNet License; MIT (Wordnet Bahasa); BSD-2-Clause (CMUdict); CEFR-J terms; CC BY-SA 4.0 (Octanove); CC BY 2.0 FR (Tatoeba)';

const INCLUDE_OCTANOVE = true;
const MAX_SENSES_PER_WORD = 6;
const MAX_INDONESIAN_WORDS = 5;
const MAX_SYNONYMS_PER_WORD = 6;
const EXAMPLES_PER_WORD = 2;
const MAX_EXAMPLE_WORDS = 12;

const DATA_DIR = join(__dirname, '..', 'data');
const DICT_DIR = join(DATA_DIR, 'dict');
const IND_FILE = join(DATA_DIR, 'wn-data-ind.tab');
const CMU_FILE = join(DATA_DIR, 'cmudict.dict');
const CEFRJ_FILE = join(DATA_DIR, 'cefrj-vocabulary-profile-1.5.csv');
const OCTANOVE_FILE = join(DATA_DIR, 'octanove-vocabulary-profile-c1c2-1.0.csv');

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

interface PendingAntonym {
  word: string;
  targetKey: string;
  targetIndex: number;
}

interface SenseRow {
  synsetId: string;
  pos: Pos;
  meaningId: string;
  definitionEn: string;
  tagCount: number;
}

interface ExamplePair {
  textEn: string;
  textId: string;
  source: string;
}

interface EntryRow {
  id: string;
  headword: string;
  phoneticIpa?: string;
  phoneticEasy?: string;
  level?: LevelName;
  source: string;
  license: string;
}

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/* ---------- WordNet (Inggris) ---------- */

function loadWordNet() {
  const synsets = new Map<string, Synset>();
  const wordLists = new Map<string, string[]>();
  const pending: PendingAntonym[] = [];

  for (const [pos, file] of DATA_FILES) {
    for (const line of readLines(join(DICT_DIR, file))) {
      if (!/^\d{8} /.test(line)) continue;
      const bar = line.indexOf(' | ');
      if (bar === -1) continue;
      const parts = line.slice(0, bar).split(' ');
      const key = `${parts[0]}-${pos}`;
      const wordCount = parseInt(parts[3], 16);

      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        words.push(parts[4 + i * 2].replace(/\([a-z]+\)$/, ''));
      }
      wordLists.set(key, words);

      const pointerStart = 4 + wordCount * 2;
      const pointerCount = parseInt(parts[pointerStart], 10);
      for (let k = 0; k < pointerCount; k++) {
        const base = pointerStart + 1 + k * 4;
        if (parts[base] !== '!') continue;
        const marker = parts[base + 3] ?? '';
        const sourceIndex = parseInt(marker.slice(0, 2), 16);
        const targetIndex = parseInt(marker.slice(2, 4), 16);
        if (!sourceIndex || !targetIndex) continue;
        const targetPos = parts[base + 2] === 's' ? 'a' : parts[base + 2];
        pending.push({
          word: words[sourceIndex - 1],
          targetKey: `${parts[base + 1]}-${targetPos}`,
          targetIndex,
        });
      }

      const lemmas = words.filter((w) => /^[a-z]+$/.test(w));
      if (lemmas.length === 0) continue;
      const gloss = line.slice(bar + 3).trim();
      const cut = gloss.indexOf('; "');
      const definition = (cut === -1 ? gloss : gloss.slice(0, cut)).trim();
      synsets.set(key, { pos, lemmas, definition });
    }
  }

  const antonyms = new Map<string, Set<string>>();
  for (const item of pending) {
    const target = wordLists.get(item.targetKey)?.[item.targetIndex - 1];
    if (!item.word || !target) continue;
    if (!/^[a-z]+$/.test(item.word) || !/^[a-z]+$/.test(target)) continue;
    const set = antonyms.get(item.word) ?? new Set<string>();
    set.add(target);
    antonyms.set(item.word, set);
  }
  return { synsets, antonyms };
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

/* ---------- Wordnet Bahasa (Indonesia) ---------- */

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

/* ---------- Level CEFR ---------- */

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function loadLevelFile(path: string, levels: Map<string, LevelName>) {
  if (!existsSync(path)) {
    console.warn(`DILEWATI (file tidak ada): ${path}`);
    return;
  }
  const lines = readLines(path).filter((l) => l.trim() !== '');
  if (lines.length < 2) return;
  const header = parseCsvLine(lines[0].replace(/^\uFEFF/, '')).map((h) => h.trim().toLowerCase());
  let wordCol = header.findIndex((h) => h.includes('headword') || h === 'word');
  let levelCol = header.findIndex((h) => h.includes('cefr') || h === 'level');
  if (wordCol < 0) wordCol = 0;
  if (levelCol < 0) levelCol = 2;

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const rank = LEVEL_ORDER.indexOf((cells[levelCol] ?? '').trim().toUpperCase());
    if (rank < 0) continue;
    const mapped = LEVEL_ORDER[Math.min(rank, 4)] as LevelName;
    for (const raw of (cells[wordCol] ?? '').split('/')) {
      const word = raw.trim().toLowerCase();
      if (!/^[a-z]+$/.test(word)) continue;
      const existing = levels.get(word);
      if (!existing || LEVEL_ORDER.indexOf(existing) > LEVEL_ORDER.indexOf(mapped)) {
        levels.set(word, mapped);
      }
    }
  }
}

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

/* ---------- Contoh kalimat (Tatoeba) ---------- */

function loadTatoeba(): ExamplePair[] {
  const path = [join(DATA_DIR, 'ind.txt'), join(DATA_DIR, 'ind-eng', 'ind.txt')].find((p) =>
    existsSync(p),
  );
  if (!path) {
    console.warn('DILEWATI (file tidak ada): data/ind.txt');
    return [];
  }
  const pairs: ExamplePair[] = [];
  for (const line of readLines(path)) {
    const [en, id, attribution] = line.split('\t');
    if (!en || !id) continue;
    pairs.push({
      textEn: en.trim(),
      textId: id.trim(),
      source: (attribution ?? 'Tatoeba, CC BY 2.0 FR, tatoeba.org').trim(),
    });
  }
  return pairs;
}

/* ---------- Program utama ---------- */

async function main() {
  const { synsets, antonyms } = loadWordNet();
  const tagCounts = loadTagCounts();
  const indonesian = loadIndonesian();
  console.log(
    `Dibaca: ${synsets.size} makna Inggris, ${indonesian.size} makna dengan arti Indonesia, ${antonyms.size} kata dengan antonim`,
  );

  const levels = new Map<string, LevelName>();
  loadLevelFile(CEFRJ_FILE, levels);
  if (INCLUDE_OCTANOVE) loadLevelFile(OCTANOVE_FILE, levels);
  const cmu = loadCmudict();
  const tatoeba = loadTatoeba();
  console.log(
    `Dibaca: ${levels.size} kata ber-level, ${cmu.size} pelafalan, ${tatoeba.length} pasangan kalimat`,
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
        synsetId: id,
        pos: synset.pos,
        meaningId: meaning.slice(0, MAX_INDONESIAN_WORDS).join(', '),
        definitionEn: synset.definition,
        tagCount,
      });
      byWord.set(lemma, rows);
    }
  }

  const entries: EntryRow[] = [];
  const senses: Array<{
    id: string;
    entryId: string;
    partOfSpeech: PartOfSpeechName;
    meaningId: string;
    definitionEn: string;
    sortOrder: number;
  }> = [];
  const entryIdByWord = new Map<string, string>();
  const firstSenseByEntry = new Map<string, string>();
  const usedSynsets = new Map<string, string[]>();

  for (const [headword, rows] of byWord) {
    rows.sort((a, b) => b.tagCount - a.tagCount);
    const entryId = randomUUID();
    entryIdByWord.set(headword, entryId);
    const phones = cmu.has(headword) ? parsePhones(cmu.get(headword) as string[]) : undefined;
    entries.push({
      id: entryId,
      headword,
      phoneticIpa: phones ? toIpa(phones) : undefined,
      phoneticEasy: phones ? toEasy(phones) : undefined,
      level: levels.get(headword),
      source: SOURCE,
      license: LICENSE,
    });
    const chosen = rows.slice(0, MAX_SENSES_PER_WORD);
    usedSynsets.set(headword, chosen.map((r) => r.synsetId));
    chosen.forEach((row, index) => {
      const senseId = randomUUID();
      if (index === 0) firstSenseByEntry.set(entryId, senseId);
      senses.push({
        id: senseId,
        entryId,
        partOfSpeech: POS_NAME[row.pos],
        meaningId: row.meaningId,
        definitionEn: row.definitionEn,
        sortOrder: index,
      });
    });
  }

  // Sinonim dan antonim
  const relationRows: Array<{ entryId: string; relatedEntryId: string; type: RelationName }> = [];
  const seenRelations = new Set<string>();
  const addRelation = (from: string, to: string, type: RelationName): boolean => {
    const a = entryIdByWord.get(from);
    const b = entryIdByWord.get(to);
    if (!a || !b || a === b) return false;
    const key = `${a}|${b}|${type}`;
    if (seenRelations.has(key)) return false;
    seenRelations.add(key);
    relationRows.push({ entryId: a, relatedEntryId: b, type });
    return true;
  };
  for (const [headword, synsetIds] of usedSynsets) {
    let count = 0;
    for (const synsetId of synsetIds) {
      for (const lemma of synsets.get(synsetId)?.lemmas ?? []) {
        if (count >= MAX_SYNONYMS_PER_WORD) break;
        if (lemma !== headword && addRelation(headword, lemma, 'SYNONYM')) count++;
      }
    }
  }
  for (const [word, targets] of antonyms) {
    for (const target of targets) addRelation(word, target, 'ANTONYM');
  }

  // Contoh kalimat: pilih yang pendek, maksimal 2 per kata
  const candidates = tatoeba
    .map((pair) => ({ pair, tokens: pair.textEn.toLowerCase().match(/[a-z]+/g) ?? [] }))
    .filter((item) => item.tokens.length >= 3 && item.tokens.length <= MAX_EXAMPLE_WORDS)
    .sort((a, b) => a.tokens.length - b.tokens.length);
  const examplesByWord = new Map<string, ExamplePair[]>();
  for (const { pair, tokens } of candidates) {
    for (const token of new Set(tokens)) {
      if (!entryIdByWord.has(token)) continue;
      const list = examplesByWord.get(token) ?? [];
      if (list.length >= EXAMPLES_PER_WORD) continue;
      list.push(pair);
      examplesByWord.set(token, list);
    }
  }
  const exampleRows: Array<{
    senseId: string;
    textEn: string;
    textId: string;
    sortOrder: number;
    source: string;
  }> = [];
  for (const [word, pairs] of examplesByWord) {
    const entryId = entryIdByWord.get(word);
    const senseId = entryId ? firstSenseByEntry.get(entryId) : undefined;
    if (!senseId) continue;
    pairs.forEach((pair, index) => {
      exampleRows.push({
        senseId,
        textEn: pair.textEn,
        textId: pair.textId,
        sortOrder: index,
        source: pair.source,
      });
    });
  }

  console.log(
    `Siap diimpor: ${entries.length} kata (${entries.filter((e) => e.phoneticIpa).length} dengan IPA, ${entries.filter((e) => e.level).length} dengan level), ${senses.length} makna, ${exampleRows.length} contoh kalimat, ${relationRows.length} relasi sinonim/antonim`,
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const removed = await prisma.dictionaryEntry.deleteMany({
      where: { source: { in: [SOURCE, OLD_SOURCE] } },
    });
    console.log(`Data lama dihapus: ${removed.count} kata`);

    for (const part of chunk(entries, 1000)) {
      await prisma.dictionaryEntry.createMany({ data: part });
    }
    console.log('Kata selesai dimasukkan');
    for (const part of chunk(senses, 2000)) {
      await prisma.dictionarySense.createMany({ data: part });
    }
    console.log('Makna selesai dimasukkan');
    for (const part of chunk(exampleRows, 2000)) {
      await prisma.dictionaryExample.createMany({ data: part });
    }
    console.log('Contoh kalimat selesai dimasukkan');
    for (const part of chunk(relationRows, 2000)) {
      await prisma.wordRelation.createMany({ data: part });
    }
    console.log('Sinonim dan antonim selesai dimasukkan');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
