import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';

/**
 * A client acting as the service role. It skips row-level security, so it
 * stays inside server functions.
 */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The project's secret key. Supabase gives deployed functions the new keys
 * as SUPABASE_SECRET_KEYS, a JSON object keyed by name, and is retiring the
 * legacy SUPABASE_SERVICE_ROLE_KEY, so that one is only the fallback for
 * projects without new keys yet.
 */
export function secretKey(get: (name: string) => string | undefined = (name) => Deno.env.get(name)): string {
  try {
    const key = JSON.parse(get('SUPABASE_SECRET_KEYS') ?? '{}').default;
    if (typeof key === 'string' && key) return key;
  } catch {
    // Not JSON: use a single key below.
  }
  const single = get('SUPABASE_SECRET_KEY') || get('SUPABASE_SERVICE_ROLE_KEY');
  if (single) return single;
  throw new Error('No secret key: deployed functions get SUPABASE_SECRET_KEYS from Supabase; elsewhere set SUPABASE_SERVICE_ROLE_KEY.');
}

/**
 * The signed-in person's id from the request's bearer token, or null when
 * the token is missing, invalid or belongs to no one (the anon key).
 * Guests count: they sign in anonymously on first open.
 */
export async function userIdFrom(request: Request, db: SupabaseClient): Promise<string | null> {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await db.auth.getClaims(token);
  if (error || !data) return null;
  const sub = data.claims.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}
