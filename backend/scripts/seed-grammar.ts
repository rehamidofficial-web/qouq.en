import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Cara pakai (dari folder backend):
//   npx ts-node scripts/seed-grammar.ts
// Aman dijalankan berulang: topik yang slug-nya sudah ada akan dilewati.

type Lvl = 'A1' | 'A2';
interface Opt { text: string; ok?: boolean }
interface Q {
  type: 'MULTIPLE_CHOICE' | 'FILL_BLANK';
  level: Lvl;
  prompt: string;
  explanation: string;
  options?: Opt[];
  accepted?: string[];
}
interface Topic {
  slug: string;
  title: string;
  description: string;
  level: Lvl;
  lesson: { title: string; summary: string; examples: string };
  questions: Q[];
}

const TOPICS: Topic[] = [
  {
    slug: 'simple-present',
    title: 'Simple Present',
    description: 'Kebiasaan, rutinitas, dan fakta umum.',
    level: 'A1',
    lesson: {
      title: 'Aturan Simple Present',
      summary:
        'Simple present dipakai untuk kebiasaan dan fakta. Untuk he, she, it, kata kerja ditambah -s atau -es (go jadi goes). Untuk I, you, we, they, kata kerja tetap bentuk dasar. Kalimat negatif: do not / does not + kata kerja dasar. Pertanyaan: Do / Does + subjek + kata kerja dasar.',
      examples: 'She works every day. | They play football on Sundays. | He does not drink coffee. | Do you like tea?',
    },
    questions: [
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'She ___ to school every day.', explanation: 'Subjeknya she, jadi kata kerja diberi -es: goes.', options: [{ text: 'go' }, { text: 'goes', ok: true }, { text: 'going' }, { text: 'gone' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'They ___ football on Sundays.', explanation: 'They bukan he/she/it, jadi kata kerja tidak diberi -s: play.', options: [{ text: 'play', ok: true }, { text: 'plays' }, { text: 'playing' }, { text: 'played' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'He does not ___ coffee.', explanation: 'Setelah does not, kata kerja memakai bentuk dasar: drink.', options: [{ text: 'drink', ok: true }, { text: 'drinks' }, { text: 'drank' }, { text: 'drinking' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: '___ you like tea?', explanation: 'Untuk subjek you, pertanyaan simple present memakai Do.', options: [{ text: 'Do', ok: true }, { text: 'Does' }, { text: 'Are' }, { text: 'Is' }] },
      { type: 'FILL_BLANK', level: 'A1', prompt: 'My brother ___ (watch) TV every night.', explanation: 'Watch berakhiran -ch, jadi untuk he/she/it ditambah -es: watches.', accepted: ['watches'] },
      { type: 'FILL_BLANK', level: 'A1', prompt: 'Water ___ (boil) at 100 degrees Celsius.', explanation: 'Water sama dengan it, jadi kata kerja diberi -s: boils.', accepted: ['boils'] },
    ],
  },
  {
    slug: 'articles',
    title: 'Articles (a, an, the)',
    description: 'Kapan memakai a, an, dan the.',
    level: 'A1',
    lesson: {
      title: 'Aturan a, an, the',
      summary:
        'Pakai a sebelum kata yang diawali BUNYI konsonan, dan an sebelum kata yang diawali BUNYI vokal (a, e, i, o, u). Yang dilihat adalah bunyinya, bukan hurufnya. Pakai the untuk benda tertentu yang sudah sama-sama diketahui pembicara dan pendengar.',
      examples: 'a book | an apple | an hour (huruf h tidak dibunyikan) | a university (bunyi awalnya y) | Close the door, please.',
    },
    questions: [
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'I have ___ apple.', explanation: 'Apple diawali bunyi vokal, jadi memakai an.', options: [{ text: 'a' }, { text: 'an', ok: true }, { text: 'the' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'She is ___ teacher.', explanation: 'Teacher diawali bunyi konsonan, jadi memakai a.', options: [{ text: 'a', ok: true }, { text: 'an' }, { text: 'the' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'We waited for ___ hour.', explanation: 'Huruf h pada hour tidak dibunyikan, jadi bunyi awalnya vokal: an.', options: [{ text: 'a' }, { text: 'an', ok: true }, { text: 'the' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A1', prompt: 'Please close ___ door.', explanation: 'Pintu yang dimaksud sudah jelas bagi kedua pihak, jadi memakai the.', options: [{ text: 'a' }, { text: 'an' }, { text: 'the', ok: true }] },
      { type: 'FILL_BLANK', level: 'A1', prompt: 'He is ___ honest man. (a / an)', explanation: 'Honest dibaca tanpa bunyi h, jadi bunyi awalnya vokal: an.', accepted: ['an'] },
      { type: 'FILL_BLANK', level: 'A2', prompt: 'I saw ___ university student. (a / an)', explanation: 'University diawali bunyi y (konsonan), jadi memakai a.', accepted: ['a'] },
    ],
  },
  {
    slug: 'simple-past',
    title: 'Simple Past',
    description: 'Kejadian yang sudah selesai di masa lalu.',
    level: 'A2',
    lesson: {
      title: 'Aturan Simple Past',
      summary:
        'Simple past dipakai untuk kejadian yang sudah selesai di masa lalu. Kata kerja beraturan ditambah -ed (watch jadi watched). Kata kerja tak beraturan berubah bentuk (go jadi went, buy jadi bought). Negatif: did not + kata kerja dasar. Pertanyaan: Did + subjek + kata kerja dasar.',
      examples: 'I went to the market yesterday. | She did not know the answer. | Did they finish the work?',
    },
    questions: [
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'I ___ to the market yesterday.', explanation: 'Go adalah kata kerja tak beraturan. Bentuk lampaunya went.', options: [{ text: 'go' }, { text: 'went', ok: true }, { text: 'gone' }, { text: 'going' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'She did not ___ the answer.', explanation: 'Setelah did not, kata kerja memakai bentuk dasar: know.', options: [{ text: 'know', ok: true }, { text: 'knew' }, { text: 'known' }, { text: 'knows' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: '___ they finish the work last night?', explanation: 'Pertanyaan simple past memakai Did.', options: [{ text: 'Did', ok: true }, { text: 'Do' }, { text: 'Does' }, { text: 'Were' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'We ___ a movie last weekend.', explanation: 'Watch adalah kata kerja beraturan. Bentuk lampaunya watched.', options: [{ text: 'watch' }, { text: 'watched', ok: true }, { text: 'watching' }, { text: 'watches' }] },
      { type: 'FILL_BLANK', level: 'A2', prompt: 'He ___ (buy) a new phone last month.', explanation: 'Buy adalah kata kerja tak beraturan. Bentuk lampaunya bought.', accepted: ['bought'] },
      { type: 'FILL_BLANK', level: 'A2', prompt: 'They ___ (study) hard for the test yesterday.', explanation: 'Study berakhiran konsonan + y, jadi y berubah menjadi -ied: studied.', accepted: ['studied'] },
    ],
  },
  {
    slug: 'modal-verbs',
    title: 'Modal Verbs (can, should, must)',
    description: 'Kemampuan, saran, dan kewajiban.',
    level: 'A2',
    lesson: {
      title: 'Aturan Modal Verbs',
      summary:
        'Modal verb diikuti kata kerja bentuk dasar, tanpa -s dan tanpa to. Can berarti bisa (kemampuan). Should berarti sebaiknya (saran). Must berarti harus (kewajiban kuat). Bentuk lampau can adalah could.',
      examples: 'She can play the piano. | You should drink more water. | Students must wear uniforms.',
    },
    questions: [
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'She can ___ the piano.', explanation: 'Setelah can, kata kerja memakai bentuk dasar: play.', options: [{ text: 'play', ok: true }, { text: 'plays' }, { text: 'playing' }, { text: 'to play' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'You ___ see a doctor if you feel sick.', explanation: 'Should dipakai untuk memberi saran.', options: [{ text: 'should', ok: true }, { text: 'are' }, { text: 'is' }, { text: 'does' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'He cannot ___ English well.', explanation: 'Setelah cannot, kata kerja memakai bentuk dasar: speak.', options: [{ text: 'speak', ok: true }, { text: 'speaks' }, { text: 'speaking' }, { text: 'spoken' }] },
      { type: 'MULTIPLE_CHOICE', level: 'A2', prompt: 'Students ___ wear uniforms. It is a rule.', explanation: 'Aturan yang wajib dipatuhi memakai must.', options: [{ text: 'must', ok: true }, { text: 'might' }, { text: 'can' }, { text: 'would' }] },
      { type: 'FILL_BLANK', level: 'A2', prompt: 'You should ___ (drink) more water.', explanation: 'Setelah should, kata kerja memakai bentuk dasar: drink.', accepted: ['drink'] },
      { type: 'FILL_BLANK', level: 'A2', prompt: 'I ___ swim when I was five. (can / could)', explanation: 'Kejadiannya di masa lalu, jadi memakai could.', accepted: ['could'] },
    ],
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  let made = 0;
  let skipped = 0;

  for (const [i, t] of TOPICS.entries()) {
    const exists = await prisma.grammarTopic.findUnique({ where: { slug: t.slug } });
    if (exists) {
      skipped++;
      console.log(`Dilewati (sudah ada): ${t.slug}`);
      continue;
    }
    await prisma.grammarTopic.create({
      data: {
        slug: t.slug,
        title: t.title,
        description: t.description,
        level: t.level,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        lessons: {
          create: [{ title: t.lesson.title, summary: t.lesson.summary, examples: t.lesson.examples, sortOrder: 1 }],
        },
        questions: {
          create: t.questions.map((q, n) => ({
            type: q.type,
            level: q.level,
            prompt: q.prompt,
            explanation: q.explanation,
            status: 'PUBLISHED',
            sortOrder: n + 1,
            acceptedAnswers: q.accepted ?? [],
            options: q.options
              ? { create: q.options.map((o, k) => ({ text: o.text, isCorrect: o.ok === true, sortOrder: k + 1 })) }
              : undefined,
          })),
        },
      },
    });
    made++;
    console.log(`Dibuat: ${t.slug} (${t.questions.length} soal)`);
  }

  console.log(`Selesai. Topik baru: ${made}, dilewati: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
