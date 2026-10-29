import { CATALOGUE_BUCKET, CATALOGUE_FILE } from '@sant-vaani/core';

/**
 * Settings baked in at build time from EXPO_PUBLIC_ variables (see
 * .env.example). Each one is optional, so the app still opens with only
 * what ships inside it: no sign-in, no analytics, no crash reports and no
 * catalogue refresh.
 * Expo inlines EXPO_PUBLIC_ variables only when they are read by their full
 * name, which is why each is spelled out below.
 */
const supabaseUrl = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseKey = clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const config = {
  supabase: supabaseUrl && supabaseKey ? { url: supabaseUrl, key: supabaseKey } : null,
  /** Where the nightly catalogue file is published. */
  catalogueUrl:
    clean(process.env.EXPO_PUBLIC_CATALOGUE_URL) ??
    (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${CATALOGUE_BUCKET}/${CATALOGUE_FILE}` : null),
  posthog: clean(process.env.EXPO_PUBLIC_POSTHOG_KEY)
    ? {
        key: clean(process.env.EXPO_PUBLIC_POSTHOG_KEY) as string,
        host: clean(process.env.EXPO_PUBLIC_POSTHOG_HOST) ?? 'https://eu.i.posthog.com',
      }
    : null,
  /** Sentry's address for crash reports. Leave it empty to send none. */
  sentryDsn: clean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  /** The website, for the terms and privacy pages and the player's origin. */
  siteUrl: clean(process.env.EXPO_PUBLIC_SITE_URL),
  /** Where shared links point: <shareBaseUrl>/a/<answer id>. Defaults to the website. */
  shareBaseUrl: clean(process.env.EXPO_PUBLIC_SHARE_BASE_URL) ?? clean(process.env.EXPO_PUBLIC_SITE_URL),
};

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : null;
}
