import { assertEquals, assertThrows } from '@std/assert';
import { secretKey } from '../_shared/supabase.ts';

const settings = (values: Record<string, string>) => (name: string) => values[name];

Deno.test('server functions use the new secret key when Supabase provides one', () => {
  const key = secretKey(
    settings({
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_new' }),
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-jwt',
    }),
  );
  assertEquals(key, 'sb_secret_new');
});

Deno.test('server functions fall back to the single or legacy key', () => {
  assertEquals(secretKey(settings({ SUPABASE_SECRET_KEY: 'sb_secret_local' })), 'sb_secret_local');
  assertEquals(secretKey(settings({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-jwt' })), 'legacy-jwt');
  assertEquals(
    secretKey(settings({ SUPABASE_SECRET_KEYS: '{}', SUPABASE_SERVICE_ROLE_KEY: 'legacy-jwt' })),
    'legacy-jwt',
    'a project with no new keys yet',
  );
  assertEquals(
    secretKey(settings({ SUPABASE_SECRET_KEYS: 'not json', SUPABASE_SERVICE_ROLE_KEY: 'legacy-jwt' })),
    'legacy-jwt',
  );
});

Deno.test('server functions say which key is missing', () => {
  assertThrows(() => secretKey(settings({})), Error, 'SUPABASE_SECRET_KEYS');
});
