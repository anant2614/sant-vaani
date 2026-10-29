import { localDayNumber, localize, type CatalogueIndex, type VerseRef } from '@sant-vaani/core';

import type { AppLanguage } from '@/prefs/prefs';

/** Topics offered on Today; the full list is on the Ask tab. */
export const TODAY_CHIPS = 6;

export type TodayView = {
  answer: { id: string; question: string; saints: number; minutes: number } | null;
  chips: { key: string; label: string }[];
  verse: VerseRef | null;
  path: { id: string; slug: string; title: string; firstDayMinutes: number | null } | null;
};

/** Everything Today shows, worked out from the catalogue on the phone. */
export function todayView(index: CatalogueIndex, now: Date, language: AppLanguage): TodayView {
  const answer = index.todaysAnswer(now);
  const question = answer ? index.question(answer.questionId) : undefined;
  const firstPath = index.catalogue.paths[0];
  const firstClip = firstPath?.days[0]?.clipId ? index.clip(firstPath.days[0].clipId) : undefined;

  return {
    answer:
      answer && question
        ? {
            id: answer.id,
            question: localize(question.text, language),
            saints: new Set(index.clipsFor(answer).map((clip) => clip.saintId)).size,
            minutes: index.answerMinutes(answer),
          }
        : null,
    chips: pickTopics(index, now).map((topic) => ({ key: topic.slug, label: localize(topic.name, language) })),
    verse: index.todaysVerse(now),
    path: firstPath
      ? {
          id: firstPath.id,
          slug: firstPath.slug,
          title: localize(firstPath.title, language),
          firstDayMinutes: firstClip ? Math.max(1, Math.round((firstClip.end - firstClip.start) / 60)) : null,
        }
      : null,
  };
}

/** Local noon on the date with this day number, the inverse of localDayNumber. */
export function noonOf(day: number): Date {
  const utc = new Date(day * 86_400_000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12);
}

/**
 * Up to six topics that have answers, spread across the list so Today
 * shows a mix of the mind, relationships, work, hardship and spirit, and a
 * different mix each day. Shown in the catalogue's order.
 */
function pickTopics(index: CatalogueIndex, now: Date) {
  const answered = index.topics.filter((topic) => index.answersForTopic(topic.id).length > 0);
  if (answered.length <= TODAY_CHIPS) return answered;
  const step = answered.length / TODAY_CHIPS;
  const offset = localDayNumber(now) % Math.floor(step);
  return Array.from({ length: TODAY_CHIPS }, (_, i) => answered[Math.floor(i * step) + offset]).filter(
    (topic): topic is (typeof answered)[number] => topic !== undefined,
  );
}
