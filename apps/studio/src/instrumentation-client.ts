import { crashReportOptions } from '@sant-vaani/core';
import * as Sentry from '@sentry/nextjs';

// Crash reports from curators' browsers, only when NEXT_PUBLIC_SENTRY_DSN is set at build time.
const options = crashReportOptions(process.env.NEXT_PUBLIC_SENTRY_DSN);
if (options) Sentry.init(options);
