import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claudeClient, type ClaudeOptions } from '../_shared/anthropic.ts';
import {
  AskModelOutputSchema,
  askableQuestions,
  CATALOGUE_BUCKET,
  CATALOGUE_FILE,
  MAX_ASKS_PER_DAY,
  parseCatalogue,
  type AskableQuestion,
} from '../_shared/core/index.ts';
import type { AskDeps } from './handler.ts';
import { ASK_INSTRUCTIONS, questionCatalogue, resolveMatches, userMessage } from './prompt.ts';

/** How long a person waits for the model before Ask matches on words instead. */
const MODEL_TIMEOUT_MS = 15_000;
/** Thinking counts toward this; at low effort it stays short, and the reply is a few dozen tokens. */
const MAX_TOKENS = 4000;
/** The catalogue changes once a night, so a few minutes of caching costs nothing. */
const CATALOGUE_TTL_MS = 5 * 60_000;

/**
 * One Claude call per typed question. The client is made on first use, so
 * a missing key fails that call (and Ask falls back to word matching)
 * rather than the whole function, which must still answer a crisis.
 */
export function modelClassifier(options: ClaudeOptions): AskDeps['classify'] {
  let client: Anthropic | undefined;
  return async (request, questions) => {
    client ??= claudeClient({ timeout: MODEL_TIMEOUT_MS, maxRetries: 1, ...options });
    const response = await client.messages.parse({
      model: options.model,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: ASK_INSTRUCTIONS },
        { type: 'text', text: questionCatalogue(questions), cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage(request) }],
      output_config: { effort: 'low', format: zodOutputFormat(AskModelOutputSchema) },
    });
    if (!response.parsed_output) {
      throw new Error(`the model gave no usable reply (stop reason: ${response.stop_reason})`);
    }
    return resolveMatches(response.parsed_output, questions);
  };
}

let cached: { at: number; questions: AskableQuestion[] } | undefined;

/**
 * The questions Ask may route to, read from the published catalogue so a
 * match always opens in the app. Phrasings come from the database. Before
 * the first catalogue exists, the list is empty and every question goes to
 * the backlog.
 */
async function loadQuestions(db: SupabaseClient): Promise<AskableQuestion[]> {
  if (cached && Date.now() - cached.at < CATALOGUE_TTL_MS) return cached.questions;
  try {
    const { data: file, error } = await db.storage.from(CATALOGUE_BUCKET).download(CATALOGUE_FILE);
    if (error) throw error;
    const catalogue = parseCatalogue(JSON.parse(await file.text()));
    const { data: rows, error: rowsError } = await db.from('questions').select('id, phrasings');
    if (rowsError) throw rowsError;
    const phrasings = new Map((rows as { id: string; phrasings: string[] }[]).map((r) => [r.id, r.phrasings]));
    cached = { at: Date.now(), questions: askableQuestions(catalogue, phrasings) };
  } catch (error) {
    // Keep using the last good list, if there is one, and try again on the next question.
    console.error('ask: could not read the catalogue', error);
  }
  return cached?.questions ?? [];
}

/** The database side of Ask, acting for one person. */
export function liveDeps(db: SupabaseClient, userId: string, classify: AskDeps['classify']): AskDeps {
  return {
    userId,
    classify,
    loadQuestions: () => loadQuestions(db),

    async recordAsk(record) {
      const { error } = await db.from('asks').insert({
        user_id: userId,
        question: record.question,
        language: record.language,
        result: record.result,
        question_id: record.questionId,
        confidence: record.confidence,
        topic_slugs: record.topicSlugs,
        matcher: record.matcher,
        backlog_id: record.backlogId,
      });
      // History is a convenience; a failed write must not cost the person their answer.
      if (error) console.error('ask: could not save the question to history', error.message);
    },

    async addToBacklog(entry) {
      const { data, error } = await db.rpc('record_backlog', {
        normalized: entry.normalized,
        example: entry.example,
        topic_slugs: entry.topicSlugs,
      });
      if (error) {
        console.error('ask: could not add the question to the backlog', error.message);
        return null;
      }
      return data as string;
    },

    async bumpUsage() {
      const { data, error } = await db.rpc('bump_ask_usage', { user_id: userId, max: MAX_ASKS_PER_DAY });
      if (error) {
        // The limit guards cost; a database hiccup should not turn people away.
        console.error('ask: could not count the question', error.message);
        return true;
      }
      return data === true;
    },
  };
}
