import { formatDuration } from '@sant-vaani/core';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { formatDate, VIDEO_STATUS } from '@/lib/format';
import type { Video, VideoStatus } from '@/lib/types';
import { thumbnailUrl } from '@/lib/youtube';
import { addVideo, setVideoStatus } from './actions';

export const metadata: Metadata = { title: 'Inbox' };

const VIEWS: Record<string, { label: string; statuses: VideoStatus[] }> = {
  waiting: { label: 'Waiting', statuses: ['suggested', 'new', 'suggesting'] },
  done: { label: 'Done', statuses: ['done'] },
  ignored: { label: 'Ignored', statuses: ['ignored'] },
};
const LIMIT = 100;

type Row = Pick<Video, 'id' | 'youtube_id' | 'title' | 'published_at' | 'duration_seconds' | 'status' | 'suggestions'> & {
  channels: { title: string; saints: { name_en: string | null; name_hi: string | null } };
  clips: { count: number }[];
};

export default async function InboxPage({ searchParams }: PageProps<'/inbox'>) {
  const { supabase } = await requireStaff();
  const { show } = await searchParams;
  const view = typeof show === 'string' && show in VIEWS ? show : 'waiting';
  const { statuses } = VIEWS[view] as (typeof VIEWS)[string];

  const videos = rows<Row>(
    await supabase
      .from('videos')
      .select(
        'id, youtube_id, title, published_at, duration_seconds, status, suggestions, channels!inner(title, saints!inner(name_en, name_hi)), clips(count)',
      )
      .in('status', statuses)
      .order('status', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(LIMIT),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inbox</h1>
          <p>New talks from the official channels arrive every night. Videos with suggestions show first.</p>
        </div>
        <ActionForm action={addVideo} className="row" resetOnSuccess>
          <label className="field" style={{ minWidth: 320, marginBottom: 0 }}>
            <span>Add a video by link</span>
            <input name="url" placeholder="https://www.youtube.com/watch?v=…" required />
          </label>
          <button type="submit">Add</button>
        </ActionForm>
      </div>

      <nav className="tabs" aria-label="Videos">
        {Object.entries(VIEWS).map(([key, { label }]) => (
          <Link key={key} href={key === 'waiting' ? '/inbox' : `/inbox?show=${key}`} aria-current={key === view ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      {videos.length === 0 ? (
        <p className="empty">Nothing here. New uploads arrive overnight.</p>
      ) : (
        <ul className="rows">
          {videos.map((video) => {
            const saint = video.channels.saints;
            const clipCount = video.clips[0]?.count ?? 0;
            return (
              <li key={video.id}>
                <Image className="thumb" src={thumbnailUrl(video.youtube_id)} alt="" width={160} height={90} />
                <div className="grow">
                  <Link className="title" href={`/videos/${video.id}`}>
                    {video.title || video.youtube_id}
                  </Link>
                  <div className="meta">
                    <span>{saint.name_en ?? saint.name_hi}</span>
                    <span>{formatDate(video.published_at)}</span>
                    <span>{formatDuration(video.duration_seconds)}</span>
                    {video.suggestions.length > 0 ? <span>{video.suggestions.length} suggestions</span> : null}
                    {clipCount > 0 ? <span>{clipCount} clips</span> : null}
                  </div>
                </div>
                <span className={`badge ${video.status === 'suggested' ? 'wait' : ''}`}>{VIDEO_STATUS[video.status]}</span>
                {view === 'waiting' ? (
                  <ActionForm action={setVideoStatus.bind(null, video.id, 'ignored')}>
                    <button type="submit" className="quiet small">
                      Ignore
                    </button>
                  </ActionForm>
                ) : (
                  <ActionForm action={setVideoStatus.bind(null, video.id, 'new')}>
                    <button type="submit" className="quiet small">
                      Back to inbox
                    </button>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {videos.length === LIMIT ? <p className="muted">Showing the latest {LIMIT}.</p> : null}
    </>
  );
}
