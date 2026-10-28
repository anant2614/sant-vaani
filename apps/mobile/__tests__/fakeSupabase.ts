import type { SupabaseClient } from '@supabase/supabase-js';

type Call = { table: string; op: 'upsert' | 'delete' | 'rpc'; payload: unknown; ok: boolean };

/**
 * The few Supabase calls the app's sync and account code make, recorded
 * instead of sent. While offline every call fails the way supabase-js
 * reports a network error.
 */
export function fakeSupabase({ signedIn = true }: { signedIn?: boolean } = {}) {
  const calls: Call[] = [];
  let offline = false;
  const answer = (table: string, op: Call['op'], payload: unknown) => {
    calls.push({ table, op, payload, ok: !offline });
    return Promise.resolve(
      offline
        ? { data: null, error: { message: 'TypeError: Network request failed' } }
        : { data: null, error: null },
    );
  };

  const fake = {
    from: (table: string) => ({
      upsert: (rows: unknown, options: unknown) => answer(table, 'upsert', { rows, options }),
      delete: () => ({ match: (filter: unknown) => answer(table, 'delete', filter) }),
    }),
    rpc: jest.fn((name: string) => answer(name, 'rpc', null)),
    auth: {
      getSession: async () => ({ data: { session: signedIn ? { user: { id: 'user-1' } } : null }, error: null }),
      signOut: jest.fn(async () => ({ error: null })),
    },
  };

  return {
    client: fake as unknown as SupabaseClient,
    fake,
    /** Calls that reached the server. */
    sent: (table: string) => calls.filter((call) => call.table === table && call.ok),
    setOffline(value: boolean) {
      offline = value;
    },
  };
}
