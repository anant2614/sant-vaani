import { scrubBreadcrumb, scrubReport } from '@sant-vaani/core';
import * as Sentry from '@sentry/react-native';

import { startCrashReports } from '@/crashReports';

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }));

beforeEach(() => {
  jest.mocked(Sentry.init).mockClear();
});

test('a build without a Sentry DSN sends no crash reports', () => {
  expect(startCrashReports(null)).toBe(false);
  expect(Sentry.init).not.toHaveBeenCalled();
});

test('with a DSN, every report and breadcrumb goes through the scrubber', () => {
  expect(startCrashReports('https://key@o1.ingest.sentry.io/2')).toBe(true);
  expect(Sentry.init).toHaveBeenCalledWith(
    expect.objectContaining({
      dsn: 'https://key@o1.ingest.sentry.io/2',
      sendDefaultPii: false,
      beforeSend: scrubReport,
      beforeBreadcrumb: scrubBreadcrumb,
    }),
  );
});

test('the native layer keeps no web addresses of its own, which a native crash would send unscrubbed', () => {
  startCrashReports('https://key@o1.ingest.sentry.io/2');
  expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ enableNetworkBreadcrumbs: false }));
});
