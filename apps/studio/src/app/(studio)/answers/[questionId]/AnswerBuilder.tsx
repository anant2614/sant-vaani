'use client';

import { youtubeWatchUrl } from '@sant-vaani/core';
import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import { ClipBadge } from '@/components/ClipBadge';
import type { ActionState } from '@/lib/actions';
import { validateAnswerDraft } from '@/lib/answers';
import { clipRange, either } from '@/lib/format';
import { move } from '@/lib/list';
import { createClient } from '@/lib/supabase/client';
import type { AnswerStatus, ClipCard, Step, Topic } from '@/lib/types';
import { saveAnswer } from './actions';

export type GitaChapter = { number: number; name_en: string; verse_count: number };

type Props = {
  questionId: string;
  questionTopicId: string;
  status: AnswerStatus | 'none';
  initial: { clipIds: string[]; chapter: number | null; verse: number | null; stepId: string | null };
  clips: ClipCard[];
  topics: Topic[];
  steps: Step[];
  chapters: GitaChapter[];
};

type VerseText = { sanskrit: string; transliteration: string; meaning_en: string | null };

const MAX_CLIPS = 5;

/** Pick and order the clips, then the verse and the step. */
export function AnswerBuilder({ questionId, questionTopicId, status, initial, clips, topics, steps, chapters }: Props) {
  const [clipIds, setClipIds] = useState(initial.clipIds);
  const [chapter, setChapter] = useState(initial.chapter ? String(initial.chapter) : '');
  const [verse, setVerse] = useState(initial.verse ? String(initial.verse) : '');
  const [stepId, setStepId] = useState(initial.stepId ?? '');
  const [newStep, setNewStep] = useState({ en: '', hi: '' });
  const [topicFilter, setTopicFilter] = useState(questionTopicId);
  const [search, setSearch] = useState('');
  const [verseText, setVerseText] = useState<{ key: string; text: VerseText | null } | null>(null);
  const save = useMemo(() => saveAnswer.bind(null, questionId), [questionId]);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(save, {});

  const clipById = useMemo(() => new Map(clips.map((c) => [c.id, c])), [clips]);
  const topicName = useMemo(() => new Map(topics.map((t) => [t.id, t.name_en])), [topics]);
  const chosen = clipIds.map((id) => clipById.get(id)).filter((c): c is ClipCard => Boolean(c));
  const chosenSaints = new Set(chosen.map((c) => c.saint_id));
  const chapterInfo = chapters.find((c) => String(c.number) === chapter);
  const verseRef = chapter && verse ? { chapter: Number(chapter), verse: Number(verse) } : null;
  const verseKey = verseRef ? `${verseRef.chapter}.${verseRef.verse}` : null;
  const shownVerse = verseText && verseText.key === verseKey ? verseText : null;

  const problems = validateAnswerDraft({
    clips: chosen.map((c) => ({ id: c.id, saintId: c.saint_id, live: c.live })),
    verse: verseRef,
    stepId: stepId === 'new' ? (newStep.en.trim() || newStep.hi.trim() ? 'new' : null) : stepId || null,
  });

  const needle = search.trim().toLowerCase();
  const candidates = clips.filter(
    (c) =>
      c.live &&
      !clipIds.includes(c.id) &&
      (!topicFilter || c.topic_ids.includes(topicFilter)) &&
      (!needle ||
        [c.summary_en, c.summary_hi, c.saint_name, c.video_title].some((text) => text?.toLowerCase().includes(needle))),
  );

  // Show the chosen verse so the curator can check it fits.
  useEffect(() => {
    if (!verseKey) return;
    const [chapterNumber, verseNumber] = verseKey.split('.').map(Number);
    let current = true;
    const timer = setTimeout(async () => {
      const { data } = await createClient()
        .from('verses')
        .select('sanskrit, transliteration, meaning_en')
        .eq('scripture_id', 'gita')
        .eq('chapter', chapterNumber)
        .eq('verse', verseNumber)
        .maybeSingle<VerseText>();
      if (current) setVerseText({ key: verseKey, text: data ?? null });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [verseKey]);

  const primaryLabel =
    status === 'published' ? 'Save changes' : status === 'needs_replacement' ? 'Save and publish again' : 'Save and publish';

  return (
    <form
      className="split"
      action={dispatch}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(event.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <section className="card">
        <h2>Clips to choose from</h2>
        <div className="row">
          <label className="field">
            <span>Topic</span>
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="">Every topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name_en}
                  {t.id === questionTopicId ? ' (this question)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Saint, summary or talk" />
          </label>
        </div>
        {candidates.length === 0 ? (
          <p className="empty">No live clips match. Approve clips on this topic first, or look under every topic.</p>
        ) : (
          <ul className="rows candidates">
            {candidates.map((clip) => {
              const sameSaint = chosenSaints.has(clip.saint_id);
              const full = clipIds.length >= MAX_CLIPS;
              return (
                <li key={clip.id}>
                  <div className="grow">
                    <strong>{clip.saint_name}</strong>
                    <div>{either(clip.summary_en, clip.summary_hi)}</div>
                    <div className="meta">
                      <a href={youtubeWatchUrl(clip.youtube_id, clip.start_seconds)} target="_blank" rel="noreferrer">
                        {clipRange(clip.start_seconds, clip.end_seconds)}
                      </a>
                      {clip.topic_ids.map((id) => (
                        <span key={id}>{topicName.get(id)}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary small"
                    disabled={sameSaint || full}
                    title={sameSaint ? 'This saint already has a clip in the answer' : full ? 'An answer has at most 5 clips' : undefined}
                    onClick={() => setClipIds([...clipIds, clip.id])}
                  >
                    Add
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <fieldset className="form-body" disabled={pending}>
          <h2>The answer</h2>
          {chosen.length === 0 ? (
            <p className="empty">Add 3 to 5 clips by different saints.</p>
          ) : (
            <ol className="chosen">
              {chosen.map((clip, index) => (
                <li key={clip.id}>
                  <input type="hidden" name="clipIds" value={clip.id} />
                  <div className="grow">
                    <strong>{clip.saint_name}</strong> · {either(clip.summary_en, clip.summary_hi)}
                    <div className="meta">
                      <a href={youtubeWatchUrl(clip.youtube_id, clip.start_seconds)} target="_blank" rel="noreferrer">
                        {clipRange(clip.start_seconds, clip.end_seconds)}
                      </a>
                      <ClipBadge clip={clip} />
                    </div>
                  </div>
                  <button type="button" className="quiet small" aria-label="Move up" onClick={() => setClipIds(move(clipIds, index, -1))}>
                    ↑
                  </button>
                  <button type="button" className="quiet small" aria-label="Move down" onClick={() => setClipIds(move(clipIds, index, 1))}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="quiet small"
                    aria-label="Remove"
                    onClick={() => setClipIds(clipIds.filter((id) => id !== clip.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}

          <h3>Gita verse</h3>
          <div className="row">
            <label className="field">
              <span>Chapter</span>
              <select name="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)}>
                <option value="">Choose</option>
                {chapters.map((c) => (
                  <option key={c.number} value={c.number}>
                    {c.number}. {c.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Verse</span>
              <input
                type="number"
                name="verse"
                min={1}
                max={chapterInfo?.verse_count ?? 78}
                value={verse}
                onChange={(e) => setVerse(e.target.value)}
              />
            </label>
          </div>
          {shownVerse?.text ? (
            <div className="verse">
              <p className="sanskrit" lang="sa">
                {shownVerse.text.sanskrit}
              </p>
              <p className="muted">{shownVerse.text.meaning_en ?? shownVerse.text.transliteration}</p>
            </div>
          ) : shownVerse ? (
            <p className="muted">There is no verse {verseKey} in the Gita.</p>
          ) : null}

          <h3>One small step</h3>
          <label className="field">
            <span>Step</span>
            <select name="stepId" value={stepId} onChange={(e) => setStepId(e.target.value)}>
              <option value="">Choose</option>
              <option value="new">Write a new step…</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {either(s.text_en, s.text_hi)}
                </option>
              ))}
            </select>
          </label>
          {stepId === 'new' ? (
            <>
              <label className="field">
                <span>Step in English</span>
                <textarea
                  name="newStepEn"
                  rows={2}
                  value={newStep.en}
                  onChange={(e) => setNewStep({ ...newStep, en: e.target.value })}
                  placeholder="Tonight, write down the one worry you keep returning to, then close the notebook."
                />
              </label>
              <label className="field">
                <span>Step in Hindi</span>
                <textarea
                  name="newStepHi"
                  rows={2}
                  className="hindi"
                  lang="hi"
                  value={newStep.hi}
                  onChange={(e) => setNewStep({ ...newStep, hi: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {problems.length > 0 ? (
            <ul className="problems">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="form-notice">Ready to publish.</p>
          )}
          <div className="actions">
            <button type="submit" name="intent" value="publish" disabled={problems.length > 0}>
              {primaryLabel}
            </button>
            {status !== 'published' ? (
              <button type="submit" name="intent" value="draft" className="secondary">
                Save draft
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
      </section>
    </form>
  );
}
