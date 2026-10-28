// Nightly: publish the catalogue file the app downloads, close backlog items
// whose curated question now has an answer, and tell the people who asked.
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATALOGUE_BUCKET, CATALOGUE_FILE, type Catalogue } from '../_shared/core/index.ts';
import { allRows, check, rows, rowsForIds } from '../_shared/db.ts';
import { serveJob } from '../_shared/jobs.ts';
import { buildCatalogue, type CatalogueRows } from './build.ts';
import { pushMessages, sendPushes, type AnsweredRequest, type PushToken } from './notify.ts';

type Rows<K extends keyof CatalogueRows> = CatalogueRows[K][number];

async function readCatalogueRows(db: SupabaseClient): Promise<CatalogueRows> {
  const [topics, questions, answers, clips, saints, paths, dailyVerses] = await Promise.all([
    allRows<Rows<'topics'>>(
      (from, to) => db.from('topics').select('id, slug, name_en, name_hi, sort_order').order('id').range(from, to),
      'reading topics',
    ),
    allRows<Rows<'questions'>>(
      (from, to) => db.from('questions').select('id, topic_id, text_en, text_hi, sort_order').order('id').range(from, to),
      'reading questions',
    ),
    allRows<Rows<'answers'>>(
      (from, to) =>
        db
          .from('answers')
          .select(
            'id, question_id, status, verse_chapter, verse_number, step:steps(text_en, text_hi), clips:answer_clips(clip_id, position)',
          )
          .in('status', ['published', 'needs_replacement'])
          .order('id')
          .range(from, to),
      'reading answers',
    ),
    allRows<Rows<'clips'>>(
      (from, to) =>
        db
          .from('clip_cards')
          .select('id, saint_id, youtube_id, start_seconds, end_seconds, language, summary_en, summary_hi')
          .eq('live', true)
          .order('id')
          .range(from, to),
      'reading live clips',
    ),
    allRows<Rows<'saints'>>(
      (from, to) =>
        db.from('saints').select('id, name_en, name_hi, initials, tradition').eq('taken_down', false).order('id').range(from, to),
      'reading saints',
    ),
    allRows<Rows<'paths'>>(
      (from, to) =>
        db
          .from('paths')
          .select(
            'id, slug, title_en, title_hi, description_en, description_hi, sort_order, days:path_days(day, clip_id, verse_chapter, verse_number, step:steps(text_en, text_hi))',
          )
          .eq('published', true)
          .order('id')
          .range(from, to),
      'reading paths',
    ),
    allRows<Rows<'dailyVerses'>>(
      (from, to) =>
        db
          .from('daily_verses')
          .select('chapter, verse')
          .eq('scripture_id', 'gita')
          .order('sort_order')
          .order('chapter')
          .order('verse')
          .range(from, to),
      'reading daily verses',
    ),
  ]);
  return { topics, questions, answers, clips, saints, paths, dailyVerses };
}

/** Backlog items turned into a curated question that now has an answer in the app. */
async function closeAnsweredBacklog(db: SupabaseClient, catalogue: Catalogue): Promise<number> {
  const inApp = new Set(catalogue.questions.map((q) => q.id));
  const open = rows<{ id: string; question_id: string }>(
    await db.from('backlog_items').select('id, question_id').eq('status', 'open').not('question_id', 'is', null),
    'reading the backlog',
  );
  const answered = open.filter((item) => inApp.has(item.question_id)).map((item) => item.id);
  for (let i = 0; i < answered.length; i += 100) {
    check(
      await db.from('backlog_items').update({ status: 'answered' }).in('id', answered.slice(i, i + 100)),
      'closing backlog items',
    );
  }
  return answered.length;
}

type PendingRequest = { id: string; user_id: string; backlog_items: { question_id: string | null } };

/** Pushes "your question was answered" to people who asked to be told, once each. */
async function notifyAnswered(db: SupabaseClient, catalogue: Catalogue): Promise<{ notified: number; pushes: number }> {
  const answerFor = new Map(catalogue.answers.map((a) => [a.questionId, a.id]));
  const textOf = new Map(catalogue.questions.map((q) => [q.id, q.text]));
  const pending = rows<PendingRequest>(
    await db
      .from('notify_requests')
      .select('id, user_id, backlog_items!inner(question_id)')
      .is('notified_at', null)
      .eq('backlog_items.status', 'answered'),
    'reading notify requests',
  );
  const requests: AnsweredRequest[] = pending.flatMap((n) => {
    const questionId = n.backlog_items.question_id;
    const answerId = questionId ? answerFor.get(questionId) : undefined;
    const text = questionId ? textOf.get(questionId) : undefined;
    return questionId && answerId && text ? [{ requestId: n.id, userId: n.user_id, questionId, answerId, text }] : [];
  });
  if (requests.length === 0) return { notified: 0, pushes: 0 };

  const userIds = [...new Set(requests.map((r) => r.userId))];
  const tokens = await rowsForIds<PushToken>(
    userIds,
    (chunk) => db.from('push_tokens').select('token, user_id').in('user_id', chunk),
    'reading push tokens',
  );
  const profiles = await rowsForIds<{ user_id: string; language: 'en' | 'hi' }>(
    userIds,
    (chunk) => db.from('profiles').select('user_id, language').in('user_id', chunk),
    'reading languages',
  );
  const result = await sendPushes(pushMessages(requests, tokens, new Map(profiles.map((p) => [p.user_id, p.language]))), {
    accessToken: Deno.env.get('EXPO_ACCESS_TOKEN'),
  });

  await rowsForIds(result.unregistered, (chunk) => db.from('push_tokens').delete().in('token', chunk), 'removing old tokens');
  await rowsForIds(
    requests.map((r) => r.requestId),
    (chunk) => db.from('notify_requests').update({ notified_at: new Date().toISOString() }).in('id', chunk),
    'marking requests notified',
  );
  return { notified: requests.length, pushes: result.sent };
}

serveJob('build-catalogue', async (db) => {
  const catalogue = buildCatalogue(await readCatalogueRows(db), new Date());
  check(
    await db.storage
      .from(CATALOGUE_BUCKET)
      .upload(CATALOGUE_FILE, new Blob([JSON.stringify(catalogue)], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '600',
      }),
    'publishing the catalogue',
  );
  const closed = await closeAnsweredBacklog(db, catalogue);

  // The file is out by now; a push outage should not read as a failed catalogue.
  let notify: Record<string, unknown>;
  try {
    notify = await notifyAnswered(db, catalogue);
  } catch (error) {
    console.error('build-catalogue: notifications failed, they will be retried tomorrow', error);
    notify = { notifyError: error instanceof Error ? error.message : String(error) };
  }
  return {
    answers: catalogue.answers.length,
    clips: catalogue.clips.length,
    paths: catalogue.paths.length,
    backlogClosed: closed,
    ...notify,
  };
});
