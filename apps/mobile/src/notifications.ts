import type { SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { track } from '@/analytics';

/** Android groups our notifications under this channel in the phone's settings. */
export const CHANNEL_ID = 'default';

if (Platform.OS !== 'web') {
  // Shown as a banner even while the app is open, without sound or a badge.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for permission to notify, once the person has chosen something that
 * needs it. Returns whether notifications are allowed. Never asks again
 * after a refusal: the phone's settings are the only way back.
 */
export async function allowNotifications({ ask }: { ask: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Sant Vaani',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Registers this phone for "your question was answered" pushes. Needs a
 * real device and the EAS project id that push tokens are issued under;
 * without them it does nothing.
 */
export async function registerForPush(client: SupabaseClient): Promise<boolean> {
  if (Platform.OS === 'web' || !Device.isDevice) return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('No EAS project id, so this build cannot receive pushes');
    return false;
  }
  if (!(await allowNotifications({ ask: true }))) return false;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await client.rpc('register_push_token', { token, platform: Platform.OS });
  if (error) throw new Error(`Could not register for notifications: ${error.message}`);
  return true;
}

/** The last notification opened, so remounting the app's screens does not open it twice. */
let opened: string | null = null;

/** Opens the screen a tapped notification points at, including the one that launched the app. */
export function useNotificationLinks(): void {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (!response || typeof url !== 'string' || !url.startsWith('/')) return;
      const id = `${response.notification.request.identifier}:${response.notification.date}`;
      if (id === opened) return;
      opened = id;
      const answer = /^\/answer\/([^/?#]+)/.exec(url)?.[1];
      if (answer) track('answer_opened', { answer, from: 'push' });
      router.push(url as Parameters<typeof router.push>[0]);
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);
}
