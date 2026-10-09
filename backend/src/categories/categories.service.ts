import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const MAX_LIMIT = 50;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        sortOrder: true,
        targetCount: true,
        _count: { select: { sentences: { where: { status: 'PUBLISHED' } } } },
      },
    });
    return rows.map(({ _count, ...rest }) => ({
      ...rest,
      sentenceCount: _count.sentences,
    }));
  }

  async listSentences(
    idOrSlug: string,
    level: string | undefined,
    q: string | undefined,
    page: number,
    limit: number,
  ) {
    const levelUpper = level ? level.toUpperCase() : undefined;
    if (levelUpper && !LEVELS.includes(levelUpper)) {
      throw new BadRequestException('Level harus salah satu dari A1, A2, B1, B2, C1');
    }
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));

    const category = await this.prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true, slug: true, name: true },
    });
    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    const where: Prisma.SentenceWhereInput = {
      categoryId: category.id,
      status: 'PUBLISHED',
    };
    if (levelUpper) {
      where.level = levelUpper as Prisma.SentenceWhereInput['level'];
    }
    const keyword = q?.trim();
    if (keyword) {
      where.OR = [
        { textEn: { contains: keyword, mode: 'insensitive' } },
        { textId: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.sentence.findMany({
        where,
        orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          textEn: true,
          textId: true,
          phoneticIpa: true,
          phoneticEasy: true,
          level: true,
          notes: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
      }),
      this.prisma.sentence.count({ where }),
    ]);

    return {
      category,
      items: rows.map(({ tags, ...rest }) => ({
        ...rest,
        tags: tags.map((t) => t.tag.name),
      })),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async getSentence(id: string) {
    const sentence = await this.prisma.sentence.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        id: true,
        textEn: true,
        textId: true,
        phoneticIpa: true,
        phoneticEasy: true,
        level: true,
        notes: true,
        category: { select: { id: true, slug: true, name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    if (!sentence) {
      throw new NotFoundException('Kalimat tidak ditemukan');
    }
    const { tags, ...rest } = sentence;
    return { ...rest, tags: tags.map((t) => t.tag.name) };
  }
}
