import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Share } from 'react-native';

import AnswerScreen from '@/app/(app)/answer/[id]';
import { embedUrl } from '@/player/embed';
import { ADULT, seedPrefs, TestProviders } from './helpers';

function renderAnswer(id: string) {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders>
          <Slot />
        </TestProviders>
      ),
      'answer/[id]': AnswerScreen,
    },
    { initialUrl: `/answer/${id}` },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await seedPrefs({ ...ADULT, language: 'en' });
});

test('answer screen lists clips with saint and length', async () => {
  await renderAnswer('answer-5');

  expect(await screen.findByText('How do I stop comparing myself to others?')).toBeOnTheScreen();
  const clips = screen.getAllByRole('button', { name: /^Sample Saint/ });
  expect(clips.map((clip) => clip.props.accessibilityLabel)).toEqual([
    'Sample Saint A, 2:30: Watching thoughts without following them.',
    'Sample Saint B, 2:30: Every flower blooms in its own season.',
    'Sample Saint C, 2:00: Your path is yours alone.',
  ]);
  expect(screen.getByText('Name one thing you are grateful for in your own life.')).toBeOnTheScreen();
  expect(screen.getByText('Gita 3.35')).toBeOnTheScreen();
});

test('one player at a time, for the clip the person chose', async () => {
  await renderAnswer('answer-5');

  const player = await screen.findByTestId('youtube-player');
  expect(player.props.source.html).toContain(embedUrl({ youtubeId: 'aaaaaaaaaa1', start: 600, end: 750 }));

  await fireEvent.press(screen.getByRole('button', { name: /^Sample Saint C/ }));

  const players = screen.getAllByTestId('youtube-player');
  expect(players).toHaveLength(1);
  expect(players[0]?.props.source.html).toContain('cccccccccc3');
});

test('sharing sends the question with a link to the answer', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
  await renderAnswer('answer-5');

  await fireEvent.press(await screen.findByRole('button', { name: 'Share this answer' }));

  expect(share).toHaveBeenCalledWith({
    message: expect.stringContaining('How do I stop comparing myself to others?'),
  });
});

test('an answer that is no longer in the catalogue says so', async () => {
  await renderAnswer('answer-404');

  expect(await screen.findByText('This answer is no longer available.')).toBeOnTheScreen();
  expect(within(screen.getByRole('heading')).queryByText(/Sample Saint/)).not.toBeOnTheScreen();
});
