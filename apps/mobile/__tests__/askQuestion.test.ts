import { FunctionsFetchError, type SupabaseClient } from '@supabase/supabase-js';

import { askQuestion } from '@/ask/askQuestion';

afterEach(() => {
  jest.useRealTimers();
});

test('a reply that never comes ends as offline instead of asking forever', async () => {
  jest.useFakeTimers();
  // A stalled connection: the request only ends when its own timeout aborts it.
  const invoke = jest.fn(
    (_name: string, options: { timeout?: number }) =>
      new Promise((resolve) => {
        if (options.timeout) {
          setTimeout(() => resolve({ data: null, error: new FunctionsFetchError(new Error('aborted')) }), options.timeout);
        }
      }),
  );
  const client = { functions: { invoke } } as unknown as SupabaseClient;

  const outcome = askQuestion(client, { question: 'how do I find peace', uiLanguage: 'en' });
  await jest.advanceTimersByTimeAsync(45_000);

  await expect(outcome).resolves.toMatchObject({ kind: 'failed', reason: 'offline' });
});
