import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import WelcomeScreen from '@/app/welcome';
import { AppStack } from '@/navigation/AppStack';
import { RootStack } from '@/navigation/RootStack';
import { PREFS_KEY } from '@/prefs/prefs';
import { ADULT, seedPrefs, TestProviders } from './helpers';

function renderApp() {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders>
          <RootStack />
        </TestProviders>
      ),
      welcome: WelcomeScreen,
      '(app)/_layout': AppStack,
      '(app)/(tabs)/index': () => <Text>Today screen</Text>,
      '(app)/settings': () => <Text>Settings screen</Text>,
    },
    { initialUrl: '/' },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('welcome requires the 18+ confirmation', async () => {
  await renderApp();

  const confirm = await screen.findByRole('checkbox', { name: 'I am 18 or older' });
  const next = screen.getByRole('button', { name: 'Continue' });
  expect(screen).toHavePathname('/welcome');
  expect(next).toBeDisabled();

  await fireEvent.press(next);
  expect(screen).toHavePathname('/welcome');
  expect(screen.queryByText('Today screen')).not.toBeOnTheScreen();

  await fireEvent.press(confirm);
  expect(confirm).toBeChecked();
  expect(next).toBeEnabled();
  await fireEvent.press(next);

  expect(await screen.findByText('Today screen')).toBeOnTheScreen();
  expect(screen).toHavePathname('/');
  const saved = JSON.parse((await AsyncStorage.getItem(PREFS_KEY)) ?? '{}');
  expect(saved.ageConfirmedAt).toEqual(expect.any(String));
});

test('people who already confirmed go straight to Today', async () => {
  await seedPrefs(ADULT);
  await renderApp();

  expect(await screen.findByText('Today screen')).toBeOnTheScreen();
  expect(screen).toHavePathname('/');
});

test('the welcome screen offers Hindi', async () => {
  await renderApp();

  await fireEvent.press(await screen.findByRole('radio', { name: 'हिन्दी' }));

  expect(await screen.findByRole('checkbox', { name: 'मेरी आयु 18 वर्ष या उससे अधिक है' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'आगे बढ़ें' })).toBeDisabled();
});
