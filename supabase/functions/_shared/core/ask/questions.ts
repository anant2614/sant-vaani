// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import type { Catalogue } from '../catalogue/schema.ts';
import type { CuratedQuestion } from './lexical.ts';

/** A curated question with an answer in the catalogue. Ask routes only to these. */
export type AskableQuestion = CuratedQuestion & { answerId: string };

/**
 * The questions Ask may route to: those the catalogue answers, so every
 * match opens in the app. In topic order, then catalogue order, which keeps
 * the cached prompt the same between calls. Phrasings stay out of the public
 * catalogue, so the server passes them in.
 */
export function askableQuestions(
  catalogue: Catalogue,
  phrasings: ReadonlyMap<string, string[]> = new Map(),
): AskableQuestion[] {
  const topics = new Map(catalogue.topics.map((t) => [t.id, t]));
  const answerIds = new Map(catalogue.answers.map((a) => [a.questionId, a.id]));
  return catalogue.questions
    .flatMap((question) => {
      const answerId = answerIds.get(question.id);
      const topic = topics.get(question.topicId);
      return answerId && topic ? [{ question, topic, answerId }] : [];
    })
    .sort((a, b) => a.topic.sortOrder - b.topic.sortOrder)
    .map(({ question, topic, answerId }) => ({
      id: question.id,
      answerId,
      topicSlug: topic.slug,
      text: question.text,
      phrasings: phrasings.get(question.id) ?? [],
    }));
}
