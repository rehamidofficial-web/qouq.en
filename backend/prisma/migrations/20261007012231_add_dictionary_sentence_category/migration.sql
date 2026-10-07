-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION', 'DETERMINER', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('SYNONYM', 'ANTONYM');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "id" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "phoneticIpa" TEXT,
    "phoneticEasy" TEXT,
    "level" "Level",
    "forms" JSONB,
    "source" TEXT,
    "license" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DictionaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionarySense" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "partOfSpeech" "PartOfSpeech" NOT NULL,
    "meaningId" TEXT NOT NULL,
    "definitionEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DictionarySense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryExample" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DictionaryExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordRelation" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "relatedEntryId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,

    CONSTRAINT "WordRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sentence" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textId" TEXT NOT NULL,
    "phoneticIpa" TEXT,
    "phoneticEasy" TEXT,
    "level" "Level" NOT NULL DEFAULT 'A1',
    "notes" TEXT,
    "source" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceTag" (
    "sentenceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SentenceTag_pkey" PRIMARY KEY ("sentenceId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryEntry_headword_key" ON "DictionaryEntry"("headword");

-- CreateIndex
CREATE INDEX "DictionarySense_entryId_idx" ON "DictionarySense"("entryId");

-- CreateIndex
CREATE INDEX "DictionaryExample_senseId_idx" ON "DictionaryExample"("senseId");

-- CreateIndex
CREATE INDEX "WordRelation_relatedEntryId_idx" ON "WordRelation"("relatedEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "WordRelation_entryId_relatedEntryId_type_key" ON "WordRelation"("entryId", "relatedEntryId", "type");

-- CreateIndex
CREATE INDEX "Sentence_categoryId_level_idx" ON "Sentence"("categoryId", "level");

-- CreateIndex
CREATE INDEX "Sentence_status_idx" ON "Sentence"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Sentence_categoryId_textEn_key" ON "Sentence"("categoryId", "textEn");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- AddForeignKey
ALTER TABLE "DictionarySense" ADD CONSTRAINT "DictionarySense_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DictionaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DictionaryExample" ADD CONSTRAINT "DictionaryExample_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "DictionarySense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DictionaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_relatedEntryId_fkey" FOREIGN KEY ("relatedEntryId") REFERENCES "DictionaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceTag" ADD CONSTRAINT "SentenceTag_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceTag" ADD CONSTRAINT "SentenceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
