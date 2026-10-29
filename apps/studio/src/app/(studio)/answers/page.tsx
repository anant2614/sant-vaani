import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { ANSWER_STATUS, either, TOPIC_GROUPS } from '@/lib/format';
import type { Answer, Question, Topic, TopicGroup } from '@/lib/types';
import { createQuestion } from './actions';
import { QuestionFields } from './QuestionFields';

export const metadata: Metadata = { title: 'Answers' };

type AnswerRow = Pick<Answer, 'id' | 'question_id' | 'status'> & { answer_clips: { count: number }[] };

const VIEWS = {
  all: 'All',
  todo: 'No answer yet',
  draft: 'Drafts',
  replace: 'Needs repair',
  published: 'Published',
} as const;
type View = keyof typeof VIEWS;

export default async function AnswersPage({ searchParams }: PageProps<'/answers'>) {
  const { supabase } = await requireStaff();
  const { show } = await searchParams;
  const view: View = typeof show === 'string' && show in VIEWS ? (show as View) : 'all';

  const [topics, questions, answers] = await Promise.all([
    supabase
      .from('topics')
      .select('id, slug, group_slug, name_en, name_hi, sensitive, sort_order')
      .order('sort_order')
      .then((result) => rows<Topic>(result)),
    supabase
      .from('questions')
      .select('id, topic_id, text_en, text_hi, phrasings, sort_order')
      .order('sort_order')
      .then((result) => rows<Question>(result)),
    supabase
      .from('answers')
      .select('id, question_id, status, answer_clips(count)')
      .then((result) => rows<AnswerRow>(result)),
  ]);
  const answerFor = new Map(answers.map((a) => [a.question_id, a]));
  const shown = questions.filter((q) => {
    const status = answerFor.get(q.id)?.status ?? 'none';
    if (view === 'todo') return status === 'none';
    if (view === 'draft') return status === 'draft';
    if (view === 'replace') return status === 'needs_replacement';
    if (view === 'published') return status === 'published';
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Answers</h1>
          <p>
            Each curated question gets one answer: 3 to 5 clips by different saints, a Gita verse that ties them
            together and one small step. Ask only ever matches people to these questions.
          </p>
        </div>
      </div>
      <nav className="tabs" aria-label="Answers">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link key={key} href={key === 'all' ? '/answers' : `/answers?show=${key}`} aria-current={key === view ? 'page' : undefined}>
            {VIEWS[key]}
          </Link>
        ))}
      </nav>

      <details className="card">
        <summary>Add a curated question</summary>
        <ActionForm action={createQuestion.bind(null, null)}>
          <QuestionFields topics={topics} />
          <button type="submit">Add question</button>
        </ActionForm>
      </details>

      {shown.length === 0 ? <p className="empty">No questions here.</p> : null}
      {(Object.keys(TOPIC_GROUPS) as TopicGroup[]).map((group) => {
        const groupTopics = topics.filter((t) => t.group_slug === group);
        const groupQuestions = shown.filter((q) => groupTopics.some((t) => t.id === q.topic_id));
        if (groupQuestions.length === 0) return null;
        return (
          <section key={group}>
            <h2 className="group-title">{TOPIC_GROUPS[group]}</h2>
            <ul className="rows">
              {groupQuestions.map((question) => {
                const answer = answerFor.get(question.id);
                const status = answer?.status ?? 'none';
                const topic = groupTopics.find((t) => t.id === question.topic_id);
                const tone = status === 'published' ? 'good' : status === 'needs_replacement' ? 'bad' : status === 'draft' ? 'wait' : '';
                return (
                  <li key={question.id}>
                    <div className="grow">
                      <Link className="title" href={`/answers/${question.id}`}>
                        {either(question.text_en, question.text_hi)}
                      </Link>
                      <div className="meta">
                        <span>{topic?.name_en}</span>
                        {answer ? <span>{answer.answer_clips[0]?.count ?? 0} clips</span> : null}
                      </div>
                    </div>
                    <span className={`badge ${tone}`}>{ANSWER_STATUS[status]}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
