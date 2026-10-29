import { assertEquals } from '@std/assert';
import { fromScheduler } from '../_shared/jobs.ts';

Deno.test('jobs run only with the scheduler’s secret', () => {
  Deno.env.set('CRON_SECRET', 'a-long-random-secret');
  const request = (authorization?: string) =>
    new Request('http://localhost/functions/v1/build-catalogue', {
      method: 'POST',
      headers: authorization ? { Authorization: authorization } : {},
    });
  assertEquals(fromScheduler(request('Bearer a-long-random-secret')), true);
  assertEquals(fromScheduler(request('Bearer a-long-random-secreT')), false);
  assertEquals(fromScheduler(request('Bearer ')), false);
  assertEquals(fromScheduler(request()), false);

  Deno.env.delete('CRON_SECRET');
  assertEquals(fromScheduler(request('Bearer undefined')), false, 'with no secret set, nothing gets in');
});
