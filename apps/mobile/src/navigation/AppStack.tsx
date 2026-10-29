import { Stack } from 'expo-router/stack';

import { useNotificationLinks } from '@/notifications';
import { useReminder } from '@/paths/reminders';
import { useTheme } from '@/theme/useTheme';

/**
 * The tabs, with answers, topics, saints, paths and settings opening over
 * them. Only people past the welcome screen get here, so this is also
 * where notifications are routed and the path reminder is kept set.
 */
export function AppStack() {
  const { tokens } = useTheme();
  useNotificationLinks();
  useReminder();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
