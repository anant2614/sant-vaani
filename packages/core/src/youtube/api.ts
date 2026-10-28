import { parseIsoDuration } from '../text/time.ts';
import { parseChapters, type ChannelRef, type Chapter } from '../text/youtube.ts';

/**
 * A small YouTube Data API v3 client for the studio and the nightly jobs.
 * Every call here costs 1 quota unit.
 */

const API = 'https://www.googleapis.com/youtube/v3';
const MAX_IDS = 50;

export class YouTubeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

export type YouTubeChannel = {
  channelId: string;
  title: string;
  handle: string | null;
  uploadsPlaylistId: string;
};

export type YouTubeVideo = {
  youtubeId: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  durationSeconds: number;
  embeddable: boolean;
  privacyStatus: 'public' | 'unlisted' | 'private';
  chapters: Chapter[];
};

export type UploadsPage = { videoIds: string[]; nextPageToken: string | null };

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

// The API's JSON, reduced to the fields we read.
type ChannelItem = {
  id: string;
  snippet?: { title?: string; customUrl?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};
type VideoItem = {
  id: string;
  snippet?: { channelId?: string; title?: string; description?: string; publishedAt?: string };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
};

export function createYouTubeClient(apiKey: string, fetchImpl: Fetch = fetch) {
  async function get<T>(resource: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${API}/${resource}`);
    for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
    const response = await fetchImpl(url.toString());
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new YouTubeApiError(response.status, body?.error?.message ?? `YouTube ${resource} failed`);
    }
    return (await response.json()) as T;
  }

  return {
    async getChannel(ref: ChannelRef): Promise<YouTubeChannel | null> {
      const params: Record<string, string> = { part: 'snippet,contentDetails' };
      if (ref.kind === 'id') params.id = ref.value;
      else params.forHandle = ref.value;
      const { items = [] } = await get<{ items?: ChannelItem[] }>('channels', params);
      const item = items[0];
      const uploads = item?.contentDetails?.relatedPlaylists?.uploads;
      if (!item || !uploads) return null;
      return {
        channelId: item.id,
        title: item.snippet?.title ?? '',
        handle: item.snippet?.customUrl ?? null,
        uploadsPlaylistId: uploads,
      };
    },

    async listUploads(playlistId: string, pageToken?: string): Promise<UploadsPage> {
      const params: Record<string, string> = { part: 'contentDetails', playlistId, maxResults: String(MAX_IDS) };
      if (pageToken) params.pageToken = pageToken;
      const body = await get<{ items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string }>(
        'playlistItems',
        params,
      );
      return {
        videoIds: (body.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => Boolean(id)),
        nextPageToken: body.nextPageToken ?? null,
      };
    },

    /** Details for up to any number of ids; ids YouTube no longer knows are left out. */
    async getVideos(ids: string[]): Promise<YouTubeVideo[]> {
      const videos: YouTubeVideo[] = [];
      for (let i = 0; i < ids.length; i += MAX_IDS) {
        const chunk = ids.slice(i, i + MAX_IDS);
        const { items = [] } = await get<{ items?: VideoItem[] }>('videos', {
          part: 'snippet,contentDetails,status',
          id: chunk.join(','),
          maxResults: String(MAX_IDS),
        });
        for (const item of items) {
          const description = item.snippet?.description ?? '';
          const privacy = item.status?.privacyStatus;
          videos.push({
            youtubeId: item.id,
            channelId: item.snippet?.channelId ?? '',
            title: item.snippet?.title ?? '',
            description,
            publishedAt: item.snippet?.publishedAt ?? null,
            durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? ''),
            embeddable: item.status?.embeddable ?? false,
            privacyStatus: privacy === 'public' || privacy === 'unlisted' ? privacy : 'private',
            chapters: parseChapters(description),
          });
        }
      }
      return videos;
    },
  };
}

export type YouTubeClient = ReturnType<typeof createYouTubeClient>;
