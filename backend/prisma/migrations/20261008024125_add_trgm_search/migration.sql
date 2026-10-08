-- CreateIndex
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "DictionaryEntry_lemma_trgm_idx" ON "DictionaryEntry" USING GIN ("headword" gin_trgm_ops);
