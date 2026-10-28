'use client';

import { formatDuration, parseTimestamp, type Chapter } from '@sant-vaani/core';
import { startTransition, useActionState, useId, useMemo, useRef, useState } from 'react';
import { ActionForm } from '@/components/ActionForm';
import { ClipBadge } from '@/components/ClipBadge';
import { YouTubePlayer, type PlayerHandle } from '@/components/YouTubePlayer';
import type { ActionState } from '@/lib/actions';
import { clipRange, either, TOPIC_GROUPS } from '@/lib/format';
import { LANGUAGES } from '@/lib/forms';
import type { ClipCard, ClipLanguage, Suggestion, Topic, TopicGroup } from '@/lib/types';
import { retireClip, saveClip } from './actions';

type Props = {
  video: { id: string; youtubeId: string; durationSeconds: number; chapters: Chapter[]; suggestions: Suggestion[] };
  clips: ClipCard[];
  topics: Topic[];
};

type Draft = {
  clipId: string | null;
  start: string;
  end: string;
  language: ClipLanguage;
  summaryEn: string;
  summaryHi: string;
  topicIds: string[];
  sensitive: boolean;
};

const EMPTY: Draft = {
  clipId: null,
  start: '',
  end: '',
  language: 'hi',
  summaryEn: '',
  summaryHi: '',
  topicIds: [],
  sensitive: false,
};

function fromClip(clip: ClipCard): Draft {
  return {
    clipId: clip.id,
    start: formatDuration(clip.start_seconds),
    end: formatDuration(clip.end_seconds),
    language: clip.language,
    summaryEn: clip.summary_en ?? '',
    summaryHi: clip.summary_hi ?? '',
    topicIds: clip.topic_ids,
    sensitive: clip.sensitive,
  };
}

