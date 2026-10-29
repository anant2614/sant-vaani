import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Catalogue } from '@sant-vaani/core';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Text } from 'react-native';

import TodayScreen from '@/app/(app)/(tabs)/index';
import { sampleCatalogue } from './fixtures/catalogue';
import { ADULT, seedPrefs, TestProviders } from './helpers';

function renderToday(catalogue: Catalogue = sampleCatalogue) {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders catalogue={catalogue}>
          <Slot />
        </TestProviders>
      ),
      index: TodayScreen,
      'topic/[slug]': () => <Text>Topic</Text>,
    },
    { initialUrl: '/' },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("Today renders today's question, chips and verse from the catalogue", async () => {
  await seedPrefs({ ...ADULT, language: 'en' });
  await renderToday();

  expect(await screen.findByText('How do I stop comparing myself to others?')).toBeOnTheScreen();
  expect(screen.getByText('3 saints · 7 min')).toBeOnTheScreen();
  expect(screen.getByText('Morning · 6:40 am')).toBeOnTheScreen();
  expect(screen.getByText('Shubh prabhat')).toBeOnTheScreen();

  const chips = within(screen.getByLabelText("What's on your mind?")).getAllByRole('button');
  expect(chips.map((chip) => chip.props.accessibilityLabel)).toEqual([
    'Overthinking',
    'Anger',
    'Comparing yourself to others',
    'Studies and exams',
    'Grief and loss',
  ]);

  expect(screen.getByText('Gita 2.47')).toBeOnTheScreen();
  expect(await screen.findByText(/कर्मण्येवाधिकारस्ते मा फलेषु/)).toBeOnTheScreen();
  expect(screen.getByText('Calming a restless mind')).toBeOnTheScreen();
});

test('Today speaks Hindi when the app is set to Hindi', async () => {
  await seedPrefs({ ...ADULT, language: 'hi' });
  await renderToday();

  expect(await screen.findByText('दूसरों से अपनी तुलना करना कैसे छोड़ूँ?')).toBeOnTheScreen();
  expect(screen.getByText('आज का मार्गदर्शन')).toBeOnTheScreen();
  expect(screen.getByText('3 संत · 7 मिनट')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'ज़्यादा सोचना' })).toBeOnTheScreen();
  expect(screen.getByText('गीता 2.47')).toBeOnTheScreen();
});

test('Today stays calm before any answers are published', async () => {
  await seedPrefs(ADULT);
  await renderToday({ ...sampleCatalogue, topics: [], questions: [], answers: [], clips: [], saints: [], paths: [] });

  expect(await screen.findByText('Gita 2.47')).toBeOnTheScreen();
  expect(screen.queryByText("Today's guidance")).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("What's on your mind?")).not.toBeOnTheScreen();
});

test('a topic chip opens that topic', async () => {
  await seedPrefs(ADULT);
  const { getPathname } = await renderToday();

  await fireEvent.press(await screen.findByRole('button', { name: 'Anger' }));

  expect(getPathname()).toBe('/topic/anger');
});
