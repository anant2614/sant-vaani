export type Verse = {
  chapter: number;
  verse: number;
  /** Who speaks the verse, in Devanagari, where the text names them. */
  speaker: string | null;
  sanskrit: string;
  transliteration: string;
  /** Meanings are still being written, so either may be missing. */
  meaningEn: string | null;
  meaningHi: string | null;
};

export type Chapter = {
  number: number;
  /** The chapter's name in Sanskrit, in Devanagari. */
  nameSa: string;
  nameIast: string;
  nameEn: string;
  verseCount: number;
};

/** The Gita as the app reads it, from the copy that ships inside the app. */
export type GitaSource = {
  /** All 18 chapters, in order. */
  chapters(): Promise<Chapter[]>;
  /** A chapter's verses in order, or none for a chapter that does not exist. */
  verses(chapter: number): Promise<Verse[]>;
  verse(chapter: number, verse: number): Promise<Verse | null>;
};

/** One row of the chapters table in gita.db and gita.json. */
export type ChapterRow = {
  number: number;
  name_sa: string;
  name_iast: string;
  name_en: string;
  verse_count: number;
};

/** One row of the verses table in gita.db and gita.json. */
export type VerseRow = {
  chapter: number;
  verse: number;
  speaker_sa: string | null;
  sanskrit: string;
  transliteration: string;
  meaning_en: string | null;
  meaning_hi: string | null;
};

export function toVerse(row: VerseRow): Verse {
  return {
    chapter: row.chapter,
    verse: row.verse,
    speaker: row.speaker_sa,
    sanskrit: row.sanskrit,
    transliteration: row.transliteration,
    meaningEn: row.meaning_en,
    meaningHi: row.meaning_hi,
  };
}

export function toChapter(row: ChapterRow): Chapter {
  return {
    number: row.number,
    nameSa: row.name_sa,
    nameIast: row.name_iast,
    nameEn: row.name_en,
    verseCount: row.verse_count,
  };
}
