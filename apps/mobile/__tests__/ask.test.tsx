import AsyncStorage from '@react-native-async-storage/async-storage';
import { HELPLINES } from '@sant-vaani/core';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import AskScreen from '@/app/(app)/(tabs)/ask';
import AnswerScreen from '@/app/(app)/answer/[id]';
import CrisisScreen from '@/app/(app)/crisis';
import TopicScreen from '@/app/(app)/topic/[slug]';
import { fakeSupabase } from './fakeSupabase';
import { ADULT, seedPrefs, TestProviders } from './helpers';

function renderAsk(server: ReturnType<typeof fakeSupabase> | null) {
  return renderRouter(
    {
      _layout: () => (
        <TestProviders supabase={server?.client ?? null}>
          <Slot />
        </TestProviders>
      ),
      ask: AskScreen,
      crisis: CrisisScreen,
      'answer/[id]': AnswerScreen,
      'topic/[slug]': TopicScreen,
    },
    { initialUrl: '/ask' },
  );
}

async function ask(question: string) {
  await fireEvent.changeText(await screen.findByLabelText('Your question'), question);
  const button = screen.getByRole('button', { name: 'Ask' });
  await screen.findByRole('button', { name: 'Ask', disabled: false });
  await fireEvent.press(button);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await seedPrefs({ ...ADULT, language: 'en' });
});

test('crisis response opens the helpline screen before any clip', async () => {
  // Words the phone's check lets through, which the server's model flags.
  const server = fakeSupabase({ ask: () => ({ kind: 'crisis', helplines: HELPLINES }) });
  const { getPathname } = await renderAsk(server);

  await ask('everything feels pointless lately');

  expect(await screen.findByRole('button', { name: 'Call 14416' })).toBeOnTheScreen();
  expect(getPathname()).toBe('/crisis');
  expect(screen.getByRole('button', { name: 'Call 1800-891-4416' })).toBeOnTheScreen();
  expect(screen.queryByText(/Sample Saint/)).not.toBeOnTheScreen();
  expect(server.fake.functions.invoke).toHaveBeenCalledWith('ask', {
    body: { question: 'everything feels pointless lately', uiLanguage: 'en' },
  });
});

test('crisis words reach the helplines with no signal, and never leave the phone', async () => {
  const server = fakeSupabase();
  server.setOffline(true);
  const { getPathname } = await renderAsk(server);

  await ask('I do not want to live any more');

  expect(await screen.findByRole('button', { name: 'Call 14416' })).toBeOnTheScreen();
  expect(getPathname()).toBe('/crisis');
  expect(server.fake.functions.invoke).not.toHaveBeenCalled();
});

test('a strong match opens the saints answer', async () => {
  const server = fakeSupabase({ ask: () => ({ kind: 'answer', questionId: 'q-anger', answerId: 'answer-2' }) });
  const { getPathname } = await renderAsk(server);

  await ask('why do I get so angry with my family');

  expect(await screen.findByText('How do I stop reacting in anger?')).toBeOnTheScreen();
  expect(getPathname()).toBe('/answer/answer-2');
});

test('a question without an answer yet shows the nearest topics and can ask to be told', async () => {
  const server = fakeSupabase({ ask: () => ({ kind: 'nearest', topicSlugs: ['exams', 'overthinking'], backlogId: 'backlog-9' }) });
  await renderAsk(server);

  await ask('my parents want me to become a doctor but I love music');

  expect(await screen.findByText('The saints have not answered this one yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Studies and exams' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: "Tell me when it's answered" }));
  expect(await screen.findByText("We'll let you know when the saints answer it.")).toBeOnTheScreen();
  expect(server.sent('notify_requests').map((call) => call.payload)).toEqual([{ backlog_id: 'backlog-9' }]);
});

test('the daily limit is explained', async () => {
  await renderAsk(fakeSupabase({ ask: () => ({ kind: 'limited' }) }));

  await ask('one more question');

  expect(await screen.findByText("You've asked 30 questions today. Ask again tomorrow.")).toBeOnTheScreen();
});

test('without a connection Ask says so and still offers the topics', async () => {
  const server = fakeSupabase();
  server.setOffline(true);
  await renderAsk(server);

  await ask('how do I find peace');

  expect(await screen.findByText('Ask needs an internet connection. You can still browse the topics below.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Grief and loss' })).toBeOnTheScreen();
});
