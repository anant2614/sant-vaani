import { describe, expect, it } from 'vitest';
import { createYouTubeClient, videoColumns, YouTubeApiError } from '../src/index.ts';

type Call = { path: string; params: URLSearchParams };

function fakeFetch(responses: Record<string, unknown>, calls: Call[] = []) {
  return async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push({ path: url.pathname, params: url.searchParams });
    const key = url.pathname.split('/').pop() as string;
    const body = responses[key];
    if (body === undefined) return new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 403 });
    return new Response(JSON.stringify(body), { status: 200 });
  };
}

const channelBody = {
  items: [
    {
      id: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      snippet: { title: 'Sample Channel', customUrl: '@samplechannel' },
      contentDetails: { relatedPlaylists: { uploads: 'UUaaaaaaaaaaaaaaaaaaaaaa' } },
    },
  ],
};

describe('createYouTubeClient', () => {
  it('looks a channel up by handle', async () => {
    const calls: Call[] = [];
    const yt = createYouTubeClient('KEY', fakeFetch({ channels: channelBody }, calls));
    const channel = await yt.getChannel({ kind: 'handle', value: '@samplechannel' });
    expect(channel).toEqual({
      channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      title: 'Sample Channel',
      handle: '@samplechannel',
      uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(calls[0]?.params.get('forHandle')).toBe('@samplechannel');
    expect(calls[0]?.params.get('key')).toBe('KEY');
  });

  it('returns null for an unknown channel', async () => {
    const yt = createYouTubeClient('KEY', fakeFetch({ channels: { items: [] } }));
    expect(await yt.getChannel({ kind: 'id', value: 'UCbbbbbbbbbbbbbbbbbbbbbb' })).toBeNull();
  });

  it('lists a page of uploads', async () => {
    const yt = createYouTubeClient(
      'KEY',
      fakeFetch({
        playlistItems: {
          nextPageToken: 'next',
          items: [{ contentDetails: { videoId: 'aaaaaaaaaaa' } }, { contentDetails: { videoId: 'bbbbbbbbbbb' } }],
        },
      }),
    );
    expect(await yt.listUploads('UUaaaaaaaaaaaaaaaaaaaaaa')).toEqual({
      videoIds: ['aaaaaaaaaaa', 'bbbbbbbbbbb'],
      nextPageToken: 'next',
    });
  });

  it('reads video details and chapters, 50 ids per call', async () => {
    const calls: Call[] = [];
    const video = {
      id: 'aaaaaaaaaaa',
      snippet: {
        channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
        title: 'Satsang',
        description: '0:00 Intro\n2:41 Why the mind races\n10:05 Naam jap',
        publishedAt: '2026-10-01T05:00:00Z',
      },
      contentDetails: { duration: 'PT12M3S' },
      status: { embeddable: true, privacyStatus: 'public' },
    };
    const yt = createYouTubeClient('KEY', fakeFetch({ videos: { items: [video] } }, calls));
    const ids = Array.from({ length: 60 }, (_, i) => `v${String(i).padStart(10, '0')}`);
    const [first] = await yt.getVideos(ids);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.params.get('id')?.split(',')).toHaveLength(50);
    expect(first).toMatchObject({
      youtubeId: 'aaaaaaaaaaa',
      channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      durationSeconds: 723,
      embeddable: true,
      privacyStatus: 'public',
      chapters: [
        { start: 0, title: 'Intro' },
        { start: 161, title: 'Why the mind races' },
        { start: 605, title: 'Naam jap' },
      ],
    });
  });

  it('raises a YouTubeApiError on a failed call', async () => {
    const yt = createYouTubeClient('KEY', fakeFetch({}));
    await expect(yt.listUploads('UUaaaaaaaaaaaaaaaaaaaaaa')).rejects.toBeInstanceOf(YouTubeApiError);
  });
});

describe('videoColumns', () => {
  it('maps every YouTube-owned field to its column, with the time it was read', () => {
    const columns = videoColumns(
      {
        youtubeId: 'aaaaaaaaaaa',
        channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
        title: 'Satsang',
        description: 'About the mind',
        publishedAt: '2026-10-01T05:00:00Z',
        durationSeconds: 723,
        embeddable: true,
        privacyStatus: 'unlisted',
        chapters: [],
      },
      new Date('2026-10-28T20:00:00Z'),
    );
    expect(columns).toEqual({
      title: 'Satsang',
      description: 'About the mind',
      published_at: '2026-10-01T05:00:00Z',
      duration_seconds: 723,
      chapters: [],
      embeddable: true,
      privacy_status: 'unlisted',
      fetched_at: '2026-10-28T20:00:00.000Z',
    });
  });
});
