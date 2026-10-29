import { videoColumns, type YouTubeVideo } from '../_shared/core/index.ts';

/** YouTube data may be kept 30 days without a refresh; refresh well before. */
export const REFRESH_AFTER_DAYS = 25;
const DAY_MS = 86_400_000;

type ClipStatus = 'draft' | 'needs_second_review' | 'approved' | 'retired';

export type StoredVideo = {
  id: string;
  youtube_id: string;
  fetched_at: string;
  privacy_status: 'public' | 'unlisted' | 'private' | 'gone';
  clips: { id: string; status: ClipStatus }[];
};

export type CheckedVideo = { id: string; youtubeId: string; clips: { id: string; status: ClipStatus }[] };

/**
 * Videos with an approved clip are checked every night; the rest once their
 * data is 25 days old. A video already gone from YouTube has nothing left
 * to refresh.
 */
export function videosToCheck(videos: StoredVideo[], now: Date): CheckedVideo[] {
  const staleBefore = now.getTime() - REFRESH_AFTER_DAYS * DAY_MS;
  return videos
    .filter(
      (v) =>
        v.clips.some((c) => c.status === 'approved') ||
        (v.privacy_status !== 'gone' && Date.parse(v.fetched_at) < staleBefore),
    )
    .map((v) => ({ id: v.id, youtubeId: v.youtube_id, clips: v.clips }));
}

export type VideoRefresh = { id: string; columns: Record<string, unknown> };

export type ClipCheckPlan = {
  retire: { clipId: string; reason: string }[];
  refresh: VideoRefresh[];
  /** Videos YouTube did not return. */
  missing: number;
};

/**
 * What the nightly check changes, given what YouTube says now. An API key
 * cannot see private videos, so a video YouTube no longer returns may be
 * private or deleted; either way its stored text is deleted, because it can
 * no longer be refreshed.
 */
export function planClipChecks(videos: CheckedVideo[], found: YouTubeVideo[], now: Date): ClipCheckPlan {
  const byYoutubeId = new Map(found.map((v) => [v.youtubeId, v]));
  const plan: ClipCheckPlan = { retire: [], refresh: [], missing: 0 };

  for (const video of videos) {
    const current = byYoutubeId.get(video.youtubeId);
    let reason: string | null = null;
    if (!current) {
      plan.missing++;
      reason = 'The video was removed from YouTube or made private.';
      plan.refresh.push({
        id: video.id,
        columns: {
          privacy_status: 'gone',
          title: '',
          description: '',
          chapters: [],
          suggestions: [],
          fetched_at: now.toISOString(),
        },
      });
    } else {
      if (current.privacyStatus === 'private') reason = 'The video was made private on YouTube.';
      else if (!current.embeddable) reason = 'The video no longer allows embedding.';
      plan.refresh.push({ id: video.id, columns: videoColumns(current, now) });
    }
    if (reason) {
      for (const clip of video.clips) {
        if (clip.status === 'approved') plan.retire.push({ clipId: clip.id, reason });
      }
    }
  }
  return plan;
}
