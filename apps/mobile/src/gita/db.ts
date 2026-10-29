import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { deserializeDatabaseAsync } from 'expo-sqlite';

import { sqliteGita } from './queries';
import type { GitaSource } from './types';

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
