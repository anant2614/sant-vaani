import type { VerseRef } from '@sant-vaani/core';

import type { Chapter } from './types';

/** Reads a verse reference from route parameters, such as /gita/2/47. */
export function verseRefFrom(chapter: string | undefined, verse: string | undefined): VerseRef | null {
  const c = Number(chapter);
  const v = Number(verse);
  return Number.isInteger(c) && Number.isInteger(v) && c > 0 && v > 0 ? { chapter: c, verse: v } : null;
}

/** The verses either side of this one, running on across chapters. */
export function neighbours(chapters: Chapter[], { chapter, verse }: VerseRef): { previous: VerseRef | null; next: VerseRef | null } {
  const index = chapters.findIndex((c) => c.number === chapter);
  const current = chapters[index];
  if (!current) return { previous: null, next: null };
  const before = chapters[index - 1];
  const after = chapters[index + 1];
  return {
    previous: verse > 1 ? { chapter, verse: verse - 1 } : before ? { chapter: before.number, verse: before.verseCount } : null,
    next: verse < current.verseCount ? { chapter, verse: verse + 1 } : after ? { chapter: after.number, verse: 1 } : null,
  };
}

/** What a person saves when they save a verse. */
export function verseSaveRef({ chapter, verse }: VerseRef): string {
  return `gita:${chapter}.${verse}`;
}

export function verseFromSaveRef(ref: string): VerseRef | null {
  const match = /^gita:(\d+)\.(\d+)$/.exec(ref);
  return match ? { chapter: Number(match[1]), verse: Number(match[2]) } : null;
}
