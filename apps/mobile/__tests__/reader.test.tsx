import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import ScripturesScreen from '@/app/(app)/(tabs)/scriptures';
import VerseScreen from '@/app/(app)/gita/[chapter]/[verse]';
import ChapterScreen from '@/app/(app)/gita/[chapter]/index';
import { jsonGita, type GitaJson } from '@/gita/queries';
import { USER_DATA_KEY } from '@/user/localStore';
import { ADULT, seedPrefs, TestProviders } from './helpers';

const gita = jsonGita(require('../assets/db/gita.json') as GitaJson);

function renderReader(initialUrl: string) {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders gita={gita}>
          <Slot />
        </TestProviders>
      ),
      scriptures: ScripturesScreen,
      'gita/[chapter]/index': ChapterScreen,
      'gita/[chapter]/[verse]': VerseScreen,
    },
    { initialUrl },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await seedPrefs({ ...ADULT, language: 'en' });
});

test('the Scriptures tab lists the 18 chapters and opens one', async () => {
  const { getPathname } = await renderReader('/scriptures');

  const chapter2 = await screen.findByRole('button', { name: 'Chapter 2: The Yoga of Knowledge' });
  expect(screen.getAllByRole('button', { name: /^Chapter \d+:/ })).toHaveLength(18);
  await fireEvent.press(chapter2);

  expect(getPathname()).toBe('/gita/2');
  expect(await screen.findByRole('button', { name: 'Gita 2.72' })).toBeOnTheScreen();
  expect(screen.getAllByRole('button', { name: /^Gita 2\.\d+$/ })).toHaveLength(72);
});

test('a note written in the reader stays on the phone', async () => {
  await renderReader('/gita/2/47');

  expect(await screen.findByText(/कर्मण्येवाधिकारस्ते मा फलेषु/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Your note'), 'Do the work; leave the fruit.');
  await fireEvent.press(screen.getByRole('button', { name: 'Save note' }));

  expect(await screen.findByText('Delete note')).toBeOnTheScreen();
  const saved = JSON.parse((await AsyncStorage.getItem(USER_DATA_KEY)) ?? '{}');
  expect(Object.values(saved.notes)).toEqual([
    expect.objectContaining({ chapter: 2, verse: 47, body: 'Do the work; leave the fruit.' }),
  ]);
});

test('a saved verse is listed under your verses', async () => {
  await renderReader('/gita/2/47');

  await fireEvent.press(await screen.findByRole('button', { name: 'Save this verse' }));
  expect(await screen.findByRole('button', { name: 'Remove from saved' })).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Your note'), 'Read again tomorrow.');
  await fireEvent.press(screen.getByRole('button', { name: 'Save note' }));
  await screen.findByText('Delete note');

  await act(() => router.push('/scriptures'));

  expect(await screen.findByText('Your verses')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Gita 2.47: Read again tomorrow.' })).toBeOnTheScreen();
});

test('the reader runs on into the next chapter', async () => {
  const { getPathname } = await renderReader('/gita/2/72');

  await fireEvent.press(await screen.findByRole('button', { name: 'Next verse: Gita 3.1' }));

  expect(getPathname()).toBe('/gita/3/1');
  expect(await screen.findByRole('button', { name: 'Previous verse: Gita 2.72' })).toBeOnTheScreen();
});

test('a verse that does not exist says so', async () => {
  await renderReader('/gita/2/99');

  expect(await screen.findByText('This verse is not in the Gita.')).toBeOnTheScreen();
});
