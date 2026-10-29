import { crashReportOptions } from '@sant-vaani/core';
import * as Sentry from '@sentry/nextjs';

/** Crash reports from the studio's server, only when NEXT_PUBLIC_SENTRY_DSN is set. */
export function register() {
  const options = crashReportOptions(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (options) Sentry.init(options);
}

// Errors in pages, actions and the proxy. Without a DSN there is no client, so nothing is sent.
export const onRequestError = Sentry.captureRequestError;
