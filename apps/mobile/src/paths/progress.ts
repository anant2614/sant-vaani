import { localDayNumber } from '@sant-vaani/core';

export const PATH_DAYS = 7;

export type PathProgress = {
  /** Days done, in order. */
  completed: number[];
  /** The next day to do, or null once all seven are done. */
  current: number | null;
  /** The last day was done today, so the next one waits for tomorrow. */
  opensTomorrow: boolean;
  done: boolean;
};

/**
 * A path moves one day at a time: the next day opens on the calendar day
 * after the last one was done, by the phone's own clock.
 */
export function pathProgress(completions: Record<number, { completedAt: string }>, now: Date): PathProgress {
  const completed = Object.keys(completions)
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= PATH_DAYS)
    .sort((a, b) => a - b);
  if (completed.length === PATH_DAYS) return { completed, current: null, opensTomorrow: false, done: true };

  const current = Array.from({ length: PATH_DAYS }, (_, i) => i + 1).find((day) => !completed.includes(day)) ?? null;
  const lastDone = Math.max(...completed.map((day) => localDayNumber(new Date(completions[day]?.completedAt ?? 0))));
  return { completed, current, opensTomorrow: completed.length > 0 && lastDone >= localDayNumber(now), done: false };
}
