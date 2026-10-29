import { scrubBreadcrumb, scrubReport } from '@sant-vaani/core';
import * as Sentry from '@sentry/nextjs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { register } from '../src/instrumentation';

vi.mock('@sentry/nextjs', () => ({ init: vi.fn(), captureRequestError: vi.fn() }));

beforeEach(() => {
  vi.mocked(Sentry.init).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('the studio sends no crash reports without a Sentry DSN', () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
  register();
  expect(Sentry.init).not.toHaveBeenCalled();
});

test('with a DSN, the server scrubs every report before it leaves', () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/3');
  register();
  expect(Sentry.init).toHaveBeenCalledWith(
    expect.objectContaining({
      dsn: 'https://key@o1.ingest.sentry.io/3',
      sendDefaultPii: false,
      beforeSend: scrubReport,
      beforeBreadcrumb: scrubBreadcrumb,
    }),
  );
});
