import { FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';

type Call = { table: string; op: 'upsert' | 'insert' | 'update' | 'delete' | 'rpc' | 'invoke'; payload: unknown; ok: boolean };

const SESSION = { access_token: 'guest-token', user: { id: 'user-1' } };

/**
 * The Supabase calls the app makes, recorded instead of sent. While offline
 * every call fails the way supabase-js reports a network error. `ask`
 * plays the Ask function: it gets the request body and returns the reply,
 * or a number to reply with that HTTP status instead. After
 * `expireSession`, reading the session offline fails the way auth-js does
 * when the access token has expired and the refresh cannot reach the server.
 */
export function fakeSupabase({
  signedIn = true,
  ask = () => ({ kind: 'limited' }),
}: {
  signedIn?: boolean;
  ask?: (body: unknown) => unknown;
} = {}) {
  const calls: Call[] = [];
  let offline = false;
  let expired = false;
  let session = signedIn ? SESSION : null;
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
      insert: (rows: unknown) => answer(table, 'insert', rows),
      update: (values: unknown) => ({ eq: (column: string, value: unknown) => answer(table, 'update', { values, [column]: value }) }),
      delete: () => ({ match: (filter: unknown) => answer(table, 'delete', filter) }),
    }),
    rpc: jest.fn((name: string, args?: unknown) => answer(name, 'rpc', args ?? null)),
    functions: {
      invoke: jest.fn(async (name: string, options: { body: unknown }) => {
        calls.push({ table: name, op: 'invoke', payload: options.body, ok: !offline });
        if (offline) return { data: null, error: new FunctionsFetchError(new TypeError('Network request failed')) };
        const reply = ask(options.body);
        if (typeof reply === 'number') return { data: null, error: new FunctionsHttpError(new Response(null, { status: reply })) };
        return { data: reply, error: null };
      }),
    },
    auth: {
      getSession: async () =>
        session && expired && offline
          ? { data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } }
          : { data: { session }, error: null },
      signInAnonymously: async () => {
        session = SESSION;
        return { data: { session, user: session.user }, error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: jest.fn(async () => {
        session = null;
        return { error: null };
      }),
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
    /** The access token runs out, so the next session read must refresh it. */
    expireSession() {
      expired = true;
    },
  };
}
