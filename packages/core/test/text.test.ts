import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  normalizeQuestion,
  parseChannelRef,
  parseChapters,
  parseIsoDuration,
  parseTimestamp,
  parseYouTubeVideoId,
} from '../src/index.ts';

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(161)).toBe('2:41');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('rounds partial seconds down', () => {
    expect(formatDuration(61.9)).toBe('1:01');
  });
});

describe('parseTimestamp', () => {
  it('reads seconds, m:ss and h:mm:ss', () => {
    expect(parseTimestamp('45')).toBe(45);
    expect(parseTimestamp('2:41')).toBe(161);
    expect(parseTimestamp(' 1:02:03 ')).toBe(3723);
  });

  it('rejects malformed values', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('1:75')).toBeNull();
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('-3')).toBeNull();
  });
});

describe('parseYouTubeVideoId', () => {
  it('reads every common link shape', () => {
    const id = 'dQw4w9WgXcQ';
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(id);
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toBe(id);
    expect(parseYouTubeVideoId('https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ')).toBe(id);
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(id);
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ?start=3')).toBe(id);
    expect(parseYouTubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(id);
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe(id);
  });

  it('rejects other sites and malformed ids', () => {
    expect(parseYouTubeVideoId('https://vimeo.com/123')).toBeNull();
    expect(parseYouTubeVideoId('https://youtu.be/short')).toBeNull();
    expect(parseYouTubeVideoId('not a link')).toBeNull();
  });
});

describe('parseChannelRef', () => {
  it('reads channel ids and handles', () => {
    expect(parseChannelRef('https://www.youtube.com/channel/UC1234567890abcdefghijkl')).toEqual({
      kind: 'id',
      value: 'UC1234567890abcdefghijkl',
    });
    expect(parseChannelRef('UC1234567890abcdefghijkl')).toEqual({ kind: 'id', value: 'UC1234567890abcdefghijkl' });
    expect(parseChannelRef('https://www.youtube.com/@BhajanMarg/videos')).toEqual({
      kind: 'handle',
      value: '@BhajanMarg',
    });
    expect(parseChannelRef('@some.channel_1')).toEqual({ kind: 'handle', value: '@some.channel_1' });
  });

  it('rejects anything else', () => {
    expect(parseChannelRef('https://example.com/@x')).toBeNull();
    expect(parseChannelRef('hello')).toBeNull();
  });
});

describe('parseChapters', () => {
  it('reads chapters when the first one starts at 0:00', () => {
    const description = [
      'A talk on the restless mind.',
      '',
      '0:00 Introduction',
      '2:41 - Why the mind races at night',
      '10:05 Practice',
      '1:02:03 Questions',
    ].join('\n');
    expect(parseChapters(description)).toEqual([
      { start: 0, title: 'Introduction' },
      { start: 161, title: 'Why the mind races at night' },
      { start: 605, title: 'Practice' },
      { start: 3723, title: 'Questions' },
    ]);
  });

  it('ignores timestamps that are not a chapter list', () => {
    expect(parseChapters('Live from 5:30 tomorrow\n6:00 Aarti')).toEqual([]);
    expect(parseChapters('0:00 Start\n1:00 Only two')).toEqual([]);
  });
});

describe('parseIsoDuration', () => {
  it('reads YouTube durations', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT45S')).toBe(45);
    expect(parseIsoDuration('PT10M')).toBe(600);
    expect(parseIsoDuration('P1DT2H')).toBe(93600);
    expect(parseIsoDuration('P0D')).toBe(0);
  });

  it('returns 0 for malformed values', () => {
    expect(parseIsoDuration('soon')).toBe(0);
  });
});

describe('normalizeQuestion', () => {
  it('lowercases, strips punctuation and collapses spaces', () => {
    expect(normalizeQuestion('  How do I   STOP overthinking?!  ')).toBe('how do i stop overthinking');
  });

  it('keeps Devanagari intact and drops the danda', () => {
    expect(normalizeQuestion('मन शांत कैसे करें।')).toBe('मन शांत कैसे करें');
  });
});
