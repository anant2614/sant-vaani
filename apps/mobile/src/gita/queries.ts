import type { SQLiteDatabase } from 'expo-sqlite';

import { toChapter, toVerse, type ChapterRow, type GitaSource, type VerseRow } from './types';

/** The calls the reader makes on expo-sqlite's database. */
export type GitaDatabase = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync'>;

const CHAPTER_COLUMNS = 'number, name_sa, name_iast, name_en, verse_count';
const VERSE_COLUMNS = 'chapter, verse, speaker_sa, sanskrit, transliteration, meaning_en, meaning_hi';

export function sqliteGita(db: GitaDatabase): GitaSource {
  return {
    async chapters() {
      const rows = await db.getAllAsync<ChapterRow>(`select ${CHAPTER_COLUMNS} from chapters order by number`);
      return rows.map(toChapter);
    },
    async verses(chapter) {
      const rows = await db.getAllAsync<VerseRow>(
        `select ${VERSE_COLUMNS} from verses where chapter = ? order by verse`,
        chapter,
      );
      return rows.map(toVerse);
    },
    async verse(chapter, verse) {
      const row = await db.getFirstAsync<VerseRow>(
        `select ${VERSE_COLUMNS} from verses where chapter = ? and verse = ?`,
        chapter,
        verse,
      );
      return row ? toVerse(row) : null;
    },
  };
}

/** gita.json, written next to gita.db by scripts/gita/build.mjs. */
export type GitaJson = { version: number; chapters: ChapterRow[]; verses: VerseRow[] };

export function jsonGita(data: GitaJson): GitaSource {
  const chapters = [...data.chapters].sort((a, b) => a.number - b.number).map(toChapter);
  const byChapter = new Map<number, VerseRow[]>();
  for (const row of data.verses) byChapter.set(row.chapter, [...(byChapter.get(row.chapter) ?? []), row]);
  for (const rows of byChapter.values()) rows.sort((a, b) => a.verse - b.verse);

  return {
    async chapters() {
      return chapters;
    },
    async verses(chapter) {
      return (byChapter.get(chapter) ?? []).map(toVerse);
    },
    async verse(chapter, verse) {
      const row = byChapter.get(chapter)?.find((r) => r.verse === verse);
      return row ? toVerse(row) : null;
    },
  };
}
