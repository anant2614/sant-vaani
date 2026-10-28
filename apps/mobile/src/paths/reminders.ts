import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useStrings } from '@/i18n/strings';
import { allowNotifications, CHANNEL_ID } from '@/notifications';
import { usePrefs } from '@/prefs/PrefsProvider';

const REMINDER_ID = 'path-reminder';

/**
 * Sets the daily path reminder on the phone itself, so it arrives on time
 * with no signal. Any earlier one is replaced; null turns it off. It never
 * asks for permission: Settings does that when the person picks a time.
 */
export async function scheduleReminder(time: string | null, content: { title: string; body: string }): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  if (!time || !(await allowNotifications({ ask: false }))) return;
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { ...content, data: { url: '/paths' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
  });
}

/** Keeps the scheduled reminder in step with the chosen time and the app's language. */
export function useReminder(): void {
  const { prefs } = usePrefs();
  const t = useStrings();
  useEffect(() => {
    scheduleReminder(prefs.reminderTime, t.reminder).catch((error: unknown) =>
      console.warn('Could not schedule the reminder', error),
    );
  }, [prefs.reminderTime, t]);
}
