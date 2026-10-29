import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { ClipPreview } from '@/components/ClipPreview';
import { canReview, requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { clipRange, either, formatDate } from '@/lib/format';
import type { ClipCard, Topic } from '@/lib/types';
import { approveClip, sendBack } from './actions';

export const metadata: Metadata = { title: 'Review' };

export default async function ReviewPage({ searchParams }: PageProps<'/review'>) {
  const { supabase, staff } = await requireStaff();
  const { show } = await searchParams;
  const drafts = show === 'drafts';

  const [clips, topics] = await Promise.all([
    supabase
      .from('clip_cards')
      .select('*')
      .eq('status', drafts ? 'draft' : 'needs_second_review')
      .order('created_at')
      .limit(100)
      .then((result) => rows<ClipCard>(result)),
    supabase
      .from('topics')
      .select('id, name_en')
      .then((result) => rows<Pick<Topic, 'id' | 'name_en'>>(result)),
  ]);
  const topicName = new Map(topics.map((t) => [t.id, t.name_en]));
  const reviewer = canReview(staff);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Review</h1>
          <p>
            Clips on grief, self-harm or family conflict need a second person: a reviewer or admin who did not make
            the clip. Watch the whole clip before approving.
          </p>
        </div>
      </div>
      <nav className="tabs" aria-label="Clips">
        <Link href="/review" aria-current={drafts ? undefined : 'page'}>
          Second review
        </Link>
        <Link href="/review?show=drafts" aria-current={drafts ? 'page' : undefined}>
          Drafts
        </Link>
      </nav>
      {!drafts && !reviewer ? (
        <p className="muted">You can watch these, but only a reviewer or admin can approve them.</p>
      ) : null}

      {clips.length === 0 ? (
        <p className="empty">{drafts ? 'No drafts.' : 'Nothing is waiting for a second review.'}</p>
      ) : (
        <div className="stack">
          {clips.map((clip) => {
            const own = clip.created_by === staff.userId;
            return (
              <article key={clip.id} className="card split">
                <ClipPreview youtubeId={clip.youtube_id} start={clip.start_seconds} end={clip.end_seconds} title={clip.video_title} />
                <div>
                  <h3>{either(clip.summary_en, clip.summary_hi)}</h3>
                  {clip.summary_en && clip.summary_hi ? <p className="hindi">{clip.summary_hi}</p> : null}
                  <div className="meta">
                    <span>{clip.saint_name}</span>
                    <span>{clipRange(clip.start_seconds, clip.end_seconds)}</span>
                    <span>by {clip.created_by_name ?? 'a former curator'}</span>
                    <span>{formatDate(clip.created_at)}</span>
                  </div>
                  <p className="meta">
                    {clip.topic_ids.map((id) => (
                      <span key={id} className="badge">
                        {topicName.get(id)}
                      </span>
                    ))}
                  </p>
                  <p>
                    <Link href={`/videos/${clip.video_id}`}>Open the video to edit</Link>
                  </p>
                  {drafts ? null : (
                    <div className="actions">
                      {reviewer && !own ? (
                        <ActionForm action={approveClip.bind(null, clip.id)}>
                          <button type="submit">Approve</button>
                        </ActionForm>
                      ) : null}
                      {own ? <span className="muted">You made this clip, so someone else reviews it.</span> : null}
                      <ActionForm action={sendBack.bind(null, clip.id)}>
                        <button type="submit" className="quiet">
                          Send back as draft
                        </button>
                      </ActionForm>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
