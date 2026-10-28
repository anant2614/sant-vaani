import { jsonGita, type GitaJson } from './queries';
import type { GitaSource } from './types';

/**
 * The web preview reads the JSON copy of the Gita, because SQLite in the
 * browser needs cross-origin isolation, which would block YouTube's player.
 */
export async function openGita(): Promise<GitaSource> {
  return jsonGita(require('../../assets/db/gita.json') as GitaJson);
}