/** The player beside the clip editor, with the model's suggestions, chapters and the clips made so far. */
export function Workbench({ video, clips, topics }: Props) {
  const id = useId();
  const player = useRef<PlayerHandle>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // A successful save starts a fresh clip.
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(async (previous, data) => {
    const result = await saveClip(previous, data);
    if (!result.error) setDraft(EMPTY);
    return result;
  }, {});

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const topicBySlug = useMemo(() => new Map(topics.map((t) => [t.slug, t])), [topics]);
  const groups = useMemo(() => {
    const byGroup = new Map<TopicGroup, Topic[]>();
    for (const topic of topics) byGroup.set(topic.group_slug, [...(byGroup.get(topic.group_slug) ?? []), topic]);
    return [...byGroup.entries()];
  }, [topics]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const toggleTopic = (id: string) =>
    update({
      topicIds: draft.topicIds.includes(id) ? draft.topicIds.filter((t) => t !== id) : [...draft.topicIds, id],
    });
  const now = () => formatDuration(player.current?.currentTime() ?? 0);

  const start = parseTimestamp(draft.start);
  const end = parseTimestamp(draft.end);
  const length = start !== null && end !== null && end > start ? end - start : null;
  const sensitive = draft.sensitive || draft.topicIds.some((id) => topicById.get(id)?.sensitive);
  const editing = draft.clipId ? clips.find((c) => c.id === draft.clipId) : null;

  return (
    <div className="split">
      <div className="stack">
        <YouTubePlayer videoId={video.youtubeId} ref={player} />

        {video.suggestions.length > 0 ? (
          <section className="card">
            <h3>Where to look</h3>
            <p className="muted">Suggested overnight from the title, description and chapters. Watch before you trust them.</p>
            <ul className="timeline">
              {video.suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" className="at" onClick={() => player.current?.seekTo(s.start)}>
                    {formatDuration(s.start)}–{formatDuration(s.end)}
                  </button>
                  <span className="grow">
                    <strong>{topicBySlug.get(s.topic_slug)?.name_en ?? s.topic_slug}</strong> · {s.reason}
                  </span>
                  <button
                    type="button"
                    className="quiet small"
                    onClick={() => {
                      const topic = topicBySlug.get(s.topic_slug);
                      update({
                        clipId: null,
                        start: formatDuration(s.start),
                        end: formatDuration(s.end),
                        topicIds: topic ? [topic.id] : [],
                      });
                    }}
                  >
                    Start a clip here
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {video.chapters.length > 0 ? (
          <section className="card">
            <h3>Chapters</h3>
            <ul className="timeline">
              {video.chapters.map((chapter) => (
                <li key={chapter.start}>
                  <button type="button" className="at" onClick={() => player.current?.seekTo(chapter.start)}>
                    {formatDuration(chapter.start)}
                  </button>
                  <span>{chapter.title}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3>Clips from this video</h3>
          {clips.length === 0 ? (
            <p className="empty">No clips yet.</p>
          ) : (
            <ul className="rows">
              {clips.map((clip) => (
                <li key={clip.id}>
                  <div className="grow">
                    <button type="button" className="at" onClick={() => player.current?.seekTo(clip.start_seconds)}>
                      {clipRange(clip.start_seconds, clip.end_seconds)}
                    </button>
                    <div>{either(clip.summary_en, clip.summary_hi)}</div>
                    <div className="meta">
                      {clip.topic_ids.map((id) => (
                        <span key={id}>{topicById.get(id)?.name_en}</span>
                      ))}
                      {clip.created_by_name ? <span>by {clip.created_by_name}</span> : null}
                    </div>
                  </div>
                  <ClipBadge clip={clip} />
                  {clip.status !== 'retired' ? (
                    <>
                      <button type="button" className="quiet small" onClick={() => setDraft(fromClip(clip))}>
                        Edit
                      </button>
                      <details>
                        <summary>Retire</summary>
                        <ActionForm
                          action={retireClip.bind(null, clip.id)}
                          confirm="Retire this clip? Answers that use it will need a replacement."
                        >
                          <label className="field">
                            <span>Why</span>
                            <input name="reason" placeholder="Wrong times, off topic, saint's request…" required />
                          </label>
                          <button type="submit" className="danger small">
                            Retire clip
                          </button>
                        </ActionForm>
                      </details>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <form
        className="card"
        action={dispatch}
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const data = new FormData(event.currentTarget, submitter);
          startTransition(() => dispatch(data));
        }}
      >
        <fieldset className="form-body" disabled={pending}>
          <h2>{editing ? 'Edit clip' : 'New clip'}</h2>
          <input type="hidden" name="videoId" value={video.id} />
          {draft.clipId ? <input type="hidden" name="clipId" value={draft.clipId} /> : null}

          <div className="row">
            <div className="field">
              <label htmlFor={`${id}-start`}>Start</label>
              <span className="time-field">
                <input
                  id={`${id}-start`}
                  name="start"
                  value={draft.start}
                  onChange={(e) => update({ start: e.target.value })}
                  placeholder="2:41"
                  required
                />
                <button type="button" className="secondary small" onClick={() => update({ start: now() })}>
                  Now
                </button>
              </span>
            </div>
            <div className="field">
              <label htmlFor={`${id}-end`}>End</label>
              <span className="time-field">
                <input
                  id={`${id}-end`}
                  name="end"
                  value={draft.end}
                  onChange={(e) => update({ end: e.target.value })}
                  placeholder="5:10"
                  required
                />
                <button type="button" className="secondary small" onClick={() => update({ end: now() })}>
                  Now
                </button>
              </span>
            </div>
          </div>
          <p className="muted">
            {length !== null ? `Length ${formatDuration(length)}. ` : ''}
            Between 15 seconds and 15 minutes. Play the video and press Now at each end.
            {start !== null ? (
              <>
                {' '}
                <button type="button" className="at" onClick={() => player.current?.seekTo(start)}>
                  Replay from the start
                </button>
              </>
            ) : null}
          </p>

          <fieldset className="field">
            <legend>Topics</legend>
            <div className="checks">
              {groups.map(([group, groupTopics]) => (
                <div key={group} style={{ display: 'contents' }}>
                  <h4>{TOPIC_GROUPS[group]}</h4>
                  {groupTopics.map((topic) => (
                    <label key={topic.id} className="check">
                      <input
                        type="checkbox"
                        name="topicIds"
                        value={topic.id}
                        checked={draft.topicIds.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                      />
                      <span>
                        {topic.name_en}
                        {topic.sensitive ? ' *' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <small>* Sensitive: a second reviewer approves these clips.</small>
          </fieldset>

          <label className="field">
            <span>Summary in English</span>
            <textarea
              name="summaryEn"
              value={draft.summaryEn}
              onChange={(e) => update({ summaryEn: e.target.value })}
              placeholder="One line in your own words: what the saint says here."
              rows={2}
            />
          </label>
          <label className="field">
            <span>Summary in Hindi</span>
            <textarea
              name="summaryHi"
              className="hindi"
              value={draft.summaryHi}
              onChange={(e) => update({ summaryHi: e.target.value })}
              rows={2}
              lang="hi"
            />
          </label>

          <div className="row">
            <label className="field">
              <span>Spoken in</span>
              <select name="language" value={draft.language} onChange={(e) => update({ language: e.target.value as ClipLanguage })}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="check field">
              <input
                type="checkbox"
                name="sensitive"
                checked={draft.sensitive}
                onChange={(e) => update({ sensitive: e.target.checked })}
              />
              <span>Sensitive even outside its topics (self-harm, abuse, a recent death)</span>
            </label>
          </div>

          <div className="actions">
            <button type="submit" name="intent" value="submit">
              {sensitive ? 'Send for second review' : 'Approve clip'}
            </button>
            <button type="submit" name="intent" value="draft" className="secondary">
              Save draft
            </button>
            {draft !== EMPTY ? (
              <button type="button" className="quiet" onClick={() => setDraft(EMPTY)}>
                {editing ? 'Cancel edit' : 'Clear'}
              </button>
            ) : null}
          </div>
        </fieldset>
        {state.error ? (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        ) : null}
        {state.notice && !state.error ? (
          <p role="status" className="form-notice">
            {state.notice}
          </p>
        ) : null}
      </form>
    </div>
  );
}
