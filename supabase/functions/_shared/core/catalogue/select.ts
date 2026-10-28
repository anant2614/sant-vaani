// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import type { Answer, Catalogue, Clip, Path, Question, Saint, Topic, VerseRef } from './schema.ts';

const DAY_MS = 86_400_000;

/** Days since 1970 for the local calendar date, so "today" changes at local midnight. */
export function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export type CatalogueIndex = ReturnType<typeof createCatalogueIndex>;

export function createCatalogueIndex(catalogue: Catalogue) {
  const saints = new Map(catalogue.saints.map((s) => [s.id, s]));
  const topics = new Map(catalogue.topics.map((t) => [t.id, t]));
  const topicsBySlug = new Map(catalogue.topics.map((t) => [t.slug, t]));
  const questions = new Map(catalogue.questions.map((q) => [q.id, q]));
  const clips = new Map(catalogue.clips.map((c) => [c.id, c]));
  const answers = new Map(catalogue.answers.map((a) => [a.id, a]));
  const answersByQuestion = new Map(catalogue.answers.map((a) => [a.questionId, a]));
  const paths = new Map(catalogue.paths.map((p) => [p.slug, p]));
  const rotation = [...catalogue.answers].sort((a, b) => a.id.localeCompare(b.id));
  const sortedTopics = [...catalogue.topics].sort((a, b) => a.sortOrder - b.sortOrder);

  const clipsFor = (answer: Answer): Clip[] =>
    answer.clipIds.map((id) => clips.get(id)).filter((c): c is Clip => Boolean(c));

  return {
    catalogue,
    topics: sortedTopics,
    saint: (id: string): Saint | undefined => saints.get(id),
    topic: (id: string): Topic | undefined => topics.get(id),
    topicBySlug: (slug: string): Topic | undefined => topicsBySlug.get(slug),
    question: (id: string): Question | undefined => questions.get(id),
    clip: (id: string): Clip | undefined => clips.get(id),
    answer: (id: string): Answer | undefined => answers.get(id),
    answerForQuestion: (questionId: string): Answer | undefined => answersByQuestion.get(questionId),
    path: (slug: string): Path | undefined => paths.get(slug),
    clipsFor,

    questionsForTopic(topicId: string): Question[] {
      return catalogue.questions.filter((q) => q.topicId === topicId);
    },

    answersForTopic(topicId: string): Answer[] {
      return catalogue.questions
        .filter((q) => q.topicId === topicId)
        .map((q) => answersByQuestion.get(q.id))
        .filter((a): a is Answer => Boolean(a));
    },

    clipsForSaint(saintId: string): Clip[] {
      return catalogue.clips.filter((c) => c.saintId === saintId);
    },

    /** Answers that include one of the saint's clips. */
    answersForSaint(saintId: string): Answer[] {
      return catalogue.answers.filter((answer) => clipsFor(answer).some((clip) => clip.saintId === saintId));
    },

    /** Whole minutes of listening, never less than one. */
    answerMinutes(answer: Answer): number {
      const seconds = clipsFor(answer).reduce((sum, c) => sum + (c.end - c.start), 0);
      return Math.max(1, Math.round(seconds / 60));
    },

    /** The same answer all day, a different one tomorrow. */
    todaysAnswer(date: Date): Answer | null {
      if (rotation.length === 0) return null;
      return rotation[localDayNumber(date) % rotation.length] ?? null;
    },

    todaysVerse(date: Date): VerseRef | null {
      const verses = catalogue.dailyVerses;
      if (verses.length === 0) return null;
      return verses[localDayNumber(date) % verses.length] ?? null;
    },
  };
}
