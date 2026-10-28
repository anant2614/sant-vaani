import { assert, assertEquals } from '@std/assert';
import { HELPLINES, normalizeQuestion, type AskableQuestion, type AskModelOutput } from '../_shared/core/index.ts';
import { handleAsk, type AskDeps, type AskRecord, type BacklogEntry } from '../ask/handler.ts';

const QUESTIONS: AskableQuestion[] = [
  {
    id: 'q-overthinking',
    answerId: 'a-overthinking',
    topicSlug: 'overthinking',
    text: { en: 'How do I stop overthinking?', hi: 'ज़्यादा सोचना कैसे बंद करूँ?' },
    phrasings: ['dimag mein bahut vichar aate hain', 'my mind never stops thinking'],
  },
  {
    id: 'q-anger',
    answerId: 'a-anger',
    topicSlug: 'anger',
    text: { en: 'How do I control my anger?', hi: 'गुस्सा कैसे काबू करूँ?' },
    phrasings: ['gussa kaise kam karu'],
  },
];

const STRONG: AskModelOutput = {
  crisis: false,
  language: 'en',
  matches: [{ question_id: 'q-overthinking', confidence: 0.92 }],
  topic_slugs: ['overthinking'],
};

function fakes(overrides: Partial<AskDeps> = {}) {
  const calls = { classify: 0, records: [] as AskRecord[], backlog: [] as BacklogEntry[] };
  const deps: AskDeps = {
    userId: 'user-1',
    loadQuestions: () => Promise.resolve(QUESTIONS),
    classify: () => {
      calls.classify++;
      return Promise.resolve(STRONG);
    },
    recordAsk: (record) => {
      calls.records.push(record);
      return Promise.resolve();
    },
    addToBacklog: (entry) => {
      calls.backlog.push(entry);
      return Promise.resolve('backlog-1');
    },
    bumpUsage: () => Promise.resolve(true),
    ...overrides,
  };
  return { deps, calls };
}

const ask = (question: string) => ({ question, uiLanguage: 'en' as const });

Deno.test('keyword crisis skips the model', async () => {
  const { deps, calls } = fakes();
  const response = await handleAsk(ask('I want to kill myself'), deps);
  assertEquals(response, { kind: 'crisis', helplines: HELPLINES });
  assertEquals(calls.classify, 0);
});

Deno.test('crisis flag wins over a strong match', async () => {
  const { deps } = fakes({ classify: () => Promise.resolve({ ...STRONG, crisis: true }) });
  const response = await handleAsk(ask('nothing matters any more, I am so tired of everything'), deps);
  assertEquals(response.kind, 'crisis');
});

Deno.test('crisis stores no text', async () => {
  for (const deps of [fakes(), fakes({ classify: () => Promise.resolve({ ...STRONG, crisis: true }) })]) {
    await handleAsk(ask('mujhe jeena nahi hai, I want to end my life'), deps.deps);
    await handleAsk(ask('everything feels pointless lately'), deps.deps);
    const crisis = deps.calls.records.filter((r) => r.result === 'crisis');
    assert(crisis.length > 0);
    for (const record of crisis) assertEquals(record.question, null);
    assertEquals(deps.calls.backlog.length, 0);
  }
});

Deno.test('strong match returns the answer', async () => {
  const { deps, calls } = fakes();
  const response = await handleAsk(ask('my brain keeps running at night'), deps);
  assertEquals(response, { kind: 'answer', questionId: 'q-overthinking', answerId: 'a-overthinking' });
  assertEquals(calls.records[0], {
    question: 'my brain keeps running at night',
    language: 'en',
    result: 'answer',
    questionId: 'q-overthinking',
    confidence: 0.92,
    topicSlugs: ['overthinking'],
    matcher: 'model',
    backlogId: null,
  });
});

Deno.test('weak match adds to the backlog and returns nearest topics', async () => {
  const { deps, calls } = fakes({
    classify: () =>
      Promise.resolve({
        crisis: false,
        language: 'hinglish',
        matches: [{ question_id: 'q-anger', confidence: 0.41 }],
        topic_slugs: ['anger', 'not-a-topic'],
      }),
  });
  const text = 'Traffic mein gussa aata hai, kya karu?';
  const response = await handleAsk(ask(text), deps);
  assertEquals(response, { kind: 'nearest', topicSlugs: ['anger'], backlogId: 'backlog-1' });
  assertEquals(calls.backlog, [{ normalized: normalizeQuestion(text), example: text, topicSlugs: ['anger'] }]);
  assertEquals(calls.records[0]?.result, 'nearest');
  assertEquals(calls.records[0]?.backlogId, 'backlog-1');
});

Deno.test('unknown question ids from the model are ignored', async () => {
  const { deps } = fakes({
    classify: () =>
      Promise.resolve({ ...STRONG, matches: [{ question_id: 'made-up', confidence: 0.99 }], topic_slugs: [] }),
  });
  const response = await handleAsk(ask('how do I find peace'), deps);
  assertEquals(response.kind, 'nearest');
});

Deno.test('falls back to lexical matching when the model call fails', async () => {
  const { deps, calls } = fakes({ classify: () => Promise.reject(new Error('overloaded')) });
  const response = await handleAsk(ask('How can I stop overthinking'), deps);
  assertEquals(response, { kind: 'answer', questionId: 'q-overthinking', answerId: 'a-overthinking' });
  assertEquals(calls.records[0]?.matcher, 'lexical');
});

Deno.test('31st question in a day is limited', async () => {
  let count = 0;
  const { deps, calls } = fakes({ bumpUsage: () => Promise.resolve(++count <= 30) });
  for (let i = 0; i < 30; i++) assertEquals((await handleAsk(ask('How do I stop overthinking?'), deps)).kind, 'answer');
  assertEquals(await handleAsk(ask('How do I stop overthinking?'), deps), { kind: 'limited' });
  assertEquals(calls.classify, 30);
});

Deno.test('a person in crisis gets helplines even after the daily limit', async () => {
  const { deps } = fakes({ bumpUsage: () => Promise.resolve(false) });
  assertEquals((await handleAsk(ask('I want to die'), deps)).kind, 'crisis');
});
