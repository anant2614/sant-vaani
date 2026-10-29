import { assertEquals, assertThrows } from '@std/assert';
import { buildCatalogue, type CatalogueRows } from '../build-catalogue/build.ts';

const NOW = new Date('2026-10-28T21:30:00Z');

const clip = (id: string, saintId: string) => ({
  id,
  saint_id: saintId,
  youtube_id: `${id.replace(/[^a-z0-9]/g, '')}xxxxxxxxxxx`.slice(0, 11),
  start_seconds: 60,
  end_seconds: 240,
  language: 'hi' as const,
  summary_en: `Summary of ${id}`,
  summary_hi: null,
});

const step = { text_en: 'Take five slow breaths.', text_hi: null };
const day = (n: number, clipId: string | null) => ({
  day: n,
  clip_id: clipId,
  verse_chapter: 2,
  verse_number: 47,
  step: { text_en: `Day ${n} step`, text_hi: null },
});

function rows(): CatalogueRows {
  return {
    topics: [
      { id: 't-anger', slug: 'anger', name_en: 'Anger', name_hi: 'क्रोध', sort_order: 2 },
      { id: 't-mind', slug: 'overthinking', name_en: 'Overthinking', name_hi: 'ज़्यादा सोचना', sort_order: 1 },
      { id: 't-grief', slug: 'grief', name_en: 'Grief', name_hi: 'शोक', sort_order: 3 },
    ],
    questions: [
      { id: 'q-anger', topic_id: 't-anger', text_en: 'How do I stop reacting in anger?', text_hi: null, sort_order: 1 },
      { id: 'q-night', topic_id: 't-mind', text_en: 'Why does my mind race at night?', text_hi: null, sort_order: 2 },
      { id: 'q-stop', topic_id: 't-mind', text_en: 'How do I stop overthinking?', text_hi: 'ज़्यादा सोचना कैसे रोकूँ?', sort_order: 1 },
      { id: 'q-thin', topic_id: 't-anger', text_en: 'Why do I snap at family?', text_hi: null, sort_order: 2 },
      { id: 'q-grief', topic_id: 't-grief', text_en: 'How do I live with loss?', text_hi: null, sort_order: 1 },
    ],
    answers: [
      {
        id: 'a-anger',
        question_id: 'q-anger',
        status: 'published',
        verse_chapter: 2,
        verse_number: 63,
        step,
        clips: [
          { clip_id: 'c4', position: 1 },
          { clip_id: 'c5', position: 2 },
          { clip_id: 'c6', position: 3 },
        ],
      },
      {
        id: 'a-night',
        question_id: 'q-night',
        status: 'needs_replacement',
        verse_chapter: 6,
        verse_number: 35,
        step,
        clips: [
          { clip_id: 'c1', position: 2 },
          { clip_id: 'c2', position: 1 },
          { clip_id: 'c-retired', position: 3 },
        ],
      },
      {
        id: 'a-stop',
        question_id: 'q-stop',
        status: 'published',
        verse_chapter: 6,
        verse_number: 26,
        step,
        clips: [
          { clip_id: 'c3', position: 1 },
          { clip_id: 'c2', position: 2 },
          { clip_id: 'c1', position: 3 },
        ],
      },
      {
        id: 'a-thin',
        question_id: 'q-thin',
        status: 'needs_replacement',
        verse_chapter: 2,
        verse_number: 56,
        step,
        clips: [
          { clip_id: 'c4', position: 1 },
          { clip_id: 'c-retired', position: 2 },
          { clip_id: 'c-private', position: 3 },
        ],
      },
    ],
    // Live clips only, as the job reads them.
    clips: [
      clip('c1', 's1'),
      clip('c2', 's2'),
      clip('c3', 's3'),
      clip('c4', 's1'),
      clip('c5', 's2'),
      clip('c6', 's3'),
      clip('c-path', 's1'),
      clip('c-unused', 's4'),
    ],
    saints: [
      { id: 's3', name_en: 'Saint Three', name_hi: null, initials: 'ST', tradition: null },
      { id: 's1', name_en: 'Saint One', name_hi: 'संत एक', initials: 'SO', tradition: 'Vaishnava' },
      { id: 's2', name_en: null, name_hi: 'संत दो', initials: 'SD', tradition: null },
      { id: 's4', name_en: 'Saint Four', name_hi: null, initials: 'SF', tradition: null },
    ],
    paths: [
      {
        id: 'p-calm',
        slug: 'calming-a-restless-mind',
        title_en: 'Calming a restless mind',
        title_hi: 'बेचैन मन को शांत करना',
        description_en: 'Seven short days.',
        description_hi: 'सात छोटे दिन।',
        sort_order: 1,
        days: [day(2, 'c-retired'), day(1, 'c-path'), day(3, null), day(4, null), day(5, null), day(6, null), day(7, null)],
      },
    ],
    dailyVerses: [{ chapter: 2, verse: 47 }],
  };
}

