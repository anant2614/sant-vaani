import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { row, rows } from '@/lib/db';
import { ANSWER_STATUS, either, formatDate } from '@/lib/format';
import type { Answer, ClipCard, Question, Step, Topic } from '@/lib/types';
import { updateQuestion } from '../actions';
import { QuestionFields } from '../QuestionFields';
import { AnswerBuilder, type GitaChapter } from './AnswerBuilder';

export const metadata: Metadata = { title: 'Answer' };

type AnswerRow = Answer & { answer_clips: { clip_id: string; position: number }[] };

export default async function AnswerPage({ params }: PageProps<'/answers/[questionId]'>) {
  const { questionId } = await params;
  if (!z.uuid().safeParse(questionId).success) notFound();
  const { supabase } = await requireStaff();

  const [question, answer, topics, approved, steps, chapters] = await Promise.all([
    supabase
      .from('questions')
      .select('id, topic_id, text_en, text_hi, phrasings, sort_order')
      .eq('id', questionId)
      .maybeSingle()
      .then((result) => row<Question>(result)),
    supabase
      .from('answers')
      .select('*, answer_clips(clip_id, position)')
      .eq('question_id', questionId)
      .maybeSingle()
      .then((result) => row<AnswerRow>(result)),
    supabase
      .from('topics')
      .select('id, slug, group_slug, name_en, name_hi, sensitive, sort_order')
      .order('sort_order')
      .then((result) => rows<Topic>(result)),
    supabase
      .from('clip_cards')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .then((result) => rows<ClipCard>(result)),
    supabase
      .from('steps')
      .select('id, text_en, text_hi')
      .order('created_at')
      .then((result) => rows<Step>(result)),
    supabase
      .from('chapters')
      .select('number, name_en, verse_count')
      .eq('scripture_id', 'gita')
      .order('number')
      .then((result) => rows<GitaChapter>(result)),
  ]);
  if (!question) notFound();

  const chosenIds = (answer?.answer_clips ?? []).sort((a, b) => a.position - b.position).map((c) => c.clip_id);
  // Chosen clips that are no longer approved still show, so the curator sees what to replace.
  const missing = chosenIds.filter((id) => !approved.some((c) => c.id === id));
  const extra = missing.length
    ? rows<ClipCard>(await supabase.from('clip_cards').select('*').in('id', missing))
    : [];
  const status = answer?.status ?? 'none';

  return (
    <>
      <p>
        <Link href="/answers">← All questions</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{either(question.text_en, question.text_hi)}</h1>
          {question.text_en && question.text_hi ? <p className="hindi">{question.text_hi}</p> : null}
        </div>
        <div className="meta">
          <span className={`badge ${status === 'published' ? 'good' : status === 'needs_replacement' ? 'bad' : 'wait'}`}>
            {ANSWER_STATUS[status]}
          </span>
          {answer?.published_at ? <span>Published {formatDate(answer.published_at)}</span> : null}
        </div>
      </div>
      {status === 'needs_replacement' ? (
        <p className="form-error">
          A clip in this answer was retired or its video went away. Replace it, then publish again. Until then the app
          shows the answer only while at least two of its clips are live.
        </p>
      ) : null}

      <AnswerBuilder
        questionId={question.id}
        questionTopicId={question.topic_id}
        status={status}
        initial={{
          clipIds: chosenIds,
          chapter: answer?.verse_chapter ?? null,
          verse: answer?.verse_number ?? null,
          stepId: answer?.step_id ?? null,
        }}
        clips={[...approved, ...extra]}
        topics={topics}
        steps={steps}
        chapters={chapters}
      />

      <details className="card" style={{ marginTop: 20 }}>
        <summary>Edit the question</summary>
        <ActionForm action={updateQuestion.bind(null, question.id)}>
          <QuestionFields topics={topics} question={question} />
          <button type="submit" className="secondary">
            Save question
          </button>
        </ActionForm>
      </details>
    </>
  );
}
