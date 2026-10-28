import { toVerse, type GitaSource, type VerseRow } from './types';

type GitaJson = { version: number; verses: VerseRow[] };

/**
 * The web preview reads the JSON copy of the Gita, because SQLite in the
 * browser needs cross-origin isolation, which would block YouTube's player.
 */
export async function openGita(): Promise<GitaSource> {
  const data = require('../../assets/db/gita.json') as GitaJson;
  const byRef = new Map(data.verses.map((row) => [`${row.chapter}.${row.verse}`, row]));
  return {
    async verse(chapter, verse) {
      const row = byRef.get(`${chapter}.${verse}`);
      return row ? toVerse(row) : null;
    },
  };
}
