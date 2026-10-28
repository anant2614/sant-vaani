import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { BacklogItem, BacklogStatus, Question, Topic } from '@/lib/types';
import { createQuestion } from '../answers/actions';
import { QuestionFields } from '../answers/QuestionFields';
import { setBacklogStatus } from './actions';

export const metadata: Metadata = { title: 'Backlog' };

const VIEWS: Record<BacklogStatus, string> = { open: 'Open', answered: 'Answered', dismissed: 'Dismissed' };
const DEVANAGARI = /[ऀ-ॿ]/;

export default async function BacklogPage({ searchParams }: PageProps<'/backlog'>) {
  const { supabase } = await requireStaff();
  const { show } = await searchParams;
  const view: BacklogStatus = show === 'answered' || show === 'dismissed' ? show : 'open';

  const [items, topics] = await Promise.all([
    supabase
      .from('backlog_items')
      .select('id, example, topic_slugs, ask_count, first_asked_at, last_asked_at, status, question_id')
      .eq('status', view)
      .order('ask_count', { ascending: false })
      .order('last_asked_at', { ascending: false })
      .limit(200)
      .then((result) => rows<BacklogItem>(result)),
    supabase
      .from('topics')
      .select('id, slug, group_slug, name_en, name_hi, sensitive, sort_order')
      .order('sort_order')
      .then((result) => rows<Topic>(result)),
  ]);
  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Backlog</h1>
          <p>
            Questions people asked that no curated question matched well, grouped by wording and sorted by how often
            they were asked. Turn the common ones into curated questions. No names are kept.
          </p>
        </div>
      </div>
      <nav className="tabs" aria-label="Backlog">
        {(Object.keys(VIEWS) as BacklogStatus[]).map((key) => (
          <Link key={key} href={key === 'open' ? '/backlog' : `/backlog?show=${key}`} aria-current={key === view ? 'page' : undefined}>
            {VIEWS[key]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="empty">{view === 'open' ? 'Nothing waiting. Every question asked so far found a match.' : 'Nothing here.'}</p>
      ) : (
        <ul className="rows">
          {items.map((item) => {
            const hindi = DEVANAGARI.test(item.example);
            const draft: Question = {
              id: '',
              topic_id: topicBySlug.get(item.topic_slugs[0] ?? '')?.id ?? '',
              text_en: hindi ? null : item.example,
              text_hi: hindi ? item.example : null,
              phrasings: [item.example],
              sort_order: 0,
            };
            return (
              <li key={item.id}>
                <strong style={{ fontSize: 22, width: 48, textAlign: 'center' }} title="Times asked">
                  {item.ask_count}
                </strong>
                <div className="grow">
                  <div className={hindi ? 'hindi' : undefined}>{item.example}</div>
                  <div className="meta">
                    {item.topic_slugs.map((slug) => (
                      <span key={slug}>{topicBySlug.get(slug)?.name_en ?? slug}</span>
                    ))}
                    <span>
                      {formatDate(item.first_asked_at)} to {formatDate(item.last_asked_at)}
                    </span>
                    {item.question_id ? (
                      <Link href={`/answers/${item.question_id}`}>Curated question made; answer it</Link>
                    ) : null}
                  </div>
                  {view === 'open' && !item.question_id ? (
                    <details style={{ marginTop: 8 }}>
                      <summary>Make a curated question</summary>
                      <ActionForm action={createQuestion.bind(null, item.id)}>
                        <QuestionFields topics={topics} question={draft} />
                        <button type="submit">Make question</button>
                      </ActionForm>
                    </details>
                  ) : null}
                </div>
                {view === 'open' ? (
                  <ActionForm action={setBacklogStatus.bind(null, item.id, 'dismissed')}>
                    <button type="submit" className="quiet small">
                      Dismiss
                    </button>
                  </ActionForm>
                ) : view === 'dismissed' ? (
                  <ActionForm action={setBacklogStatus.bind(null, item.id, 'open')}>
                    <button type="submit" className="quiet small">
                      Reopen
                    </button>
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
