import { assertEquals } from '@std/assert';
import type { YouTubeVideo } from '../_shared/core/index.ts';
import { planClipChecks, videosToCheck, type StoredVideo } from '../check-clips/plan.ts';

const NOW = new Date('2026-10-28T20:30:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const found = (youtubeId: string, patch: Partial<YouTubeVideo> = {}): YouTubeVideo => ({
  youtubeId,
  channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
  title: `Talk ${youtubeId}`,
  description: 'Updated description',
  publishedAt: '2026-09-01T05:00:00Z',
  durationSeconds: 1800,
  embeddable: true,
  privacyStatus: 'public',
  chapters: [],
  ...patch,
});

Deno.test('refreshes videos older than 25 days', () => {
  const video = (id: string, days: number, clips: StoredVideo['clips'], privacy: StoredVideo['privacy_status'] = 'public') => ({
    id,
    youtube_id: id.padEnd(11, 'x'),
    fetched_at: daysAgo(days),
    privacy_status: privacy,
    clips,
  });
  const videos = [
    video('fresh', 3, []),
    video('stale', 26, [{ id: 'c-draft', status: 'draft' }]),
    video('live', 1, [{ id: 'c-live', status: 'approved' }]),
    video('retired', 2, [{ id: 'c-old', status: 'retired' }]),
    video('gone', 40, [{ id: 'c-gone', status: 'retired' }], 'gone'),
  ];
  assertEquals(
    videosToCheck(videos, NOW).map((v) => v.id),
    ['stale', 'live'],
    'videos with a live clip are checked every day, the rest once their data is 25 days old',
  );
});

Deno.test('retires clips whose video went private, was deleted or stopped embedding', () => {
  const approved = (id: string) => [
    { id, status: 'approved' as const },
    { id: `${id}-draft`, status: 'draft' as const },
  ];
  const videos = [
    { id: 'v-fine', youtubeId: 'aaaaaaaaaaa', clips: approved('c-fine') },
    { id: 'v-private', youtubeId: 'bbbbbbbbbbb', clips: approved('c-private') },
    { id: 'v-gone', youtubeId: 'ccccccccccc', clips: approved('c-gone') },
    { id: 'v-no-embed', youtubeId: 'ddddddddddd', clips: approved('c-no-embed') },
  ];
  const plan = planClipChecks(
    videos,
    [found('aaaaaaaaaaa'), found('bbbbbbbbbbb', { privacyStatus: 'private' }), found('ddddddddddd', { embeddable: false })],
    NOW,
  );

  assertEquals(plan.retire, [
    { clipId: 'c-private', reason: 'The video was made private on YouTube.' },
    { clipId: 'c-gone', reason: 'The video was removed from YouTube or made private.' },
    { clipId: 'c-no-embed', reason: 'The video no longer allows embedding.' },
  ]);

  assertEquals(plan.missing, 1);
  const byId = new Map(plan.refresh.map((r) => [r.id, r.columns]));
  assertEquals(byId.get('v-fine')?.description, 'Updated description');
  assertEquals(byId.get('v-fine')?.fetched_at, NOW.toISOString());
  assertEquals(byId.get('v-no-embed')?.embeddable, false);
  // Data that can no longer be refreshed is deleted rather than kept.
  assertEquals(byId.get('v-gone'), {
    privacy_status: 'gone',
    title: '',
    description: '',
    chapters: [],
    suggestions: [],
    fetched_at: NOW.toISOString(),
  });
});
