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

  /**
   * Ringkasan untuk Beranda dan Statistik. Hari dihitung memakai waktu WIB (UTC+7).
   * Menit belajar diperkirakan dari jarak antar percobaan: jarak sampai 3 menit dihitung utuh,
   * percobaan pertama atau setelah jeda lama dihitung 1 menit.
   */
  async stats(userId: string, days: number) {
    const range = days === 30 ? 30 : 7;
    const WIB = 7 * 3600 * 1000;
    const DAY = 86400000;
    const dayKey = (d: Date) => new Date(d.getTime() + WIB).toISOString().slice(0, 10);
    const today = new Date();
    const todayKey = dayKey(today);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { dailyGoalMinutes: true },
    });

    const since = new Date(today.getTime() - 365 * DAY);
    const rowsDesc = await this.prisma.practiceAttempt.findMany({
      where: { session: { userId }, createdAt: { gte: since } },
      select: { createdAt: true, finalScore: true, sentenceId: true, details: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const grammar = await this.prisma.grammarAttempt.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, score: true },
    });

    // Menit per hari (perkiraan)
    const minutesByDay = new Map<string, number>();
    const asc = [...rowsDesc].reverse();
    let prev: Date | null = null;
    for (const r of asc) {
      const gap = prev ? r.createdAt.getTime() - prev.getTime() : Infinity;
      const add = gap <= 3 * 60000 ? gap / 60000 : 1;
      const k = dayKey(r.createdAt);
      minutesByDay.set(k, (minutesByDay.get(k) ?? 0) + add);
      prev = r.createdAt;
    }
    for (const g of grammar) {
      const k = dayKey(g.createdAt);
      minutesByDay.set(k, (minutesByDay.get(k) ?? 0) + 3);
    }

    const activeDays = new Set([
      ...rowsDesc.map((r) => dayKey(r.createdAt)),
      ...grammar.map((g) => dayKey(g.createdAt)),
    ]);
    let streak = 0;
    const cursor = new Date(today);
    if (!activeDays.has(dayKey(cursor))) cursor.setTime(cursor.getTime() - DAY);
    while (activeDays.has(dayKey(cursor))) {
      streak++;
      cursor.setTime(cursor.getTime() - DAY);
    }

    const from = dayKey(new Date(today.getTime() - (range - 1) * DAY));
    const prevFrom = dayKey(new Date(today.getTime() - (2 * range - 1) * DAY));
    const inRange = rowsDesc.filter((r) => dayKey(r.createdAt) >= from);
    const inPrev = rowsDesc.filter((r) => {
      const k = dayKey(r.createdAt);
      return k >= prevFrom && k < from;
    });

    const perDay = new Map<string, { sum: number; n: number }>();
    for (const r of inRange) {
      const k = dayKey(r.createdAt);
      const d = perDay.get(k) ?? { sum: 0, n: 0 };
      d.sum += r.finalScore;
      d.n += 1;
      perDay.set(k, d);
    }
    const trend: { date: string; attempts: number; avg: number | null; minutes: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const k = dayKey(new Date(today.getTime() - i * DAY));
      const d = perDay.get(k);
      trend.push({
        date: k,
        attempts: d?.n ?? 0,
        avg: d ? Math.round(d.sum / d.n) : null,
        minutes: Math.round(minutesByDay.get(k) ?? 0),
      });
    }

    const weak = new Map<string, number>();
    for (const r of inRange) {
      const words = (r.details as { words?: { status: string; target?: string }[] } | null)?.words;
      if (!Array.isArray(words)) continue;
      for (const w of words) {
        if ((w.status === 'wrong' || w.status === 'missing') && w.target) {
          const key = w.target.toLowerCase();
          weak.set(key, (weak.get(key) ?? 0) + 1);
        }
      }
    }
    const weakWords = [...weak.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }));

    const todayRows = rowsDesc.filter((r) => dayKey(r.createdAt) === todayKey);
    const avgOf = (list: { finalScore: number }[]) =>
      list.length ? Math.round(list.reduce((s, r) => s + r.finalScore, 0) / list.length) : null;
    const avgScore = avgOf(inRange);
    const avgPrev = avgOf(inPrev);

    // XP: tiap percobaan = skor/10 (maks 10), tiap latihan grammar = skor/5. Hari ini dihitung terpisah.
    const xpOf = (key: (d: Date) => boolean) =>
      rowsDesc.filter((r) => key(r.createdAt)).reduce((s, r) => s + Math.round(r.finalScore / 10), 0) +
      grammar.filter((g) => key(g.createdAt)).reduce((s, g) => s + Math.round(g.score / 5), 0);
    const bestScore = rowsDesc.reduce((m, r) => Math.max(m, r.finalScore), 0);
    const totalSentences = new Set(rowsDesc.map((r) => r.sentenceId)).size;

    return {
      range,
      streak,
      goalMinutes: profile?.dailyGoalMinutes ?? 15,
      today: {
        attempts: todayRows.length,
        sentences: new Set(todayRows.map((r) => r.sentenceId)).size,
        minutes: Math.round(minutesByDay.get(todayKey) ?? 0),
        xp: xpOf((d) => dayKey(d) === todayKey),
      },
      sentences: new Set(inRange.map((r) => r.sentenceId)).size,
      attempts: inRange.length,
      avgScore,
      avgDelta: avgScore !== null && avgPrev !== null ? avgScore - avgPrev : null,
      xp: xpOf(() => true),
      totalSentences,
      bestScore,
      trend,
      weakWords,
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
