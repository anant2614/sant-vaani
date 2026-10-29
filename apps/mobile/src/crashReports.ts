import { crashReportOptions } from '@sant-vaani/core';

import { config } from '@/config';

/**
 * Starts Sentry when the build has a DSN; otherwise the SDK never loads.
 * Every report and breadcrumb goes through the shared scrubber first, so
 * questions, notes and names never leave the phone.
 */
export function startCrashReports(dsn: string | null = config.sentryDsn): boolean {
  const options = crashReportOptions(dsn);
  if (!options) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
  // iOS's own record of each request would reach a native crash report
  // with its full address, past the scrubber; the scrubbed JS record stays.
  Sentry.init({ ...options, enableNetworkBreadcrumbs: false });
  return true;
}
