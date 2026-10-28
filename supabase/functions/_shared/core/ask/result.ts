// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import { z } from 'zod';

/**
 * What the model returns for a typed question. Kept to plain types so the
 * structured output schema stays simple; ranges are enforced in code.
 */
export const AskModelOutputSchema = z.object({
  crisis: z.boolean(),
  // The SDK sends enum values as a hint, not a constraint, so a stray label
  // becomes 'other' instead of throwing away a good match.
  language: z.enum(['en', 'hi', 'hinglish', 'other']).catch('other'),
  matches: z.array(z.object({ question_id: z.string(), confidence: z.number() })),
  topic_slugs: z.array(z.string()),
});

export type AskModelOutput = z.infer<typeof AskModelOutputSchema>;

/** A model match at or above this confidence opens the answer directly. */
export const ASK_THRESHOLD = 0.7;
/** The same bar for the word-overlap fallback, which scores lower. */
export const LEXICAL_THRESHOLD = 0.6;
export const MAX_ASKS_PER_DAY = 30;
export const MAX_QUESTION_CHARS = 500;

export const AskRequestSchema = z.object({
  question: z.string().trim().min(2).max(MAX_QUESTION_CHARS),
  /** The app's language, used when the question gives no clue. */
  uiLanguage: z.enum(['en', 'hi']).default('en'),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

export type Helpline = {
  id: string;
  name: string;
  numbers: string[];
  url?: string;
  region: 'IN' | 'INTL';
  note: string;
};

export const HELPLINES: Helpline[] = [
  {
    id: 'tele-manas',
    name: 'Tele-MANAS',
    numbers: ['14416', '1800-891-4416'],
    region: 'IN',
    note: 'Free, 24×7, in many Indian languages',
  },
  {
    id: 'find-a-helpline',
    name: 'Find a helpline',
    numbers: [],
    url: 'https://findahelpline.com',
    region: 'INTL',
    note: 'Free helplines in your country',
  },
];

export type AskResponse =
  | { kind: 'answer'; questionId: string; answerId: string }
  | { kind: 'nearest'; topicSlugs: string[]; backlogId: string | null }
  | { kind: 'crisis'; helplines: Helpline[] }
  | { kind: 'limited' };
