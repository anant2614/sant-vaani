// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
/**
 * Crash reports (Sentry) for the app and the studio, which share one rule:
 * question text, notes and names never leave in a report. A report keeps
 * the error and where it happened. The request, the person and any extra
 * data are dropped, and so is every breadcrumb that could carry what
 * someone typed, touched or logged. Addresses lose their query strings,
 * where typed text travels.
 *
 * A crash in the phone's native code is reported by Sentry's native layer
 * on the next launch, without passing through here. It carries the native
 * stack, the device's state and the breadcrumbs already scrubbed here, and
 * none of the app's addresses carry what someone typed.
 */

export type ReportBreadcrumb = {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
};

export type CrashReport = {
  request?: unknown;
  user?: unknown;
  extra?: unknown;
  transaction?: string;
  contexts?: Record<string, Record<string, unknown> | undefined>;
  breadcrumbs?: ReportBreadcrumb[];
};

/** Breadcrumbs that hold only addresses, screens and app or device states. */
const KEPT = /^(xhr|fetch|navigation|app\.|device\.|sentry\.)/;

const withoutQuery = <T>(value: T): T => (typeof value === 'string' ? (value.replace(/[?#].*$/, '') as T) : value);

/** A path or web address, such as the page a request was for. */
const ADDRESS = /^(\/|https?:\/\/)/;

function scrubContexts(contexts: NonNullable<CrashReport['contexts']>): CrashReport['contexts'] {
  return Object.fromEntries(
    Object.entries(contexts).map(([name, context]) => [
      name,
      context &&
        Object.fromEntries(
          Object.entries(context).map(([key, value]) => [
            key,
            typeof value === 'string' && ADDRESS.test(value) ? withoutQuery(value) : value,
          ]),
        ),
    ]),
  );
}

export function scrubBreadcrumb(crumb: ReportBreadcrumb): ReportBreadcrumb | null {
  const category = crumb.category ?? '';
  if (!KEPT.test(category)) return null;
  // A request or a screen change keeps its address, without the query or a message.
  const { message: _message, data = {}, ...rest } = crumb;
  if (category === 'xhr' || category === 'fetch') {
    return { ...rest, data: { method: data.method, url: withoutQuery(data.url), status_code: data.status_code } };
  }
  if (category === 'navigation') {
    return { ...rest, data: { from: withoutQuery(data.from), to: withoutQuery(data.to) } };
  }
  return crumb;
}

export function scrubReport<R extends CrashReport>(report: R): R {
  const { request: _request, user: _user, extra: _extra, ...rest } = report;
  const scrubbed: CrashReport = rest;
  if (report.transaction !== undefined) scrubbed.transaction = withoutQuery(report.transaction);
  if (report.contexts) scrubbed.contexts = scrubContexts(report.contexts);
  if (report.breadcrumbs) scrubbed.breadcrumbs = report.breadcrumbs.flatMap((crumb) => scrubBreadcrumb(crumb) ?? []);
  return scrubbed as R;
}

/** Sentry's settings when a DSN is configured; without one, no crash reports. */
export function crashReportOptions(dsn: string | null | undefined) {
  const trimmed = dsn?.trim();
  if (!trimmed) return null;
  return { dsn: trimmed, sendDefaultPii: false, beforeSend: scrubReport, beforeBreadcrumb: scrubBreadcrumb } as const;
}
