import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type WordRow = { id: string; headword: string; score: number };

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
  ): Promise<WordRow[]> {
    const kata = (q ?? '').trim().toLowerCase().slice(0, 60);
    if (!kata) return [];

    const awalan = `${kata.replace(/[\\%_]/g, '\\$&')}%`;

    return this.prisma.$queryRaw<WordRow[]>(Prisma.sql`
      SELECT "id", "headword", similarity("headword", ${kata}) AS score
      FROM "DictionaryEntry"
      WHERE "headword" ILIKE ${awalan} OR "headword" % ${kata}
      ORDER BY
        (lower("headword") = ${kata}) DESC,
        ("headword" ILIKE ${awalan}) DESC,
        score DESC,
        length("headword") ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  autocomplete(q: string, limit: number) {
    return this.cari(q, this.clamp(limit, 1, 20), 0);
  }

  async search(q: string, page: number, limit: number) {
    const size = this.clamp(limit, 1, 50);
    const p = Math.max(page, 1);
    const rows = await this.cari(q, size + 1, (p - 1) * size);
    return { page: p, hasMore: rows.length > size, items: rows.slice(0, size) };
  }

  async detail(id: string) {
    const entry = await this.prisma.dictionaryEntry.findUnique({
      where: { id },
      include: { senses: { include: { examples: true } } },
    });
    if (!entry) throw new NotFoundException('Kata tidak ditemukan');
    return entry;
  }
}
