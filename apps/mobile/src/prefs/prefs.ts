import { THEME_PREFS, type ThemePref } from '@sant-vaani/core';

export type AppLanguage = 'en' | 'hi';

/** What the person chose on this phone. Saved on the phone and copied to their profile. */
export type Prefs = {
  language: AppLanguage;
  themePref: ThemePref;
  /** City for switching at sunset; null means a guess from the phone's time zone. */
  cityId: string | null;
  /** When they confirmed they are 18 or older. Accounts are 18+ at launch. */
  ageConfirmedAt: string | null;
};

export const PREFS_KEY = 'sant-vaani:prefs';

export function defaultPrefs(deviceLanguage: string | null): Prefs {
  return {
    language: deviceLanguage === 'hi' ? 'hi' : 'en',
    themePref: 'sun',
    cityId: null,
    ageConfirmedAt: null,
  };
}

/** Reads saved preferences, keeping defaults for anything missing or malformed. */
export function readPrefs(saved: string | null, defaults: Prefs): Prefs {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = saved ? JSON.parse(saved) : {};
    if (parsed && typeof parsed === 'object') value = parsed as Record<string, unknown>;
  } catch {
    // A damaged entry is replaced on the next save.
  }
  return {
    language: value.language === 'hi' || value.language === 'en' ? value.language : defaults.language,
    themePref: THEME_PREFS.includes(value.themePref as ThemePref) ? (value.themePref as ThemePref) : defaults.themePref,
    cityId: typeof value.cityId === 'string' ? value.cityId : defaults.cityId,
    ageConfirmedAt: typeof value.ageConfirmedAt === 'string' ? value.ageConfirmedAt : defaults.ageConfirmedAt,
  };
}
