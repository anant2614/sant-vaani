import type PostHog from 'posthog-react-native';

import { config } from '@/config';

/**
 * Every event the app sends, with the only properties it may carry. Question
 * text, notes and names never appear here: ids, slugs, counts and timings
 * only. Adding an event means adding it to this list first.
 */
export type AnalyticsEvents = {
  /** Today's content was on screen; ms counts from the app starting. */
  today_shown: { ms: number; source: 'cache' | 'bundled' | 'network' };
  catalogue_loaded: { source: 'cache' | 'bundled'; ms: number };
  welcome_completed: { language: 'en' | 'hi' };
  topic_opened: { topic: string; from: 'today' | 'ask' };
  answer_opened: { answer: string; from: 'today' | 'topic' | 'ask' | 'share' | 'push' };
};

let client: PostHog | null | undefined;

function posthog(): PostHog | null {
  if (client !== undefined) return client;
  if (!config.posthog) return (client = null);
  // Loaded only when a key is configured, so builds without one never start it.
  const { default: PostHogClient } = require('posthog-react-native') as typeof import('posthog-react-native');
  client = new PostHogClient(config.posthog.key, {
    host: config.posthog.host,
    captureAppLifecycleEvents: true,
    enableSessionReplay: false,
  });
  return client;
}

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]): void {
  try {
    posthog()?.capture(event, properties);
  } catch (error) {
    console.warn('Analytics failed', error);
  }
}

/** Ties events to the guest account's random id, which carries nothing personal. */
export function identify(userId: string): void {
  posthog()?.identify(userId);
}

/** After an account is deleted, start over with a fresh anonymous id. */
export function resetAnalytics(): void {
  posthog()?.reset();
}
