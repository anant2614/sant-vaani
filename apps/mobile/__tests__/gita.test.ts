/// <reference types="node" />
// This test opens the bundled gita.db with Node's own SQLite.
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

import { jsonGita, sqliteGita, type GitaDatabase, type GitaJson } from '@/gita/queries';
import { neighbours, verseRefFrom } from '@/gita/reader';
import type { GitaSource } from '@/gita/types';

/** The bundled gita.db opened with Node's SQLite, behind the calls the app makes to expo-sqlite. */
function bundledDatabase(): GitaDatabase {
  const db = new DatabaseSync(join(__dirname, '../assets/db/gita.db'), { readOnly: true });
  return {
    getAllAsync: async (sql: string, ...params: (string | number)[]) => db.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, ...params: (string | number)[]) => db.prepare(sql).get(...params) ?? null,
  } as GitaDatabase;
}

const sources: [string, () => GitaSource][] = [
  ['on phones (SQLite)', () => sqliteGita(bundledDatabase())],
  ['on the web (JSON)', () => jsonGita(require('../assets/db/gita.json') as GitaJson)],
];

describe.each(sources)('the Gita %s', (_, open) => {
  test('chapter 2 lists 72 verses', async () => {
    const verses = await open().verses(2);

    expect(verses).toHaveLength(72);
    expect(verses.map((v) => v.verse)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
    expect(verses[46]).toMatchObject({ chapter: 2, verse: 47, transliteration: expect.stringContaining('karmaṇy') });
  });

  test('lists 18 chapters and 700 verses in order', async () => {
    const chapters = await open().chapters();

    expect(chapters.map((c) => c.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(chapters[1]).toMatchObject({ number: 2, nameSa: 'सांख्ययोग', verseCount: 72 });
    expect(chapters.reduce((sum, c) => sum + c.verseCount, 0)).toBe(700);
  });

  test('finds one verse, and nothing for a verse that does not exist', async () => {
    const gita = open();

    expect(await gita.verse(18, 78)).toMatchObject({ chapter: 18, verse: 78 });
    expect(await gita.verse(2, 73)).toBeNull();
    expect(await gita.verses(19)).toEqual([]);
  });
});

describe('moving through the reader', () => {
  const chapters = [
    { number: 1, nameSa: '', nameIast: '', nameEn: '', verseCount: 47 },
    { number: 2, nameSa: '', nameIast: '', nameEn: '', verseCount: 72 },
    { number: 3, nameSa: '', nameIast: '', nameEn: '', verseCount: 43 },
  ];

  test('runs on across chapter breaks and stops at either end', () => {
    expect(neighbours(chapters, { chapter: 2, verse: 47 })).toEqual({
      previous: { chapter: 2, verse: 46 },
      next: { chapter: 2, verse: 48 },
    });
    expect(neighbours(chapters, { chapter: 2, verse: 72 }).next).toEqual({ chapter: 3, verse: 1 });
    expect(neighbours(chapters, { chapter: 3, verse: 1 }).previous).toEqual({ chapter: 2, verse: 72 });
    expect(neighbours(chapters, { chapter: 1, verse: 1 }).previous).toBeNull();
    expect(neighbours(chapters, { chapter: 3, verse: 43 }).next).toBeNull();
  });

  test('reads only whole verse numbers from a link', () => {
    expect(verseRefFrom('2', '47')).toEqual({ chapter: 2, verse: 47 });
    expect(verseRefFrom('2', '4.7')).toBeNull();
    expect(verseRefFrom('0', '1')).toBeNull();
    expect(verseRefFrom('two', undefined)).toBeNull();
  });
});
