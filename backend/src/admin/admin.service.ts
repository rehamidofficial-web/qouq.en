import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Body = Record<string, unknown>;

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const STATUSES = ['DRAFT', 'IN_REVIEW', 'PUBLISHED'];
const POS = [
  'NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN',
  'PREPOSITION', 'CONJUNCTION', 'INTERJECTION', 'DETERMINER', 'OTHER',
];
const QTYPES = ['MULTIPLE_CHOICE', 'FILL_BLANK'];
const PAGE = 20;

// ---------- pembantu validasi (pesan dalam bahasa Indonesia) ----------
function str(b: Body, k: string, label: string, max = 500, required = true): string {
  const v = b[k];
  if (v === undefined || v === null || v === '') {
    if (required) throw new BadRequestException(`${label} wajib diisi`);
    return '';
  }
  if (typeof v !== 'string') throw new BadRequestException(`${label} harus berupa teks`);
  const t = v.trim();
  if (required && !t) throw new BadRequestException(`${label} wajib diisi`);
  if (t.length > max) throw new BadRequestException(`${label} maksimal ${max} huruf`);
  return t;
}
function optStr(b: Body, k: string, label: string, max = 500): string | null {
  const t = str(b, k, label, max, false);
  return t || null;
}
function oneOf(v: unknown, list: string[], label: string): string {
  if (typeof v !== 'string' || !list.includes(v)) {
    throw new BadRequestException(`${label} tidak valid`);
  }
  return v;
}
function num(v: unknown, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
function arr(b: Body, k: string, label: string, max: number): Body[] {
  const v = b[k];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) {
    throw new BadRequestException(`${label} tidak valid (maksimal ${max})`);
  }
  return v.filter((x) => x && typeof x === 'object') as Body[];
}
// Ikut hanya kalau syaratnya terisi.
function when(cond: unknown, obj: object): object {
  return cond ? obj : {};
}
function pageOf(p: unknown) {
  return Math.max(num(p, 1), 1);
}
function like(q: unknown) {
  const t = typeof q === 'string' ? q.trim().slice(0, 60) : '';
  return t || undefined;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Pesan ramah kalau data kembar atau tidak ditemukan.
  private async safe<T>(job: () => Promise<T>, dupMsg = 'Data yang sama sudah ada'): Promise<T> {
    try {
      return await job();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException(dupMsg);
        if (e.code === 'P2025') throw new NotFoundException('Data tidak ditemukan');
        if (e.code === 'P2003') throw new BadRequestException('Data terkait tidak ditemukan');
      }
      throw e;
    }
  }

  // ===================== RINGKASAN =====================
  async overview() {
    const [users, entries, sentences, topics, questions, draftEntries, draftSentences, draftQuestions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.dictionaryEntry.count(),
        this.prisma.sentence.count(),
        this.prisma.grammarTopic.count(),
        this.prisma.grammarQuestion.count(),
        this.prisma.dictionaryEntry.count({ where: { status: { not: 'PUBLISHED' } } }),
        this.prisma.sentence.count({ where: { status: { not: 'PUBLISHED' } } }),
        this.prisma.grammarQuestion.count({ where: { status: { not: 'PUBLISHED' } } }),
      ]);
    return {
      users, entries, sentences, topics, questions,
      hidden: { entries: draftEntries, sentences: draftSentences, questions: draftQuestions },
    };
  }

  // ===================== PENGGUNA =====================
  async users(q: unknown, page: unknown) {
    const p = pageOf(page);
    const term = like(q);
    const where: Prisma.UserWhereInput = term
      ? { OR: [{ email: { contains: term, mode: 'insensitive' } }, { name: { contains: term, mode: 'insensitive' } }] }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * PAGE,
        take: PAGE,
        select: {
          id: true, email: true, name: true, createdAt: true,
          roles: { select: { role: { select: { name: true } } } },
          profile: { select: { level: true } },
          _count: { select: { practiceSessions: true, grammarAttempts: true } },
        },
      }),
    ]);
    return {
      page: p, total, pageSize: PAGE,
      items: rows.map((u) => ({
        id: u.id, email: u.email, name: u.name, createdAt: u.createdAt,
        level: u.profile?.level ?? null,
        roles: u.roles.map((r) => r.role.name),
        sessions: u._count.practiceSessions,
        grammarTries: u._count.grammarAttempts,
      })),
    };
  }

  async deleteUser(id: string, me: string) {
    if (id === me) throw new BadRequestException('Kamu tidak bisa menghapus akunmu sendiri');
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (!target) throw new NotFoundException('Pengguna tidak ditemukan');
    if (target.roles.some((r) => r.role.name === 'admin')) {
      throw new BadRequestException('Akun admin tidak bisa dihapus dari sini');
    }
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  // ===================== KAMUS =====================
  async dictionaryList(q: unknown, status: unknown, page: unknown) {
    const p = pageOf(page);
    const term = like(q);
    const where: Prisma.DictionaryEntryWhereInput = {
      ...when(term, { headword: { contains: term, mode: 'insensitive' } }),
      ...when(typeof status === 'string' && STATUSES.includes(status), { status: status as 'DRAFT' }),
    };
    const [total, items] = await Promise.all([
      this.prisma.dictionaryEntry.count({ where }),
      this.prisma.dictionaryEntry.findMany({
        where,
        orderBy: { headword: 'asc' },
        skip: (p - 1) * PAGE,
        take: PAGE,
        select: {
          id: true, headword: true, level: true, status: true, phoneticEasy: true,
          senses: { select: { partOfSpeech: true, meaningId: true }, orderBy: { sortOrder: 'asc' }, take: 2 },
        },
      }),
    ]);
    return { page: p, total, pageSize: PAGE, items };
  }

  async dictionaryGet(id: string) {
    const e = await this.prisma.dictionaryEntry.findUnique({
      where: { id },
      include: {
        senses: { orderBy: { sortOrder: 'asc' }, include: { examples: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!e) throw new NotFoundException('Kata tidak ditemukan');
    return e;
  }

  private sensesData(b: Body) {
    const senses = arr(b, 'senses', 'Daftar arti', 12);
    if (senses.length === 0) throw new BadRequestException('Isi minimal satu arti');
    return senses.map((s, i) => ({
      partOfSpeech: oneOf(s.partOfSpeech, POS, 'Jenis kata') as 'NOUN',
      meaningId: str(s, 'meaningId', 'Arti (Indonesia)', 200),
      definitionEn: optStr(s, 'definitionEn', 'Definisi Inggris', 400),
      sortOrder: i,
      examples: {
        create: arr(s, 'examples', 'Contoh kalimat', 10)
          .map((x, j) => ({
            textEn: str(x, 'textEn', 'Contoh (Inggris)', 300, false),
            textId: str(x, 'textId', 'Contoh (Indonesia)', 300, false),
            sortOrder: j,
          }))
          .filter((x) => x.textEn),
      },
    }));
  }

  private entryData(b: Body) {
    const level = b.level ? oneOf(b.level, LEVELS, 'Level') : null;
    return {
      headword: str(b, 'headword', 'Kata', 80),
      phoneticIpa: optStr(b, 'phoneticIpa', 'Ejaan IPA', 100),
      phoneticEasy: optStr(b, 'phoneticEasy', 'Ejaan mudah', 100),
      level: level as 'A1' | null,
      status: (b.status ? oneOf(b.status, STATUSES, 'Status') : 'PUBLISHED') as 'PUBLISHED',
    };
  }

  dictionaryCreate(b: Body) {
    const data = this.entryData(b);
    const senses = this.sensesData(b);
    return this.safe(
      () => this.prisma.dictionaryEntry.create({ data: { ...data, source: 'admin', senses: { create: senses } } }),
      'Kata itu sudah ada di kamus',
    );
  }

  async dictionaryUpdate(id: string, b: Body) {
    const data = this.entryData(b);
    const senses = this.sensesData(b);
    return this.safe(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.dictionarySense.deleteMany({ where: { entryId: id } });
          return tx.dictionaryEntry.update({ where: { id }, data: { ...data, senses: { create: senses } } });
        }),
      'Kata itu sudah ada di kamus',
    );
  }

  dictionaryStatus(id: string, b: Body) {
    const status = oneOf(b.status, STATUSES, 'Status') as 'DRAFT';
    return this.safe(() => this.prisma.dictionaryEntry.update({ where: { id }, data: { status }, select: { id: true, status: true } }));
  }

  async dictionaryDelete(id: string) {
    await this.safe(() => this.prisma.dictionaryEntry.delete({ where: { id } }));
    return { ok: true };
  }

  // ===================== KATEGORI & KALIMAT =====================
  categories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true, name: true,
        _count: { select: { sentences: true } },
      },
    });
  }

  async sentenceList(q: unknown, categoryId: unknown, status: unknown, page: unknown) {
    const p = pageOf(page);
    const term = like(q);
    const where: Prisma.SentenceWhereInput = {
      ...when(term, { OR: [{ textEn: { contains: term, mode: 'insensitive' } }, { textId: { contains: term, mode: 'insensitive' } }] }),
      ...when(typeof categoryId === 'string' && categoryId, { categoryId }),
      ...when(typeof status === 'string' && STATUSES.includes(status), { status: status as 'DRAFT' }),
    };
    const [total, items] = await Promise.all([
      this.prisma.sentence.count({ where }),
      this.prisma.sentence.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * PAGE,
        take: PAGE,
        include: { category: { select: { name: true } } },
      }),
    ]);
    return { page: p, total, pageSize: PAGE, items };
  }

  private sentenceData(b: Body) {
    return {
      categoryId: str(b, 'categoryId', 'Kategori', 60),
      textEn: str(b, 'textEn', 'Kalimat Inggris', 400),
      textId: str(b, 'textId', 'Terjemahan Indonesia', 400),
      phoneticIpa: optStr(b, 'phoneticIpa', 'Ejaan IPA', 300),
      phoneticEasy: optStr(b, 'phoneticEasy', 'Ejaan mudah', 300),
      level: oneOf(b.level ?? 'A1', LEVELS, 'Level') as 'A1',
      notes: optStr(b, 'notes', 'Catatan', 400),
      status: oneOf(b.status ?? 'PUBLISHED', STATUSES, 'Status') as 'PUBLISHED',
    };
  }

  sentenceCreate(b: Body) {
    const data = this.sentenceData(b);
    return this.safe(() => this.prisma.sentence.create({ data: { ...data, source: 'admin' } }), 'Kalimat itu sudah ada di kategori ini');
  }

  sentenceUpdate(id: string, b: Body) {
    const data = this.sentenceData(b);
    return this.safe(() => this.prisma.sentence.update({ where: { id }, data }), 'Kalimat itu sudah ada di kategori ini');
  }

  sentenceStatus(id: string, b: Body) {
    const status = oneOf(b.status, STATUSES, 'Status') as 'DRAFT';
    return this.safe(() => this.prisma.sentence.update({ where: { id }, data: { status }, select: { id: true, status: true } }));
  }

  async sentenceDelete(id: string) {
    await this.safe(() => this.prisma.sentence.delete({ where: { id } }));
    return { ok: true };
  }

  // ===================== GRAMMAR =====================
  grammarTopics() {
    return this.prisma.grammarTopic.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { questions: true, lessons: true } } },
    });
  }

  private topicData(b: Body) {
    return {
      slug: str(b, 'slug', 'Kode (slug)', 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
      title: str(b, 'title', 'Judul', 120),
      description: optStr(b, 'description', 'Deskripsi', 400),
      level: oneOf(b.level ?? 'A1', LEVELS, 'Level') as 'A1',
      status: oneOf(b.status ?? 'PUBLISHED', STATUSES, 'Status') as 'PUBLISHED',
      sortOrder: num(b.sortOrder, 0),
    };
  }

  grammarTopicCreate(b: Body) {
    const data = this.topicData(b);
    if (!data.slug) throw new BadRequestException('Kode (slug) hanya boleh huruf kecil, angka, dan tanda -');
    return this.safe(() => this.prisma.grammarTopic.create({ data }), 'Kode (slug) itu sudah dipakai');
  }

  grammarTopicUpdate(id: string, b: Body) {
    const data = this.topicData(b);
    if (!data.slug) throw new BadRequestException('Kode (slug) hanya boleh huruf kecil, angka, dan tanda -');
    return this.safe(() => this.prisma.grammarTopic.update({ where: { id }, data }), 'Kode (slug) itu sudah dipakai');
  }

  grammarTopicStatus(id: string, b: Body) {
    const status = oneOf(b.status, STATUSES, 'Status') as 'DRAFT';
    return this.safe(() => this.prisma.grammarTopic.update({ where: { id }, data: { status }, select: { id: true, status: true } }));
  }

  async grammarTopicDelete(id: string) {
    await this.safe(() => this.prisma.grammarTopic.delete({ where: { id } }));
    return { ok: true };
  }

  grammarLessons(topicId: string) {
    return this.prisma.grammarLesson.findMany({ where: { topicId }, orderBy: { sortOrder: 'asc' } });
  }

  private lessonData(b: Body) {
    return {
      title: str(b, 'title', 'Judul materi', 120),
      summary: str(b, 'summary', 'Penjelasan', 3000),
      examples: optStr(b, 'examples', 'Contoh', 2000),
      sortOrder: num(b.sortOrder, 0),
    };
  }

  grammarLessonCreate(topicId: string, b: Body) {
    const data = this.lessonData(b);
    return this.safe(() => this.prisma.grammarLesson.create({ data: { ...data, topicId } }));
  }

  grammarLessonUpdate(id: string, b: Body) {
    const data = this.lessonData(b);
    return this.safe(() => this.prisma.grammarLesson.update({ where: { id }, data }));
  }

  async grammarLessonDelete(id: string) {
    await this.safe(() => this.prisma.grammarLesson.delete({ where: { id } }));
    return { ok: true };
  }

  async grammarQuestionList(topicId: unknown, status: unknown, page: unknown) {
    const p = pageOf(page);
    const where: Prisma.GrammarQuestionWhereInput = {
      ...when(typeof topicId === 'string' && topicId, { topicId }),
      ...when(typeof status === 'string' && STATUSES.includes(status), { status: status as 'DRAFT' }),
    };
    const [total, items] = await Promise.all([
      this.prisma.grammarQuestion.count({ where }),
      this.prisma.grammarQuestion.findMany({
        where,
        orderBy: [{ topicId: 'asc' }, { sortOrder: 'asc' }],
        skip: (p - 1) * PAGE,
        take: PAGE,
        include: {
          topic: { select: { title: true } },
          options: { orderBy: { sortOrder: 'asc' } },
        },
      }),
    ]);
    return { page: p, total, pageSize: PAGE, items };
  }

  private questionData(b: Body) {
    const type = oneOf(b.type, QTYPES, 'Jenis soal') as 'MULTIPLE_CHOICE' | 'FILL_BLANK';
    const accepted = Array.isArray(b.acceptedAnswers)
      ? (b.acceptedAnswers as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 10)
      : [];
    const options = arr(b, 'options', 'Pilihan jawaban', 8)
      .map((o, i) => ({
        text: str(o, 'text', 'Teks pilihan', 200, false),
        isCorrect: o.isCorrect === true,
        sortOrder: i,
      }))
      .filter((o) => o.text);
    if (type === 'MULTIPLE_CHOICE') {
      if (options.length < 2) throw new BadRequestException('Pilihan ganda butuh minimal 2 pilihan');
      if (options.filter((o) => o.isCorrect).length !== 1) {
        throw new BadRequestException('Tandai tepat satu pilihan sebagai jawaban benar');
      }
    } else if (accepted.length === 0) {
      throw new BadRequestException('Isian butuh minimal satu jawaban yang diterima');
    }
    return {
      data: {
        topicId: str(b, 'topicId', 'Topik', 60),
        type,
        prompt: str(b, 'prompt', 'Soal', 500),
        explanation: optStr(b, 'explanation', 'Penjelasan', 800),
        level: oneOf(b.level ?? 'A1', LEVELS, 'Level') as 'A1',
        status: oneOf(b.status ?? 'PUBLISHED', STATUSES, 'Status') as 'PUBLISHED',
        sortOrder: num(b.sortOrder, 0),
        acceptedAnswers: type === 'FILL_BLANK' ? accepted : [],
      },
      options: type === 'MULTIPLE_CHOICE' ? options : [],
    };
  }

  grammarQuestionCreate(b: Body) {
    const { data, options } = this.questionData(b);
    return this.safe(() => this.prisma.grammarQuestion.create({ data: { ...data, options: { create: options } } }));
  }

  grammarQuestionUpdate(id: string, b: Body) {
    const { data, options } = this.questionData(b);
    return this.safe(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.grammarOption.deleteMany({ where: { questionId: id } });
        return tx.grammarQuestion.update({ where: { id }, data: { ...data, options: { create: options } } });
      }),
    );
  }

  grammarQuestionStatus(id: string, b: Body) {
    const status = oneOf(b.status, STATUSES, 'Status') as 'DRAFT';
    return this.safe(() => this.prisma.grammarQuestion.update({ where: { id }, data: { status }, select: { id: true, status: true } }));
  }

  async grammarQuestionDelete(id: string) {
    await this.safe(() => this.prisma.grammarQuestion.delete({ where: { id } }));
    return { ok: true };
  }
}
