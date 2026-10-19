import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type WordRow = {
  id: string;
  headword: string;
  score: number;
  level: string | null;
  pos: string[];
};

const POS = [
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PRONOUN',
  'PREPOSITION',
  'CONJUNCTION',
  'INTERJECTION',
  'DETERMINER',
  'OTHER',
];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

@Injectable()
export class DictionaryService {
  constructor(private readonly prisma: PrismaService) {}

  private clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max);
  }

  private async cari(
    q: string,
    limit: number,
    offset: number,
    pos?: string,
    level?: string,
  ): Promise<WordRow[]> {
    const kata = (q ?? '').trim().toLowerCase().slice(0, 60);
    if (!kata) return [];

    const awalan = `${kata.replace(/[\\%_]/g, '\\$&')}%`;

    // Filter opsional. Nilainya dicek dulu dengan daftar tetap, jadi aman.
    const p = (pos ?? '').toUpperCase();
    const l = (level ?? '').toUpperCase();
    const filterPos = POS.includes(p)
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "DictionarySense" f
          WHERE f."entryId" = e."id" AND f."partOfSpeech" = ${p}::"PartOfSpeech")`
      : Prisma.empty;
    const filterLevel = LEVELS.includes(l)
      ? Prisma.sql`AND e."level" = ${l}::"Level"`
      : Prisma.empty;

    return this.prisma.$queryRaw<WordRow[]>(Prisma.sql`
      SELECT
        e."id",
        e."headword",
        similarity(e."headword", ${kata}) AS score,
        e."level"::text AS level,
        COALESCE(
          (SELECT array_agg(DISTINCT s."partOfSpeech"::text)
             FROM "DictionarySense" s WHERE s."entryId" = e."id"),
          ARRAY[]::text[]
        ) AS pos
      FROM "DictionaryEntry" e
      WHERE (e."headword" ILIKE ${awalan} OR e."headword" % ${kata})
      ${filterPos}
      ${filterLevel}
      ORDER BY
        (lower(e."headword") = ${kata}) DESC,
        (e."headword" ILIKE ${awalan}) DESC,
        score DESC,
        length(e."headword") ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  autocomplete(q: string, limit: number, pos?: string, level?: string) {
    return this.cari(q, this.clamp(limit, 1, 20), 0, pos, level);
  }

  async search(
    q: string,
    page: number,
    limit: number,
    pos?: string,
    level?: string,
  ) {
    const size = this.clamp(limit, 1, 50);
    const p = Math.max(page, 1);
    const rows = await this.cari(q, size + 1, (p - 1) * size, pos, level);
    return { page: p, hasMore: rows.length > size, items: rows.slice(0, size) };
  }

  async phonetics(words: string) {
    const list = Array.from(
      new Set(
        (words ?? '')
          .split(',')
          .map((w) => w.trim().toLowerCase())
          .filter((w) => /^[a-z][a-z'-]*$/.test(w)),
      ),
    ).slice(0, 60);
    if (list.length === 0) return [];

    return this.prisma.$queryRaw<
      { headword: string; phoneticIpa: string | null; phoneticEasy: string | null }[]
    >(Prisma.sql`
      SELECT lower("headword") AS "headword", "phoneticIpa", "phoneticEasy"
      FROM "DictionaryEntry"
      WHERE lower("headword") = ANY(${list}::text[])
    `);
  }

  async detail(id: string) {
    const entry = await this.prisma.dictionaryEntry.findUnique({
      where: { id },
      include: {
        senses: {
          orderBy: { sortOrder: 'asc' },
          include: { examples: { orderBy: { sortOrder: 'asc' } } },
        },
        relations: {
          include: { relatedEntry: { select: { id: true, headword: true } } },
        },
      },
    });
    if (!entry) throw new NotFoundException('Kata tidak ditemukan');
    return entry;
  }
}