Deno.test('drops answers with fewer than 2 live clips', () => {
  const catalogue = buildCatalogue(rows(), NOW, () => {});
  assertEquals(
    catalogue.answers.map((a) => a.id),
    ['a-stop', 'a-night', 'a-anger'],
  );
  // An answer waiting for a replacement stays while two live clips remain, in curator order.
  assertEquals(catalogue.answers.find((a) => a.id === 'a-night')?.clipIds, ['c2', 'c1']);
});

Deno.test('orders answers by topic then question', () => {
  const catalogue = buildCatalogue(rows(), NOW, () => {});
  assertEquals(
    catalogue.questions.map((q) => q.id),
    ['q-stop', 'q-night', 'q-anger'],
  );
  assertEquals(
    catalogue.topics.map((t) => t.slug),
    ['overthinking', 'anger'],
    'topics with no answer in the app are left out',
  );
  assertEquals(catalogue.questions[0]?.text, { en: 'How do I stop overthinking?', hi: 'ज़्यादा सोचना कैसे रोकूँ?' });
  assertEquals(catalogue.answers[0]?.verse, { chapter: 6, verse: 26 });
  assertEquals(catalogue.answers[0]?.step, { en: 'Take five slow breaths.' });
});

Deno.test('carries only the clips and saints in use, and a path day loses a clip that came down', () => {
  const catalogue = buildCatalogue(rows(), NOW, () => {});
  assertEquals(catalogue.version, 1);
  assertEquals(catalogue.generatedAt, NOW.toISOString());
  assertEquals(catalogue.clips.map((c) => c.id).sort(), ['c-path', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  assertEquals(
    catalogue.saints.map((s) => s.id),
    ['s1', 's3', 's2'],
    'saints in name order, without the one whose clips are not used',
  );
  assertEquals(catalogue.saints[0], { id: 's1', name: { en: 'Saint One', hi: 'संत एक' }, initials: 'SO', tradition: 'Vaishnava' });

  const path = catalogue.paths[0]!;
  assertEquals(path.title, { en: 'Calming a restless mind', hi: 'बेचैन मन को शांत करना' });
  assertEquals(
    path.days.map((d) => d.clipId),
    ['c-path', null, null, null, null, null, null],
  );
  assertEquals(path.days[1]?.verse, { chapter: 2, verse: 47 });
  assertEquals(catalogue.dailyVerses, [{ chapter: 2, verse: 47 }]);
});

Deno.test('a path without all seven days stays out instead of breaking the file', () => {
  const input = rows();
  input.paths[0]!.days.pop();
  assertEquals(buildCatalogue(input, NOW, () => {}).paths, []);
});

Deno.test('an answer that repeats a saint keeps the first clip of each saint, and says so', () => {
  const input = rows();
  // c4 and c1 are both by saint 1. The database refuses this, but one bad answer must not stop every build.
  input.answers[0]!.clips = [
    { clip_id: 'c4', position: 1 },
    { clip_id: 'c1', position: 2 },
    { clip_id: 'c5', position: 3 },
  ];
  const problems: string[] = [];
  const catalogue = buildCatalogue(input, NOW, (problem) => problems.push(problem));
  assertEquals(catalogue.answers.find((a) => a.id === 'a-anger')?.clipIds, ['c4', 'c5']);
  assertEquals(problems, ['answer a-anger repeats saint s1, so clip c1 was left out']);
});

Deno.test('an answer left with one saint drops out, and the rest still ships', () => {
  const input = rows();
  input.answers[0]!.clips = [
    { clip_id: 'c4', position: 1 },
    { clip_id: 'c1', position: 2 },
  ];
  const catalogue = buildCatalogue(input, NOW, () => {});
  assertEquals(
    catalogue.answers.map((a) => a.id),
    ['a-stop', 'a-night'],
  );
});

Deno.test('a catalogue that breaks the rules is never published', () => {
  const input = rows();
  input.clips[0]!.youtube_id = 'not a video';
  assertThrows(() => buildCatalogue(input, NOW, () => {}), Error, 'not a YouTube video id');
});
