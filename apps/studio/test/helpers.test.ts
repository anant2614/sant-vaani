import { describe, expect, it } from 'vitest';
import { notLiveReason } from '../src/lib/clips';
import { friendlyError } from '../src/lib/errors';
import { move } from '../src/lib/list';
import { pathProblems } from '../src/lib/paths';

describe('friendlyError', () => {
  it('turns a database message into a sentence', () => {
    expect(friendlyError('an answer needs 3 to 5 clips; this one has 2')).toBe(
      'An answer needs 3 to 5 clips; this one has 2.',
    );
  });

  it('names the duplicate instead of the constraint', () => {
    expect(friendlyError('duplicate key value violates unique constraint "channels_youtube_channel_id_key"')).toBe(
      'That channel is already in the studio.',
    );
    expect(friendlyError('duplicate key value violates unique constraint "saints_slug_key"')).toBe(
      'A saint with that English name already exists.',
    );
  });

  it('names a missing verse instead of the foreign key', () => {
    expect(
      friendlyError(
        'insert or update on table "answers" violates foreign key constraint "answers_scripture_id_verse_chapter_verse_number_fkey"',
      ),
    ).toBe('That verse is not in the Gita.');
  });

  it('explains a permission failure', () => {
    expect(friendlyError('new row violates row-level security policy for table "clips"')).toBe(
      'Your account is not allowed to do that.',
    );
  });
});

describe('move', () => {
  it('moves an item up and down without changing the original', () => {
    const items = ['a', 'b', 'c'];
    expect(move(items, 2, -1)).toEqual(['a', 'c', 'b']);
    expect(move(items, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('leaves the list alone at the edges', () => {
    expect(move(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(move(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('pathProblems', () => {
  const day = (n: number, clipLive: boolean | null) => ({ day: n, clipLive });

  it('accepts seven days with live clips', () => {
    expect(pathProblems([1, 2, 3, 4, 5, 6, 7].map((n) => day(n, true)))).toEqual([]);
  });

  it('names the days without a clip or with a clip that is not live', () => {
    const days = [day(1, true), day(2, null), day(3, false), day(4, true), day(5, true), day(6, true)];
    expect(pathProblems(days)).toEqual([
      'Day 2 needs a clip.',
      'Day 3 has a clip that is not live.',
      'Day 7 needs a clip.',
    ]);
  });
});

describe('notLiveReason', () => {
  const card = {
    status: 'approved' as const,
    live: true,
    retired_reason: null,
    saint_taken_down: false,
    video_embeddable: true,
    video_privacy_status: 'public',
  };

  it('is null for a live clip', () => {
    expect(notLiveReason(card)).toBeNull();
  });

  it('explains each way a clip is kept off the app', () => {
    expect(notLiveReason({ ...card, status: 'draft', live: false })).toBe('Draft');
    expect(notLiveReason({ ...card, status: 'needs_second_review', live: false })).toBe('Waiting for a second review');
    expect(notLiveReason({ ...card, status: 'retired', live: false, retired_reason: 'video went private' })).toBe(
      'Retired: video went private',
    );
    expect(notLiveReason({ ...card, live: false, saint_taken_down: true })).toBe('Saint taken down');
    expect(notLiveReason({ ...card, live: false, video_privacy_status: 'gone' })).toBe('Video removed from YouTube');
    expect(notLiveReason({ ...card, live: false, video_privacy_status: 'private' })).toBe('Video is private');
    expect(notLiveReason({ ...card, live: false, video_embeddable: false })).toBe('Video no longer allows embedding');
  });
});
