import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { labelFor } from '../practice/scoring';
import { SubmitGrammarDto } from './grammar.dto';
import { isFillCorrect, percent } from './grading';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
type LevelValue = (typeof LEVELS)[number];

export interface AnswerResult {
  questionId: string;
  type: string;
  prompt: string;
  correct: boolean;
  yourAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
}

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Daftar topik yang sudah terbit, boleh disaring dengan level. */
  async listTopics(level?: string) {
    if (level && !LEVELS.includes(level as LevelValue)) {
      throw new BadRequestException('Level harus salah satu dari A1, A2, B1, B2, C1');
    }
    const topics = await this.prisma.grammarTopic.findMany({
      where: {
        status: 'PUBLISHED',
        ...(level ? { level: level as LevelValue } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        _count: {
          select: {
            lessons: true,
            questions: { where: { status: 'PUBLISHED' } },
          },
        },
      },
    });
    return topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      level: t.level,
      lessonCount: t._count.lessons,
      questionCount: t._count.questions,
    }));
  }

  /**
   * Satu topik lengkap: ringkasan aturan dan soal.
   * Kunci jawaban dan penjelasan SENGAJA tidak ikut dikirim.
   */
  async getTopic(idOrSlug: string) {
    const topic = await this.prisma.grammarTopic.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        lessons: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, summary: true, examples: true },
        },
        questions: {
          where: { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            type: true,
            prompt: true,
            level: true,
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, text: true },
            },
          },
        },
      },
    });
    if (!topic) throw new NotFoundException('Topik grammar tidak ditemukan');
    return topic;
  }

  /** Terima jawaban, nilai, simpan riwayat, lalu kirim hasil lengkap. */
  async submitAttempt(userId: string, idOrSlug: string, dto: SubmitGrammarDto) {
    const topic = await this.prisma.grammarTopic.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { id: true },
    });
    if (!topic) throw new NotFoundException('Topik grammar tidak ditemukan');

    const ids = dto.answers.map((a) => a.questionId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Satu soal hanya boleh dijawab satu kali');
    }

    const questions = await this.prisma.grammarQuestion.findMany({
      where: { id: { in: ids }, topicId: topic.id, status: 'PUBLISHED' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (questions.length !== ids.length) {
      throw new BadRequestException('Ada soal yang tidak termasuk topik ini');
    }
    const byId = new Map(questions.map((q) => [q.id, q]));

    const results: AnswerResult[] = [];
    for (const ans of dto.answers) {
      const q = byId.get(ans.questionId)!;
      let correct = false;
      let yourAnswer: string | null = null;
      let correctAnswer = '';

      if (q.type === 'MULTIPLE_CHOICE') {
        const right = q.options.find((o) => o.isCorrect);
        correctAnswer = right ? right.text : '';
        if (ans.optionId) {
          const chosen = q.options.find((o) => o.id === ans.optionId);
          if (!chosen) {
            throw new BadRequestException('Ada pilihan jawaban yang tidak cocok dengan soalnya');
          }
          yourAnswer = chosen.text;
          correct = chosen.isCorrect;
        }
      } else {
        correctAnswer = q.acceptedAnswers[0] ?? '';
        const text = ans.answerText?.trim();
        if (text) {
          yourAnswer = text;
          correct = isFillCorrect(text, q.acceptedAnswers);
        }
      }

      results.push({
        questionId: q.id,
        type: q.type,
        prompt: q.prompt,
        correct,
        yourAnswer,
        correctAnswer,
        explanation: q.explanation,
      });
    }

    const correctCount = results.filter((r) => r.correct).length;
    const totalQuestions = results.length;
    const score = percent(correctCount, totalQuestions);
    const { label, feedback } = labelFor(score);

    const saved = await this.prisma.grammarAttempt.create({
      data: {
        userId,
        topicId: topic.id,
        score,
        correctCount,
        totalQuestions,
        answers: results as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return {
      attemptId: saved.id,
      topicId: topic.id,
      score,
      correctCount,
      totalQuestions,
      label,
      feedback,
      results,
    };
  }
}
