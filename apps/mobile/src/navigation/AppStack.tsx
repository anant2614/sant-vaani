import { Stack } from 'expo-router/stack';

import { useTheme } from '@/theme/useTheme';

/** The tabs, with answers, topics, paths and settings opening over them. */
export function AppStack() {
  const { tokens } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
