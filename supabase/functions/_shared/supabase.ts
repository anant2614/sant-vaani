import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.ts';

/**
 * A client acting as the service role. It skips row-level security, so it
 * stays inside server functions.
 */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
