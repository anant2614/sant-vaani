// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import { CITIES, type City } from './cities.ts';
import { sunTimes } from './sun.ts';
import type { Scheme } from './tokens.ts';

/**
 * 'sun' switches to Chandni at sunset and back at sunrise for the chosen
 * city; 'system' follows the phone's dark mode; 'light' and 'dark' pin one look.
 */
export type ThemePref = 'sun' | 'system' | 'light' | 'dark';

export const THEME_PREFS: ThemePref[] = ['sun', 'system', 'light', 'dark'];

export function schemeFromSun(now: Date, city: City | null): Scheme {
  const place = city ?? (CITIES[0] as City);
  const { sunrise, sunset, polar } = sunTimes(now, place.lat, place.lon);
  if (polar === 'day') return 'light';
  if (polar === 'night' || !sunrise || !sunset) return 'dark';
  return now >= sunrise && now < sunset ? 'light' : 'dark';
}

export function resolveScheme(
  pref: ThemePref,
  now: Date,
  city: City | null,
  system: Scheme | null,
): Scheme {
  switch (pref) {
    case 'light':
    case 'dark':
      return pref;
    case 'system':
      return system ?? schemeFromSun(now, city);
    case 'sun':
      return schemeFromSun(now, city);
  }
}

/** When the look will next change, so the app can schedule one re-render instead of polling. */
export function nextSchemeChange(now: Date, city: City | null): Date | null {
  const place = city ?? (CITIES[0] as City);
  const today = sunTimes(now, place.lat, place.lon);
  const candidates = [today.sunrise, today.sunset].filter((d): d is Date => !!d && d > now);
  if (candidates.length > 0) return new Date(Math.min(...candidates.map((d) => d.getTime())));
  const tomorrow = sunTimes(new Date(now.getTime() + 86_400_000), place.lat, place.lon);
  const later = [tomorrow.sunrise, tomorrow.sunset].filter((d): d is Date => !!d && d > now);
  return later.length > 0 ? new Date(Math.min(...later.map((d) => d.getTime()))) : null;
}
