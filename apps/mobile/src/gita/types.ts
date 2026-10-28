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

/** The Gita as the app reads it, from the copy that ships inside the app. */
export type GitaSource = {
  verse(chapter: number, verse: number): Promise<Verse | null>;
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
