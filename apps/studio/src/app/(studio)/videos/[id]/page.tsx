import { formatDuration, youtubeWatchUrl } from '@sant-vaani/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { row, rows } from '@/lib/db';
import { formatDate, VIDEO_STATUS } from '@/lib/format';
import type { ClipCard, Topic, Video } from '@/lib/types';
import { setVideoStatus } from '../../inbox/actions';
import { Workbench } from './Workbench';

export const metadata: Metadata = { title: 'Video' };

type VideoRow = Video & { channels: { title: string; saints: { name_en: string | null; name_hi: string | null } } };

export default async function VideoPage({ params }: PageProps<'/videos/[id]'>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireStaff();

  const [video, clips, topics] = await Promise.all([
    supabase
      .from('videos')
      .select('*, channels!inner(title, saints!inner(name_en, name_hi))')
      .eq('id', id)
      .maybeSingle()
      .then((result) => row<VideoRow>(result)),
    supabase
      .from('clip_cards')
      .select('*')
      .eq('video_id', id)
      .order('start_seconds')
      .then((result) => rows<ClipCard>(result)),
    supabase
      .from('topics')
      .select('id, slug, group_slug, name_en, name_hi, sensitive, sort_order')
      .order('sort_order')
      .then((result) => rows<Topic>(result)),
  ]);
  if (!video) notFound();
  const saint = video.channels.saints;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{video.title || video.youtube_id}</h1>
          <div className="meta">
            <span>{saint.name_en ?? saint.name_hi}</span>
            <span>{video.channels.title}</span>
            <span>{formatDate(video.published_at)}</span>
            <span>{formatDuration(video.duration_seconds)}</span>
            <span className="badge">{VIDEO_STATUS[video.status]}</span>
            <a href={youtubeWatchUrl(video.youtube_id)} target="_blank" rel="noreferrer">
              Open on YouTube
            </a>
          </div>
        </div>
        <div className="actions">
          {video.status !== 'done' ? (
            <ActionForm action={setVideoStatus.bind(null, video.id, 'done')}>
              <button type="submit" className="secondary">
                Mark done
              </button>
            </ActionForm>
          ) : null}
          {video.status !== 'ignored' ? (
            <ActionForm action={setVideoStatus.bind(null, video.id, 'ignored')}>
              <button type="submit" className="quiet">
                Ignore video
              </button>
            </ActionForm>
          ) : null}
        </div>
      </div>
      {!video.embeddable || video.privacy_status === 'private' || video.privacy_status === 'gone' ? (
        <p className="form-error">
          YouTube says this video is {video.embeddable ? video.privacy_status : 'not embeddable'}. Its clips cannot be
          live.
        </p>
      ) : null}
      <Workbench
        video={{
          id: video.id,
          youtubeId: video.youtube_id,
          durationSeconds: video.duration_seconds,
          chapters: video.chapters,
          suggestions: video.suggestions,
        }}
        clips={clips}
        topics={topics}
      />
    </>
  );
}
