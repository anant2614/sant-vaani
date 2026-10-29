import { assertEquals } from '@std/assert';
import { pushMessages, sendPushes } from '../build-catalogue/notify.ts';

Deno.test('one push per phone for each answered question, in the person’s language', () => {
  const messages = pushMessages(
    [
      { requestId: 'n1', userId: 'u-en', questionId: 'q1', answerId: 'a1', text: { en: 'How do I stop overthinking?', hi: 'ज़्यादा सोचना कैसे रोकूँ?' } },
      { requestId: 'n2', userId: 'u-hi', questionId: 'q1', answerId: 'a1', text: { en: 'How do I stop overthinking?', hi: 'ज़्यादा सोचना कैसे रोकूँ?' } },
      { requestId: 'n3', userId: 'u-none', questionId: 'q2', answerId: 'a2', text: { en: 'Why am I angry?' } },
    ],
    [
      { token: 'ExponentPushToken[en-phone]', user_id: 'u-en' },
      { token: 'ExponentPushToken[en-tablet]', user_id: 'u-en' },
      { token: 'ExponentPushToken[hi-phone]', user_id: 'u-hi' },
    ],
    new Map([['u-hi', 'hi' as const]]),
  );
  assertEquals(messages, [
    {
      to: 'ExponentPushToken[en-phone]',
      title: 'Your question has an answer',
      body: 'How do I stop overthinking?',
      data: { url: '/answer/a1' },
      sound: 'default',
    },
    {
      to: 'ExponentPushToken[en-tablet]',
      title: 'Your question has an answer',
      body: 'How do I stop overthinking?',
      data: { url: '/answer/a1' },
      sound: 'default',
    },
    {
      to: 'ExponentPushToken[hi-phone]',
      title: 'आपके प्रश्न का उत्तर आ गया है',
      body: 'ज़्यादा सोचना कैसे रोकूँ?',
      data: { url: '/answer/a1' },
      sound: 'default',
    },
  ]);
});

Deno.test('pushes go out 100 at a time and phones that left are reported', async () => {
  const sent: unknown[][] = [];
  const fetch = (_url: string | URL | Request, init?: RequestInit) => {
    const batch = JSON.parse(String(init?.body)) as { to: string }[];
    sent.push(batch);
    return Promise.resolve(
      Response.json({
        data: batch.map((m) =>
          m.to === 'ExponentPushToken[gone]'
            ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
            : { status: 'ok', id: 'ticket' },
        ),
      }),
    );
  };
  const messages = Array.from({ length: 150 }, (_, i) => ({
    to: i === 120 ? 'ExponentPushToken[gone]' : `ExponentPushToken[${i}]`,
    title: 't',
    body: 'b',
    data: { url: '/answer/a1' },
    sound: 'default' as const,
  }));
  const result = await sendPushes(messages, { fetch });
  assertEquals(sent.map((batch) => batch.length), [100, 50]);
  assertEquals(result, { sent: 149, unregistered: ['ExponentPushToken[gone]'] });
});
