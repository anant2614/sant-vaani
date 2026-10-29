import { describe, expect, it } from 'vitest';
import { crashReportOptions, scrubBreadcrumb, scrubReport } from '../src/index.ts';

describe('crash reports', () => {
  it('are off without a DSN', () => {
    expect(crashReportOptions(undefined)).toBeNull();
    expect(crashReportOptions('  ')).toBeNull();
  });

  it('send no personal data by default and pass every report through the scrubber', () => {
    const options = crashReportOptions(' https://key@o1.ingest.sentry.io/2 ');
    expect(options).toEqual({
      dsn: 'https://key@o1.ingest.sentry.io/2',
      sendDefaultPii: false,
      beforeSend: scrubReport,
      beforeBreadcrumb: scrubBreadcrumb,
    });
  });

  it('keep the error but not the request, the person or extra data', () => {
    const report = scrubReport({
      exception: { values: [{ type: 'Error', value: 'Could not sync notes: timeout' }] },
      request: { url: 'https://x.supabase.co/rest/v1/notes', data: '{"body":"my private note"}', cookies: { sb: 'token' } },
      user: { id: 'user-1', ip_address: '1.2.3.4' },
      extra: { question: 'why do I feel so alone' },
      breadcrumbs: [
        { category: 'console', message: 'asked: why do I feel so alone' },
        { category: 'fetch', data: { method: 'POST', url: 'https://x.supabase.co/functions/v1/ask?debug=1', status_code: 200 } },
      ],
    });
    expect(report).toEqual({
      exception: { values: [{ type: 'Error', value: 'Could not sync notes: timeout' }] },
      breadcrumbs: [{ category: 'fetch', data: { method: 'POST', url: 'https://x.supabase.co/functions/v1/ask', status_code: 200 } }],
    });
  });

  it('keep the page an error happened on without its query string', () => {
    const report = scrubReport({
      transaction: '/backlog?q=alone',
      contexts: {
        nextjs: { request_path: '/backlog?q=why%20do%20I%20feel%20alone', router_path: '/(studio)/backlog', route_type: 'action' },
        page: { url: 'https://studio.example.com/backlog#alone' },
        os: { name: 'Ubuntu Linux', kernel_version: '#38-Ubuntu SMP' },
      },
    });
    expect(report).toEqual({
      transaction: '/backlog',
      contexts: {
        nextjs: { request_path: '/backlog', router_path: '/(studio)/backlog', route_type: 'action' },
        page: { url: 'https://studio.example.com/backlog' },
        os: { name: 'Ubuntu Linux', kernel_version: '#38-Ubuntu SMP' },
      },
    });
  });

  it('drop breadcrumbs that can carry what someone typed, touched or logged', () => {
    for (const category of ['console', 'touch', 'ui.click', 'ui.input', 'redux.action', undefined]) {
      expect(scrubBreadcrumb({ category, message: 'why do I feel so alone' }), String(category)).toBeNull();
    }
  });

  it('keep web requests and navigation without their query strings', () => {
    expect(
      scrubBreadcrumb({
        category: 'xhr',
        message: 'GET /rest/v1/backlog_items?example=ilike.*alone*',
        data: { method: 'GET', url: '/rest/v1/backlog_items?example=ilike.*alone*#top', status_code: 200, body: 'alone' },
      }),
    ).toEqual({ category: 'xhr', data: { method: 'GET', url: '/rest/v1/backlog_items', status_code: 200 } });
    expect(scrubBreadcrumb({ category: 'navigation', data: { from: '/backlog?q=alone', to: '/answers/q-1' } })).toEqual({
      category: 'navigation',
      data: { from: '/backlog', to: '/answers/q-1' },
    });
  });

  it('keep app and device events as they are', () => {
    const crumb = { category: 'app.lifecycle', type: 'navigation', data: { state: 'background' } };
    expect(scrubBreadcrumb(crumb)).toEqual(crumb);
    expect(scrubBreadcrumb({ category: 'device.orientation', data: { position: 'portrait' } })).not.toBeNull();
  });
});
