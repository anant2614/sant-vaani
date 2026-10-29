import type { UploadsPage, YouTubeVideo } from '../_shared/core/index.ts';

/**
 * A channel seen for the first time brings in its 200 latest talks; older
 * ones can be added by link in the studio. Each page costs 1 quota unit.
 */
export const MAX_PAGES = 4;

/**
 * Video ids from a channel's uploads list (newest first) that are not in the
 * studio yet. Reading stops once a whole page is already known, which
 * tolerates the list's occasional reordering around premieres.
 */
export async function collectNewUploads(
  listPage: (pageToken?: string) => Promise<UploadsPage>,
  knownAmong: (ids: string[]) => Promise<Set<string>>,
  maxPages = MAX_PAGES,
): Promise<string[]> {
  const fresh: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const { videoIds, nextPageToken } = await listPage(pageToken);
    const known = await knownAmong(videoIds);
    const unseen = videoIds.filter((id) => !known.has(id));
    fresh.push(...unseen);
    if (unseen.length === 0 || !nextPageToken) break;
    pageToken = nextPageToken;
  }
  return fresh;
}

/**
 * Uploads the app could play now. A live stream that has not aired yet has
 * no length; it and the others are seen again on a later night.
 */
export function usableUploads(videos: YouTubeVideo[]): YouTubeVideo[] {
  return videos.filter((v) => v.durationSeconds > 0 && v.embeddable && v.privacyStatus !== 'private');
}
