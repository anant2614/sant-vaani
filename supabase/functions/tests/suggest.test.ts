import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { readBatchResult, readSuggestions, suggestionRequest } from '../suggest-clips/suggest.ts';

const TOPICS = [
  { slug: 'overthinking', name_en: 'Overthinking' },
  { slug: 'anger', name_en: 'Anger' },
];

const VIDEO = {
  id: '0b6e1c1e-0000-4000-8000-000000000001',
  title: 'Mann ko shant kaise karein',
  description: 'Satsang on the restless mind.\n0:00 Shuruaat\n4:10 Vichar kyon aate hain\n31:00 Krodh',
  durationSeconds: 3725,
  chapters: [
    { start: 0, title: 'Shuruaat' },
    { start: 250, title: 'Vichar kyon aate hain' },
    { start: 1860, title: 'Krodh' },
  ],
};

Deno.test('suggestion request carries only title, description and chapters', () => {
  // A full videos row, with fields that must not reach the model.
  const row = { ...VIDEO, youtube_id: 'aaaaaaaaaaa', channel_id: 'channel-1', published_at: '2026-10-01T05:00:00Z' };
  const request = suggestionRequest(row, TOPICS, 'claude-opus-5-5');
  const sent = JSON.stringify(request.params);

  assertEquals(request.custom_id, VIDEO.id);
  assertEquals(request.params.messages.length, 1);
  const message = String(request.params.messages[0]!.content);
  assertStringIncludes(message, '<title>Mann ko shant kaise karein</title>');
  assertStringIncludes(message, '<length>1:02:05</length>');
  assertStringIncludes(message, '4:10 Vichar kyon aate hain');
  assertStringIncludes(message, 'Satsang on the restless mind.');
  for (const field of ['aaaaaaaaaaa', 'channel-1', '2026-10-01']) assert(!sent.includes(field), `${field} was sent`);
  assertStringIncludes(sent, 'overthinking: Overthinking');
  assertEquals(request.params.output_config?.effort, 'low');
  assertEquals(request.params.output_config?.format?.type, 'json_schema');
});

Deno.test('suggestions keep to known topics and to the length of the talk', () => {
  const text = JSON.stringify({
    suggestions: [
      { topic_slug: 'overthinking', start: 250, end: 1860, reason: 'Chapter on why thoughts come' },
      { topic_slug: 'anger', start: 1860, end: 9999, reason: 'Chapter on krodh' },
      { topic_slug: 'astrology', start: 0, end: 100, reason: 'Not a topic' },
      { topic_slug: 'anger', start: 4000, end: 4100, reason: 'After the talk ends' },
    ],
  });
  assertEquals(readSuggestions(text, 3725, new Set(['overthinking', 'anger'])), [
    { topic_slug: 'overthinking', start: 250, end: 1860, reason: 'Chapter on why thoughts come' },
    { topic_slug: 'anger', start: 1860, end: 3725, reason: 'Chapter on krodh' },
  ]);
  assertEquals(readSuggestions('not json', 3725, new Set(['anger'])), []);
});

Deno.test('a failed request goes back for another try, a malformed one does not', () => {
  const topics = new Set(['overthinking']);
  const reply = JSON.stringify({ suggestions: [{ topic_slug: 'overthinking', start: 0, end: 250, reason: 'Intro' }] });
  const succeeded = readBatchResult(
    {
      type: 'succeeded',
      message: { content: [{ type: 'thinking' }, { type: 'text', text: reply }] },
    },
    3725,
    topics,
  );
  assertEquals(succeeded, {
    status: 'suggested',
    suggestions: [{ topic_slug: 'overthinking', start: 0, end: 250, reason: 'Intro' }],
  });
  const failed = (type: string) => ({ type: 'errored' as const, error: { type: 'error', error: { type, message: 'failed' } } });
  assertEquals(readBatchResult(failed('overloaded_error'), 3725, topics), { status: 'new' });
  assertEquals(readBatchResult({ type: 'expired' }, 3725, topics), { status: 'new' });
  assertEquals(readBatchResult(failed('invalid_request_error'), 3725, topics), {
    status: 'suggested',
    suggestions: [],
  });
});
