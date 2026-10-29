// POST /functions/v1/ask with the person's token and { question, uiLanguage }.
// Replies with an answer to open, the nearest topics, helplines, or the daily limit.
import { claudeOptions } from '../_shared/anthropic.ts';
import { AskRequestSchema, MAX_QUESTION_CHARS } from '../_shared/core/index.ts';
import { corsHeaders, json } from '../_shared/http.ts';
import { serviceClient, userIdFrom } from '../_shared/supabase.ts';
import { liveDeps, modelClassifier } from './deps.ts';
import { handleAsk } from './handler.ts';

const db = serviceClient();
const classify = modelClassifier(claudeOptions('ASK_MODEL'));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const userId = await userIdFrom(request, db);
  if (!userId) return json({ error: 'Sign in to ask a question.' }, 401);

  const body = AskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: `Send a question of 2 to ${MAX_QUESTION_CHARS} characters.` }, 400);

  try {
    return json(await handleAsk(body.data, liveDeps(db, userId, classify)));
  } catch (error) {
    console.error('ask failed', error);
    return json({ error: 'Ask is not available right now. Please try again in a moment.' }, 503);
  }
});
