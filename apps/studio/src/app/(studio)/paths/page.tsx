import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { ClipBadge } from '@/components/ClipBadge';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { clipRange, either } from '@/lib/format';
import { PATH_DAYS, pathProblems } from '@/lib/paths';
import type { ClipCard, Path, PathDay, Step } from '@/lib/types';
import { setDayClip, setPathPublished } from './actions';

export const metadata: Metadata = { title: 'Paths' };

export default async function PathsPage() {
  const { supabase } = await requireStaff();
  const [paths, days, live, steps] = await Promise.all([
    supabase
      .from('paths')
      .select('*')
      .order('sort_order')
      .then((result) => rows<Path>(result)),
    supabase
      .from('path_days')
      .select('path_id, day, clip_id, verse_chapter, verse_number, step_id')
      .then((result) => rows<PathDay>(result)),
    supabase
      .from('clip_cards')
      .select('*')
      .eq('live', true)
      .order('saint_name')
      .then((result) => rows<ClipCard>(result)),
    supabase
      .from('steps')
      .select('id, text_en, text_hi')
      .then((result) => rows<Step>(result)),
  ]);

  // Clips chosen earlier that are no longer live still show, so they can be replaced.
  const liveIds = new Set(live.map((c) => c.id));
  const stale = days.map((d) => d.clip_id).filter((id): id is string => Boolean(id) && !liveIds.has(id as string));
  const staleClips = stale.length ? rows<ClipCard>(await supabase.from('clip_cards').select('*').in('id', stale)) : [];
  const clipById = new Map([...live, ...staleClips].map((c) => [c.id, c]));
  const stepById = new Map(steps.map((s) => [s.id, s]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Paths</h1>
          <p>Seven days on one theme: each day a clip, a verse and a small step. A path goes into the app once all seven clips are live.</p>
        </div>
      </div>
      {paths.length === 0 ? <p className="empty">No paths yet.</p> : null}
      <div className="stack">
        {paths.map((path) => {
          const pathDays = Array.from({ length: PATH_DAYS }, (_, i) => days.find((d) => d.path_id === path.id && d.day === i + 1));
          const problems = pathProblems(
            pathDays.flatMap((d, i) =>
              d ? [{ day: i + 1, clipLive: d.clip_id ? (clipById.get(d.clip_id)?.live ?? false) : null }] : [],
            ),
          );
          return (
            <section key={path.id} className="card">
              <div className="page-head">
                <div>
                  <h2>{path.title_en}</h2>
                  <p className="hindi">{path.title_hi}</p>
                  <p>{path.description_en}</p>
                </div>
                <div className="actions">
                  <span className={`badge ${path.published ? 'good' : 'wait'}`}>{path.published ? 'Published' : 'Not published'}</span>
                  <ActionForm action={setPathPublished.bind(null, path.id, !path.published)}>
                    <button type="submit" className={path.published ? 'quiet' : undefined} disabled={!path.published && problems.length > 0}>
                      {path.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </ActionForm>
                </div>
              </div>
              <ul className="rows">
                {pathDays.map((day, i) => {
                  const step = day?.step_id ? stepById.get(day.step_id) : null;
                  const clip = day?.clip_id ? clipById.get(day.clip_id) : null;
                  return (
                    <li key={i}>
                      <strong style={{ width: 52 }}>Day {i + 1}</strong>
                      <div className="grow">
                        <div className="meta">
                          <span>{day?.verse_chapter ? `Gita ${day.verse_chapter}.${day.verse_number}` : 'No verse'}</span>
                          <span>{step ? either(step.text_en, step.text_hi) : 'No step'}</span>
                        </div>
                        {clip ? (
                          <div>
                            {clip.saint_name} · {either(clip.summary_en, clip.summary_hi)} ·{' '}
                            {clipRange(clip.start_seconds, clip.end_seconds)} <ClipBadge clip={clip} />
                          </div>
                        ) : null}
                        <ActionForm action={setDayClip.bind(null, path.id, i + 1)} className="row">
                          <label className="field" style={{ marginBottom: 0 }}>
                            <span className="muted">Clip</span>
                            <select name="clipId" defaultValue={day?.clip_id ?? ''}>
                              <option value="">No clip</option>
                              {live.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.saint_name} · {either(c.summary_en, c.summary_hi).slice(0, 90)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button type="submit" className="secondary small">
                            Save day
                          </button>
                        </ActionForm>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!path.published && problems.length > 0 ? <p className="muted">To publish: {problems.join(' ')}</p> : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
