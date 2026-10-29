import { assertEquals } from '@std/assert';
import type { UploadsPage } from '../_shared/core/index.ts';
import { collectNewUploads, usableUploads } from '../fetch-uploads/uploads.ts';

/** An uploads list served page by page, newest first. */
function pages(...lists: string[][]) {
  const calls: (string | undefined)[] = [];
  const listPage = (token?: string): Promise<UploadsPage> => {
    calls.push(token);
    const index = token ? Number(token) : 0;
    const next = index + 1 < lists.length ? String(index + 1) : null;
    return Promise.resolve({ videoIds: lists[index] ?? [], nextPageToken: next });
  };
  return { listPage, calls };
}

const knownOf = (known: string[]) => (ids: string[]) => Promise.resolve(new Set(ids.filter((id) => known.includes(id))));

Deno.test('collects new uploads and stops once a whole page is already known', async () => {
  const uploads = pages(['v9', 'v8', 'v7'], ['v6', 'v5', 'v4'], ['v3', 'v2', 'v1'], ['v0']);
  const fresh = await collectNewUploads(uploads.listPage, knownOf(['v5', 'v4', 'v3', 'v2', 'v1', 'v0']));
  assertEquals(fresh, ['v9', 'v8', 'v7', 'v6']);
  assertEquals(uploads.calls.length, 3, 'the third page was all known, so the fourth is never read');
});

Deno.test('reads at most four pages for a channel seen for the first time', async () => {
  const uploads = pages(...Array.from({ length: 10 }, (_, i) => [`p${i}a`, `p${i}b`]));
  const fresh = await collectNewUploads(uploads.listPage, knownOf([]));
  assertEquals(uploads.calls.length, 4);
  assertEquals(fresh.length, 8);
});

Deno.test('keeps only uploads the app could play', () => {
  const base = {
    channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
    title: 'Satsang',
    description: '',
    publishedAt: null,
    chapters: [],
  };
  const videos = [
    { ...base, youtubeId: 'aaaaaaaaaaa', durationSeconds: 1800, embeddable: true, privacyStatus: 'public' as const },
    { ...base, youtubeId: 'bbbbbbbbbbb', durationSeconds: 0, embeddable: true, privacyStatus: 'public' as const },
    { ...base, youtubeId: 'ccccccccccc', durationSeconds: 900, embeddable: false, privacyStatus: 'public' as const },
    { ...base, youtubeId: 'ddddddddddd', durationSeconds: 900, embeddable: true, privacyStatus: 'private' as const },
    { ...base, youtubeId: 'eeeeeeeeeee', durationSeconds: 600, embeddable: true, privacyStatus: 'unlisted' as const },
  ];
  assertEquals(
    usableUploads(videos).map((v) => v.youtubeId),
    ['aaaaaaaaaaa', 'eeeeeeeeeee'],
    'a live stream that has not aired, a video that cannot be embedded and a private one wait for another night',
  );
});
