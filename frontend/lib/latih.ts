// Bentuk data dari backend untuk kategori dan kalimat latihan.
export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  targetCount: number;
  sentenceCount: number;
};

export type SentenceItem = {
  id: string;
  textEn: string;
  textId: string;
  phoneticIpa: string | null;
  phoneticEasy: string | null;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  notes: string | null;
  tags: string[];
};

export type SentencePage = {
  category: { id: string; slug: string; name: string };
  items: SentenceItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SentenceDetail = Omit<SentenceItem, "tags"> & {
  category: { id: string; slug: string; name: string };
  tags: string[];
};
