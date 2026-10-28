import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import SettingsScreen from '@/app/(app)/settings';
import WelcomeScreen from '@/app/welcome';
import { AppStack } from '@/navigation/AppStack';
import { RootStack } from '@/navigation/RootStack';
import { PREFS_KEY } from '@/prefs/prefs';
import { createUserStore, USER_DATA_KEY } from '@/user/localStore';
import { fakeSupabase } from './fakeSupabase';
import { ADULT, seedPrefs, TestProviders } from './helpers';

const permissions = jest.mocked(Notifications.getPermissionsAsync);
const NOT_ALLOWED = { granted: false, canAskAgain: true } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;
const ALLOWED = { granted: true, canAskAgain: true } as typeof NOT_ALLOWED;

function renderSettings(server: ReturnType<typeof fakeSupabase>) {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders supabase={server.client}>
          <RootStack />
        </TestProviders>
      ),
      welcome: WelcomeScreen,
      '(app)/_layout': AppStack,
      '(app)/(tabs)/index': () => <Text>Today screen</Text>,
      '(app)/settings': SettingsScreen,
    },
    { initialUrl: '/settings' },
  );
}

async function savedPrefs() {
  return JSON.parse((await AsyncStorage.getItem(PREFS_KEY)) ?? '{}');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  permissions.mockResolvedValue(NOT_ALLOWED);
});

test('a daily reminder is set on the phone at the chosen time', async () => {
  permissions.mockResolvedValue(ALLOWED);
  await seedPrefs({ ...ADULT, language: 'en' });
  await renderSettings(fakeSupabase());

  await fireEvent.press(await screen.findByRole('radio', { name: '7:00 am' }));

  expect(await screen.findByRole('radio', { name: '7:00 am', checked: true })).toBeOnTheScreen();
  expect(Notifications.scheduleNotificationAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      identifier: 'path-reminder',
      trigger: expect.objectContaining({ type: 'daily', hour: 7, minute: 0 }),
    }),
  );
  expect(await savedPrefs()).toMatchObject({ reminderTime: '07:00' });
});

test('with notifications refused, Settings says where to turn them on', async () => {
  await seedPrefs({ ...ADULT, language: 'en' });
  await renderSettings(fakeSupabase());

  await fireEvent.press(await screen.findByRole('radio', { name: '8:00 pm' }));

  expect(
    await screen.findByText('Turn on notifications for Sant Vaani in your phone settings first.'),
  ).toBeOnTheScreen();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(screen.getByRole('radio', { name: 'Off', checked: true })).toBeOnTheScreen();
});

test('deleting the account erases it everywhere and starts over at the welcome screen', async () => {
  await seedPrefs({ ...ADULT, language: 'en', cityId: 'pune', reminderTime: '07:00' });
  await createUserStore().saveNote({ chapter: 2, verse: 47, body: 'Do the work, let go of the result.' });
  const server = fakeSupabase();
  await renderSettings(server);

  await fireEvent.press(await screen.findByRole('button', { name: 'Delete account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete everything' }));

  expect(await screen.findByRole('checkbox', { name: 'I am 18 or older' })).toBeOnTheScreen();
  expect(server.fake.rpc).toHaveBeenCalledWith('delete_my_account');
  expect(server.fake.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(await AsyncStorage.getItem(USER_DATA_KEY)).toBeNull();
  expect(await savedPrefs()).toMatchObject({ ageConfirmedAt: null, cityId: null, reminderTime: null });
});

test('without a connection the account and its notes stay', async () => {
  await seedPrefs({ ...ADULT, language: 'en' });
  await createUserStore().saveNote({ chapter: 2, verse: 47, body: 'Do the work, let go of the result.' });
  const server = fakeSupabase();
  server.setOffline(true);
  await renderSettings(server);

  await fireEvent.press(await screen.findByRole('button', { name: 'Delete account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete everything' }));

  expect(
    await screen.findByText("Your account wasn't deleted. Check your connection and try again."),
  ).toBeOnTheScreen();
  expect(await AsyncStorage.getItem(USER_DATA_KEY)).toContain('Do the work');
  expect(await savedPrefs()).toMatchObject({ ageConfirmedAt: ADULT.ageConfirmedAt });
});
