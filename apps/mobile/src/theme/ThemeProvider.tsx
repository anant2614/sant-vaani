import {
  nextSchemeChange,
  resolveScheme,
  schemeTokens,
  type Scheme,
  type ThemeTokens,
} from '@sant-vaani/core';
import * as SystemUI from 'expo-system-ui';
import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { useClock } from '@/clock';
import { usePrefs } from '@/prefs/PrefsProvider';

export type Theme = { scheme: Scheme; tokens: ThemeTokens };

export const ThemeContext = createContext<Theme | null>(null);

/**
 * Picks Ganga Ghat or Chandni from the person's choice. Following the sun,
 * it re-renders once at the next sunrise or sunset rather than polling, and
 * checks again whenever the app comes back to the front.
 */
export function ThemeProvider({
  systemScheme,
  children,
}: {
  /** Overrides the phone's dark mode setting, for tests and screenshots. */
  systemScheme?: Scheme | null;
  children: ReactNode;
}) {
  const { prefs, city } = usePrefs();
  const clock = useClock();
  const phone = useColorScheme();
  const system = systemScheme !== undefined ? systemScheme : phone === 'dark' || phone === 'light' ? phone : null;
  const [now, setNow] = useState(clock);
  const scheme = resolveScheme(prefs.themePref, now, city, system);
  const followsSun = prefs.themePref === 'sun' || (prefs.themePref === 'system' && system === null);

  useEffect(() => {
    if (!followsSun) return;
    const next = nextSchemeChange(clock(), city);
    if (!next) return;
    const timer = setTimeout(() => setNow(clock()), Math.max(0, next.getTime() - clock().getTime()) + 1000);
    return () => clearTimeout(timer);
  }, [followsSun, city, now, clock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(clock());
    });
    return () => subscription.remove();
  }, [clock]);

  const theme = useMemo(() => ({ scheme, tokens: schemeTokens[scheme] }), [scheme]);

  useEffect(() => {
    // Behind every screen, so transitions never flash white.
    SystemUI.setBackgroundColorAsync(theme.tokens.bg).catch(() => {});
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
