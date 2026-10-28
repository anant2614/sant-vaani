import { HELPLINES, screenForCrisis, type AskResponse } from '@sant-vaani/core';
import { FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';

import type { AppLanguage } from '@/prefs/prefs';

export type AskOutcome =
  | (AskResponse & { checkedOn: 'phone' | 'server' })
  | { kind: 'failed'; reason: 'not-signed-in' | 'offline' | 'server'; checkedOn: 'phone' | 'server' };

const KINDS = new Set(['answer', 'nearest', 'crisis', 'limited']);

/**
 * Long enough for the server's own worst case (two model attempts, then word
 * overlap), short enough that a stalled connection ends as "offline".
 */
export const ASK_TIMEOUT_MS = 40_000;

/**
 * Sends a question to the Ask function. The crisis check runs on the phone
 * first, so someone in crisis reaches the helplines at once, even with no
 * signal, and those words never leave the phone. Questions that pass it go
 * to the server, which checks again with the model as a second net. The
 * client is null until the guest account is signed in.
 */
export async function askQuestion(
  client: SupabaseClient | null,
  { question, uiLanguage }: { question: string; uiLanguage: AppLanguage },
): Promise<AskOutcome> {
  if (screenForCrisis(question).crisis) return { kind: 'crisis', helplines: HELPLINES, checkedOn: 'phone' };
  if (!client) return { kind: 'failed', reason: 'not-signed-in', checkedOn: 'phone' };

  const reply = await client.functions
    .invoke<AskResponse>('ask', { body: { question, uiLanguage }, timeout: ASK_TIMEOUT_MS })
    .catch(() => null);
  if (!reply) return { kind: 'failed', reason: 'offline', checkedOn: 'server' };
  const { data, error } = reply;
  if (error instanceof FunctionsFetchError) return { kind: 'failed', reason: 'offline', checkedOn: 'server' };
  if (error || !data || !KINDS.has(data.kind)) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response | undefined)?.status : undefined;
    console.warn('Ask failed', status ?? error?.message ?? 'unexpected reply');
    return { kind: 'failed', reason: 'server', checkedOn: 'server' };
  }
  return { ...data, checkedOn: 'server' };
}

/**
 * Asks to be told when the saints answer a question. Asking twice is the
 * same as asking once.
 */
export async function requestNotify(client: SupabaseClient, backlogId: string): Promise<boolean> {
  const { error } = await client.from('notify_requests').insert({ backlog_id: backlogId });
  return !error || error.code === '23505';
}
