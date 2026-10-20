import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptDto, StartSessionDto } from './practice.dto';
import { scoreSpeech } from './scoring';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const STATUSES = ['all', 'todo', 'done'];
const MAX_LIMIT = 50;

export interface ProgressQuery {
  status?: string;
  level?: string;
  q?: string;
  page: number;
  limit: number;
}

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mulai sesi latihan baru. */
  async startSession(userId: string, dto: StartSessionDto) {
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException('Kategori tidak ditemukan');
    }
    return this.prisma.practiceSession.create({
      data: {
        userId,
        categoryId: dto.categoryId ?? null,
        mode: dto.mode ?? 'PRACTICE',
      },
      select: { id: true, categoryId: true, mode: true, startedAt: true },
    });
  }

  /** Kirim hasil ucapan untuk satu kalimat, lalu hitung skornya. */
  async addAttempt(userId: string, sessionId: string, dto: AttemptDto) {
    const session = await this.findOwnSession(userId, sessionId);
    if (session.finishedAt) {
      throw new BadRequestException('Sesi latihan ini sudah selesai');
    }

    const sentence = await this.prisma.sentence.findFirst({
      where: { id: dto.sentenceId, status: 'PUBLISHED' },
      select: { id: true, textEn: true, categoryId: true },
    });
    if (!sentence) throw new NotFoundException('Kalimat tidak ditemukan');
    if (session.categoryId && sentence.categoryId !== session.categoryId) {
      throw new BadRequestException('Kalimat ini bukan dari kategori sesi');
    }

    const result = scoreSpeech(sentence.textEn, dto.spokenText, dto.confidence);

    const saved = await this.prisma.practiceAttempt.create({
      data: {
        sessionId: session.id,
        sentenceId: sentence.id,
        spokenText: dto.spokenText,
        wordScore: result.wordScore,
        orderScore: result.orderScore,
        confidenceScore: result.confidenceScore,
        finalScore: result.finalScore,
        label: result.label,
        details: result.words as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return {
      attemptId: saved.id,
      sentenceId: sentence.id,
      targetText: sentence.textEn,
      ...result,
    };
  }

  /** Akhiri sesi dan kirim ringkasan skornya. */
  async finishSession(userId: string, sessionId: string) {
    const session = await this.findOwnSession(userId, sessionId);
    if (!session.finishedAt) {
      await this.prisma.practiceSession.update({
        where: { id: session.id },
        data: { finishedAt: new Date() },
      });
    }
    return this.getSession(userId, sessionId);
  }

  /** Lihat satu sesi beserta ringkasan dan daftar percobaannya. */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        attempts: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            sentenceId: true,
            spokenText: true,
            finalScore: true,
            label: true,
            createdAt: true,
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sesi latihan tidak ditemukan');

    const scores = session.attempts.map((a) => a.finalScore);
    const average = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const seconds =
      session.finishedAt != null
        ? Math.round(
            (session.finishedAt.getTime() - session.startedAt.getTime()) / 1000,
          )
        : null;

    return {
      id: session.id,
      categoryId: session.categoryId,
      mode: session.mode,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      durationSeconds: seconds,
      summary: {
        totalAttempts: scores.length,
        averageScore: average,
        bestScore: scores.length ? Math.max(...scores) : null,
        lowestScore: scores.length ? Math.min(...scores) : null,
      },
      attempts: session.attempts,
    };
  }

  /** Berapa kalimat berbeda yang sudah dilatih pengguna, per kategori. */
  async progressByCategory(userId: string) {
    const categories = await this.prisma.$queryRaw<
      { categoryId: string; practiced: number }[]
    >(Prisma.sql`
      SELECT s."categoryId" AS "categoryId",
             COUNT(DISTINCT a."sentenceId")::int AS "practiced"
      FROM "PracticeAttempt" a
      JOIN "PracticeSession" p ON p."id" = a."sessionId"
      JOIN "Sentence" s ON s."id" = a."sentenceId"
      WHERE p."userId" = ${userId} AND s."status" = 'PUBLISHED'
      GROUP BY s."categoryId"
    `);
    return { categories };
  }

  /** Daftar kalimat satu kategori, lengkap dengan skor terbaik milik pengguna. */
  async sentencesWithProgress(
    userId: string,
    idOrSlug: string,
    query: ProgressQuery,
  ) {
    const status = (query.status ?? 'all').toLowerCase();
    if (!STATUSES.includes(status)) {
      throw new BadRequestException('Status harus all, todo, atau done');
    }
    const level = query.level ? query.level.toUpperCase() : undefined;
    if (level && !LEVELS.includes(level)) {
      throw new BadRequestException(
        'Level harus salah satu dari A1, A2, B1, B2, C1',
      );
    }
    const page = Math.max(1, query.page);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit));

    const category = await this.prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true, slug: true, name: true },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const mine: Prisma.PracticeAttemptWhereInput = { session: { userId } };
    const base: Prisma.SentenceWhereInput = {
      categoryId: category.id,
      status: 'PUBLISHED',
    };
    const where: Prisma.SentenceWhereInput = { ...base };
    if (level) where.level = level as Prisma.SentenceWhereInput['level'];
    const keyword = query.q?.trim();
    if (keyword) {
      where.OR = [
        { textEn: { contains: keyword, mode: 'insensitive' } },
        { textId: { contains: keyword, mode: 'insensitive' } },
        { notes: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (status === 'done') where.practiceAttempts = { some: mine };
    if (status === 'todo') where.practiceAttempts = { none: mine };

    const [rows, total, allCount, doneCount] = await Promise.all([
      this.prisma.sentence.findMany({
        where,
        orderBy: [{ level: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
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
      this.prisma.sentence.count({ where: base }),
      this.prisma.sentence.count({
        where: { ...base, practiceAttempts: { some: mine } },
      }),
    ]);

    const stats = rows.length
      ? await this.prisma.practiceAttempt.groupBy({
          by: ['sentenceId'],
          where: { sentenceId: { in: rows.map((r) => r.id) }, ...mine },
          _max: { finalScore: true },
          _count: { _all: true },
        })
      : [];
    const byId = new Map(stats.map((s) => [s.sentenceId, s]));

    return {
      category,
      items: rows.map(({ tags, ...rest }) => ({
        ...rest,
        tags: tags.map((t) => t.tag.name),
        bestScore: byId.get(rest.id)?._max.finalScore ?? null,
        attempts: byId.get(rest.id)?._count._all ?? 0,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: { done: doneCount, total: allCount },
    };
  }

  private async findOwnSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Sesi latihan tidak ditemukan');
    return session;
  }
}
