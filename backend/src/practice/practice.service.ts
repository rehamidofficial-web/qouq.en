import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptDto, StartSessionDto } from './practice.dto';
import { scoreSpeech } from './scoring';

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

  private async findOwnSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Sesi latihan tidak ditemukan');
    return session;
  }
}
