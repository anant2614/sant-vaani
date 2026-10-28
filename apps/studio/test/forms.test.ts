import { describe, expect, it } from 'vitest';
import { validateAnswerDraft, type DraftClip } from '../src/lib/answers';
import { clipFormSchema, formDataToObject, questionFormSchema, saintFormSchema, slugify } from '../src/lib/forms';

const VIDEO = '00000000-0000-4000-8000-0000000000aa';
const TOPIC = '00000000-0000-4000-8000-0000000000bb';

function clipForm(overrides: Record<string, string | string[]> = {}) {
  return {
    videoId: VIDEO,
    start: '2:41',
    end: '5:00',
    language: 'hi',
    summaryEn: 'Why the mind races at night',
    summaryHi: '',
    topicIds: [TOPIC],
    ...overrides,
  };
}

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('clipFormSchema', () => {
  it('reads timestamps into seconds', () => {
    const clip = clipFormSchema.parse(clipForm());
    expect(clip).toMatchObject({ start: 161, end: 300, sensitive: false, summaryHi: null });
  });

  it('rejects an end before the start', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ start: '5:00', end: '2:41' })))).toBe(
      'The end must come after the start.',
    );
  });

  it('needs at least 15 seconds', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ start: '1:00', end: '1:10' })))).toBe(
      'A clip is at least 15 seconds long.',
    );
  });

  it('allows at most 15 minutes', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ start: '0:00', end: '15:01' })))).toBe(
      'A clip is at most 15 minutes long.',
    );
  });

  it('rejects a timestamp it cannot read', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ start: '2:75' })))).toBe('Use a time like 2:41 or 1:02:03.');
  });

  it('needs a summary in English or Hindi', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ summaryEn: '  ' })))).toBe(
      'Write the summary in English or Hindi.',
    );
  });

  it('needs at least one topic', () => {
    expect(firstMessage(clipFormSchema.safeParse(clipForm({ topicIds: [] })))).toBe('Choose at least one topic.');
  });
});

describe('formDataToObject', () => {
  it('keeps repeated fields as lists and checkboxes as on', () => {
    const data = new FormData();
    data.append('topicIds', 'a');
    data.append('topicIds', 'b');
    data.append('sensitive', 'on');
    data.append('summaryEn', 'Hello');
    expect(formDataToObject(data, ['topicIds'])).toEqual({ topicIds: ['a', 'b'], sensitive: 'on', summaryEn: 'Hello' });
  });
});

describe('saintFormSchema', () => {
  it('makes a slug from the English name', () => {
    expect(saintFormSchema.parse({ nameEn: 'Sample Saint Ji', nameHi: '', initials: 'ss' })).toMatchObject({
      slug: 'sample-saint-ji',
      initials: 'SS',
      nameHi: null,
    });
  });
});

describe('questionFormSchema', () => {
  it('splits phrasings by line', () => {
    expect(
      questionFormSchema.parse({ topicId: TOPIC, textEn: 'How do I stop overthinking?', textHi: '', phrasings: 'one\n\n two \n' })
        .phrasings,
    ).toEqual(['one', 'two']);
  });
});

describe('slugify', () => {
  it('handles accents and punctuation', () => {
    expect(slugify('  Śrī Sample — Mahārāj! ')).toBe('sri-sample-maharaj');
  });
});

describe('validateAnswerDraft', () => {
  const clip = (id: string, saintId: string, live = true): DraftClip => ({ id, saintId, live });
  const ready = { verse: { chapter: 2, verse: 47 }, stepId: 'step' };

  it('needs at least 3 clips', () => {
    expect(validateAnswerDraft({ clips: [clip('1', 'a'), clip('2', 'b')], ...ready })).toEqual([
      'Add at least 3 clips (2 so far).',
    ]);
  });

  it('allows at most 5 clips', () => {
    const clips = ['a', 'b', 'c', 'd', 'e', 'f'].map((s, i) => clip(String(i), s));
    expect(validateAnswerDraft({ clips, ...ready })).toEqual(['Use at most 5 clips.']);
  });

  it('needs different saints', () => {
    expect(validateAnswerDraft({ clips: [clip('1', 'a'), clip('2', 'a'), clip('3', 'b')], ...ready })).toEqual([
      'Each clip must be by a different saint.',
    ]);
  });

  it('needs every clip approved and live', () => {
    expect(validateAnswerDraft({ clips: [clip('1', 'a'), clip('2', 'b'), clip('3', 'c', false)], ...ready })).toEqual([
      'Every clip must be approved and live.',
    ]);
  });

  it('needs a verse and a step', () => {
    expect(
      validateAnswerDraft({ clips: [clip('1', 'a'), clip('2', 'b'), clip('3', 'c')], verse: null, stepId: null }),
    ).toEqual(['Choose the Gita verse that ties the clips together.', 'Add one small step.']);
  });

  it('accepts a complete answer', () => {
    expect(validateAnswerDraft({ clips: [clip('1', 'a'), clip('2', 'b'), clip('3', 'c')], ...ready })).toEqual([]);
  });
});
