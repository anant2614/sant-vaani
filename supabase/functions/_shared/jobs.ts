import type { SupabaseClient } from '@supabase/supabase-js';
import { json } from './http.ts';
import { serviceClient } from './supabase.ts';

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i]! ^ y[i]!;
  return difference === 0;
}

/**
 * True when the request carries the scheduler's secret. pg_cron sends it
 * from Vault (see the schedule migration); the function reads CRON_SECRET.
 */
export function fromScheduler(request: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET');
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return Boolean(secret && token && sameSecret(secret, token));
}

/** Serves a scheduled job: POST with the scheduler's secret, replying with what the job did. */
export function serveJob(name: string, run: (db: SupabaseClient) => Promise<Record<string, unknown>>): void {
  Deno.serve(async (request) => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!fromScheduler(request)) return json({ error: 'Only the scheduler runs this job.' }, 401);
    try {
      const summary = await run(serviceClient());
      console.log(`${name} finished`, JSON.stringify(summary));
      return json({ ok: true, ...summary });
    } catch (error) {
      console.error(`${name} failed`, error);
      return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });
}
