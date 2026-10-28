import AsyncStorage from '@react-native-async-storage/async-storage';
import { cityById, defaultCityFor, type City } from '@sant-vaani/core';
import { getCalendars, getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { defaultPrefs, PREFS_KEY, readPrefs, type Prefs } from './prefs';

type PrefsContextValue = {
  prefs: Prefs;
  /** The chosen city, or a guess from the phone's time zone. */
  city: City;
  update(patch: Partial<Prefs>): void;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

/** Loads saved preferences before showing anything, so the first screen is already right. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const latest = useRef<Prefs | null>(null);

  useEffect(() => {
    let live = true;
    const defaults = defaultPrefs(getLocales()[0]?.languageCode ?? null);
    AsyncStorage.getItem(PREFS_KEY)
      .catch(() => null)
      .then((saved) => {
        if (!live) return;
        latest.current = readPrefs(saved, defaults);
        setPrefs(latest.current);
      });
    return () => {
      live = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    if (!latest.current) return;
    latest.current = { ...latest.current, ...patch };
    setPrefs(latest.current);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(latest.current)).catch((error) => {
      console.warn('Could not save preferences', error);
    });
  }, []);

  const value = useMemo(() => {
    if (!prefs) return null;
    const timeZone = getCalendars()[0]?.timeZone ?? 'Asia/Kolkata';
    return { prefs, city: cityById(prefs.cityId) ?? defaultCityFor(timeZone), update };
  }, [prefs, update]);

  if (!value) return null;
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error('usePrefs needs a PrefsProvider above it');
  return value;
}
