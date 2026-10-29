import '@/startup';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AppProviders } from '@/AppProviders';
import { startCrashReports } from '@/crashReports';
import { RootStack } from '@/navigation/RootStack';
import { fontFiles } from '@/theme/fonts';

// First, so a crash while the app starts is reported too (when the build has a DSN).
startCrashReports();

// The splash stays up until fonts, preferences and the catalogue are read
// from the phone, so the first screen appears complete.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 400 });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  if (!fontsLoaded && !fontError) return null;
  return (
    <AppProviders>
      <HideSplash />
      <RootStack />
    </AppProviders>
  );
}

/** Mounts only once every provider above it has loaded. */
function HideSplash() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return null;
}
