import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import PathScreen from '@/app/(app)/path/[slug]';
import { pathProgress } from '@/paths/progress';
import { createUserStore, USER_DATA_KEY } from '@/user/localStore';
import { syncUserData } from '@/user/sync';
import { fakeSupabase } from './fakeSupabase';
import { sampleCatalogue, TEST_MORNING } from './fixtures/catalogue';
import { ADULT, seedPrefs, TestProviders } from './helpers';

const NOW = new Date('2026-10-28T01:10:00.000Z');
const openStore = () => createUserStore({ clock: () => NOW });

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('path day completes once', async () => {
  const server = fakeSupabase();
  const store = openStore();

  await store.completeDay('path-1', 1);
  await store.completeDay('path-1', 1);
  await syncUserData(store, server.client);
  await syncUserData(store, server.client);

  expect(Object.values((await store.load()).progress)).toEqual([
    { pathId: 'path-1', day: 1, completedAt: NOW.toISOString() },
  ]);
  expect(server.sent('path_progress').map((call) => call.payload)).toEqual([
    {
      rows: [{ path_id: 'path-1', day: 1, completed_at: NOW.toISOString() }],
      options: { onConflict: 'user_id,path_id,day', ignoreDuplicates: true },
    },
  ]);
});

describe('which day of a path is open', () => {
  const at = (iso: string) => ({ completedAt: iso });
  const morning = new Date(2026, 9, 28, 7, 0);

  test('a new path opens on day 1', () => {
    expect(pathProgress({}, morning)).toEqual({ completed: [], current: 1, opensTomorrow: false, done: false });
  });

  test('the next day opens the day after the last one was done', () => {
    const doneToday = { 1: at(new Date(2026, 9, 28, 6, 30).toISOString()) };
    const doneYesterday = { 1: at(new Date(2026, 9, 27, 21, 0).toISOString()) };

    expect(pathProgress(doneToday, morning)).toMatchObject({ completed: [1], current: 2, opensTomorrow: true });
    expect(pathProgress(doneYesterday, morning)).toMatchObject({ completed: [1], current: 2, opensTomorrow: false });
  });

  test('seven days done is the end of the path', () => {
    const all = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((day) => [day, at(new Date(2026, 9, 20 + day).toISOString())]));

    expect(pathProgress(all, morning)).toEqual({ completed: [1, 2, 3, 4, 5, 6, 7], current: null, opensTomorrow: false, done: true });
  });
});

test("marking today's step done records the day once and opens the next one tomorrow", async () => {
  await seedPrefs({ ...ADULT, language: 'en' });
  await renderRouter(
    {
      _layout: () => (
        <TestProviders catalogue={sampleCatalogue} now={TEST_MORNING}>
          <Slot />
        </TestProviders>
      ),
      'path/[slug]': PathScreen,
    },
    { initialUrl: '/path/calming-a-restless-mind' },
  );

  await fireEvent.press(await screen.findByRole('button', { name: 'Mark day 1 done' }));

  expect(await screen.findByText('Day 2 opens tomorrow.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mark day 1 done' })).not.toBeOnTheScreen();
  const saved = JSON.parse((await AsyncStorage.getItem(USER_DATA_KEY)) ?? '{}');
  expect(Object.values(saved.progress)).toEqual([expect.objectContaining({ pathId: 'path-1', day: 1 })]);
});
