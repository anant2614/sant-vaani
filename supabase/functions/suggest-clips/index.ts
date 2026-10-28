// Hourly: collect finished suggestion batches, then send new videos to the
// Claude Batch API. Suggestions say where in a talk to look; curators set
// every clip themselves.
import { claudeClient, claudeOptions } from '../_shared/anthropic.ts';
import type { Chapter } from '../_shared/core/index.ts';
import { check, rows } from '../_shared/db.ts';
import { serveJob } from '../_shared/jobs.ts';
import { readBatchResult, suggestionRequest, type SuggestionTopic } from './suggest.ts';

/** Videos sent per hourly run. */
const BATCH_SIZE = 100;

type OpenBatch = { id: string; anthropic_batch_id: string; video_ids: string[] };
type NewVideo = { id: string; title: string; description: string; duration_seconds: number; chapters: Chapter[] };

serveJob('suggest-clips', async (db) => {
  const options = claudeOptions('SUGGEST_MODEL');
  const client = claudeClient(options);
  const topics = rows<SuggestionTopic>(await db.from('topics').select('slug, name_en').order('sort_order'), 'reading topics');
  const topicSlugs = new Set(topics.map((t) => t.slug));

  let collected = 0;
  const open = rows<OpenBatch>(
    await db.from('suggestion_batches').select('id, anthropic_batch_id, video_ids').eq('status', 'submitted').order('created_at'),
    'reading open batches',
  );
  for (const batch of open) {
    const remote = await client.messages.batches.retrieve(batch.anthropic_batch_id);
    if (remote.processing_status !== 'ended') continue;
    const durations = new Map(
      rows<{ id: string; duration_seconds: number }>(
        await db.from('videos').select('id, duration_seconds').in('id', batch.video_ids),
        'reading batch videos',
      ).map((v) => [v.id, v.duration_seconds]),
    );
    for await (const item of await client.messages.batches.results(batch.anthropic_batch_id)) {
      const duration = durations.get(item.custom_id);
      if (duration === undefined) continue;
      const outcome = readBatchResult(item.result, duration, topicSlugs);
      if (outcome.status === 'suggested') {
        check(await db.from('videos').update({ suggestions: outcome.suggestions }).eq('id', item.custom_id), 'saving suggestions');
        collected++;
      }
      // Only videos still waiting move on; a curator may have handled one already.
      check(
        await db.from('videos').update({ status: outcome.status }).eq('id', item.custom_id).eq('status', 'suggesting'),
        'updating a video',
      );
    }
    check(
      await db
        .from('suggestion_batches')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', batch.id),
      'closing a batch',
    );
  }

  let submitted = 0;
  const fresh = rows<NewVideo>(
    await db
      .from('videos')
      .select('id, title, description, duration_seconds, chapters')
      .eq('status', 'new')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(BATCH_SIZE),
    'reading new videos',
  );
  if (fresh.length > 0 && topics.length > 0) {
    const batch = await client.messages.batches.create({
      requests: fresh.map((v) =>
        suggestionRequest(
          { id: v.id, title: v.title, description: v.description, durationSeconds: v.duration_seconds, chapters: v.chapters },
          topics,
          options.model,
        ),
      ),
    });
    const ids = fresh.map((v) => v.id);
    check(await db.from('suggestion_batches').insert({ anthropic_batch_id: batch.id, video_ids: ids }), 'saving the batch');
    check(await db.from('videos').update({ status: 'suggesting' }).in('id', ids).eq('status', 'new'), 'marking videos');
    submitted = ids.length;
  }
  return { collected, submitted };
});
