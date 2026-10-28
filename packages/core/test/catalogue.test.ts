import { describe, expect, it } from 'vitest';
import fixture from './fixtures/catalogue.json' with { type: 'json' };
import { createCatalogueIndex, parseCatalogue, safeParseCatalogue } from '../src/index.ts';

const clone = () => structuredClone(fixture) as typeof fixture;

describe('parseCatalogue', () => {
  it('parses the fixture', () => {
    const catalogue = parseCatalogue(fixture);
    expect(catalogue.answers).toHaveLength(2);
    expect(catalogue.paths[0]?.days).toHaveLength(7);
  });

  it('rejects an answer that points at a missing clip', () => {
    const bad = clone();
    bad.answers[0]!.clipIds = ['c-1', 'c-2', 'c-missing'];
    expect(() => parseCatalogue(bad)).toThrow(/c-missing/);
  });

  it('rejects an answer whose clips repeat a saint', () => {
    const bad = clone();
    bad.answers[0]!.clipIds = ['c-1', 'c-4', 'c-2'];
    expect(() => parseCatalogue(bad)).toThrow(/saint/);
  });

  it('rejects a clip that ends before it starts', () => {
    const bad = clone();
    bad.clips[0]!.end = 10;
    expect(safeParseCatalogue(bad).success).toBe(false);
  });

  it('rejects a malformed YouTube id', () => {
    const bad = clone();
    bad.clips[0]!.youtubeId = 'nope';
    expect(safeParseCatalogue(bad).success).toBe(false);
  });

  it('rejects a path without seven days', () => {
    const bad = clone();
    bad.paths[0]!.days = bad.paths[0]!.days.slice(0, 6);
    expect(safeParseCatalogue(bad).success).toBe(false);
  });
});

describe('createCatalogueIndex', () => {
  const index = createCatalogueIndex(parseCatalogue(fixture));

  it('picks the same answer all day and rotates the next day', () => {
    const morning = index.todaysAnswer(new Date(2026, 9, 28, 6, 0));
    const night = index.todaysAnswer(new Date(2026, 9, 28, 23, 0));
    const tomorrow = index.todaysAnswer(new Date(2026, 9, 29, 6, 0));
    expect(morning?.id).toBe(night?.id);
    expect(tomorrow?.id).not.toBe(morning?.id);
  });

  it('picks a daily verse', () => {
    expect(index.todaysVerse(new Date(2026, 9, 28))).toBeTruthy();
  });

  it('returns null when there are no answers', () => {
    const empty = createCatalogueIndex(parseCatalogue({ ...clone(), answers: [], questions: [] }));
    expect(empty.todaysAnswer(new Date())).toBeNull();
  });

  it('measures an answer in whole minutes', () => {
    const answer = index.answer('a-overthinking')!;
    // 161 + 185 + 138 seconds = 484 seconds, about 8 minutes.
    expect(index.answerMinutes(answer)).toBe(8);
  });

  it('lists answers for a topic in question order', () => {
    expect(index.answersForTopic('t-anger').map((a) => a.id)).toEqual(['a-anger']);
  });

  it('finds topics by slug and clips by saint', () => {
    expect(index.topicBySlug('anger')?.id).toBe('t-anger');
    expect(index.clipsForSaint('s-a').map((c) => c.id)).toEqual(['c-1', 'c-4']);
  });

  it('resolves the clips of an answer in order', () => {
    const answer = index.answer('a-anger')!;
    expect(index.clipsFor(answer).map((c) => c.id)).toEqual(['c-4', 'c-5', 'c-6']);
  });
});
