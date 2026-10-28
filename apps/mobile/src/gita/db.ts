import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { toVerse, type GitaSource, type VerseRow } from './types';

/**
 * Opens the Gita that ships inside the app. The file is small, so it is
 * read into memory: nothing to copy, and an app update brings its new
 * text with no migration.
 */
export async function openGita(): Promise<GitaSource> {
  const [asset] = await Asset.loadAsync(require('../../assets/db/gita.db'));
  if (!asset?.localUri) throw new Error('The bundled Gita database could not be found.');
  const db = await deserializeDatabaseAsync(await new File(asset.localUri).bytes());
  return sqliteGita(db);
}

const VERSE_COLUMNS = 'chapter, verse, speaker_sa, sanskrit, transliteration, meaning_en, meaning_hi';

export function sqliteGita(db: SQLiteDatabase): GitaSource {
  return {
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
