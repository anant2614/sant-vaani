import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { usePrefs } from '@/prefs/PrefsProvider';
import { useTheme } from '@/theme/useTheme';

/**
 * The welcome screen until the person confirms they are 18 or older; the
 * app after that. Everything inside (app) sits behind the same guard, so
 * a link cannot skip the question.
 */
export function RootStack() {
  const { prefs } = usePrefs();
  const { scheme, tokens } = useTheme();
  const adult = prefs.ageConfirmedAt !== null;

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: tokens.accentText,
        background: tokens.bg,
        card: tokens.navBg,
        text: tokens.ink,
        border: tokens.line,
        notification: tokens.accent,
      },
    };
  }, [scheme, tokens]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg }, animation: 'fade' }}>
        <Stack.Protected guard={adult}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!adult}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}
