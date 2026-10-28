'use server';

import { parseYouTubeVideoId, YouTubeApiError } from '@sant-vaani/core';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { row } from '@/lib/db';
import { friendlyError } from '@/lib/errors';
import type { VideoStatus } from '@/lib/types';
import { youtube } from '@/lib/youtube';

/** Words for a failed YouTube call, including a missing API key. */
function youtubeProblem(error: unknown): string {
  if (error instanceof YouTubeApiError) return `YouTube refused the request: ${error.message}`;
  return error instanceof Error ? error.message : 'YouTube did not answer. Try again.';
}

/** Adds one video from a channel in the studio, for talks the nightly fetch has not reached. */
export async function addVideo(_state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const youtubeId = parseYouTubeVideoId(String(data.get('url') ?? ''));
  if (!youtubeId) return { error: 'Paste a YouTube video link.' };

  const existing = row<{ id: string }>(
    await supabase.from('videos').select('id').eq('youtube_id', youtubeId).maybeSingle(),
  );
  if (existing) redirect(`/videos/${existing.id}`);

  let video;
  try {
    [video] = await youtube().getVideos([youtubeId]);
  } catch (error) {
    return { error: youtubeProblem(error) };
  }
  if (!video) return { error: 'YouTube has no video at that link.' };

  const channel = row<{ id: string }>(
    await supabase.from('channels').select('id').eq('youtube_channel_id', video.channelId).maybeSingle(),
  );
  if (!channel) return { error: 'That video is not from a channel in the studio. Add the official channel first.' };
  if (!video.embeddable) return { error: 'That video does not allow embedding, so the app cannot play it.' };
  if (video.privacyStatus === 'private') return { error: 'That video is private.' };

  const { data: inserted, error } = await supabase
    .from('videos')
    .insert({
      channel_id: channel.id,
      youtube_id: video.youtubeId,
      title: video.title,
      description: video.description,
      published_at: video.publishedAt,
      duration_seconds: video.durationSeconds,
      chapters: video.chapters,
      embeddable: video.embeddable,
      privacy_status: video.privacyStatus,
      fetched_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) return { error: friendlyError(error.message) };
  redirect(`/videos/${inserted.id}`);
}

const STATUSES: VideoStatus[] = ['new', 'suggested', 'done', 'ignored'];

/** Marks a video done, ignored, or back in the inbox. */
export async function setVideoStatus(videoId: string, status: VideoStatus, _state: ActionState): Promise<ActionState> {
  const { supabase } = await requireStaff();
  if (!STATUSES.includes(status)) return { error: 'Unknown status.' };
  const { error } = await supabase.from('videos').update({ status }).eq('id', videoId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: status === 'ignored' ? 'Ignored.' : status === 'done' ? 'Marked done.' : 'Back in the inbox.' };
}
