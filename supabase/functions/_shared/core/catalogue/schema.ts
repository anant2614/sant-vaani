// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.
import { z } from 'zod';

/**
 * The catalogue is the one file the app downloads each night. It holds
 * everything people browse: saints, topics, curated questions, clips,
 * answers and paths. Verse text is not here; the app carries the Gita in
 * its own database and the catalogue only points at verses.
 */

/** build-catalogue publishes the file to this bucket, which anyone can read. */
export const CATALOGUE_BUCKET = 'catalogue';
/** Named by format version, so a later format can sit beside this one while older apps still read it. */
export const CATALOGUE_FILE = 'v1.json';

const id = z.string().min(1);

export const LocalizedSchema = z
  .object({
    en: z.string().min(1).optional(),
    hi: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.en || value.hi), 'needs English or Hindi text');

export const VerseRefSchema = z.object({
  chapter: z.number().int().min(1).max(18),
  verse: z.number().int().min(1).max(78),
});

export const LanguageSchema = z.enum(['hi', 'en', 'mixed', 'other']);

export const SaintSchema = z.object({
  id,
  name: LocalizedSchema,
  initials: z.string().min(1).max(3),
  tradition: z.string().optional(),
});

export const TopicSchema = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: LocalizedSchema,
  sortOrder: z.number().int(),
});

export const QuestionSchema = z.object({
  id,
  topicId: id,
  text: LocalizedSchema,
});

export const ClipSchema = z
  .object({
    id,
    saintId: id,
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'not a YouTube video id'),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    language: LanguageSchema,
    summary: LocalizedSchema,
  })
  .refine((clip) => clip.end > clip.start, 'a clip must end after it starts');

export const AnswerSchema = z.object({
  id,
  questionId: id,
  /** 3 to 5 when published; the nightly check may leave 2 after a clip comes down. */
  clipIds: z.array(id).min(2).max(5),
  verse: VerseRefSchema.nullable(),
  step: LocalizedSchema.nullable(),
});

export const PathDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  clipId: id.nullable(),
  verse: VerseRefSchema.nullable(),
  step: LocalizedSchema.nullable(),
});

export const PathSchema = z.object({
  id,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: LocalizedSchema,
  description: LocalizedSchema,
  days: z.array(PathDaySchema).length(7),
});

export const CatalogueSchema = z
  .object({
    version: z.literal(1),
    generatedAt: z.string(),
    saints: z.array(SaintSchema),
    topics: z.array(TopicSchema),
    questions: z.array(QuestionSchema),
    clips: z.array(ClipSchema),
    answers: z.array(AnswerSchema),
    paths: z.array(PathSchema),
    dailyVerses: z.array(VerseRefSchema),
  })
  .superRefine((c, ctx) => {
    const saints = new Set(c.saints.map((s) => s.id));
    const topics = new Set(c.topics.map((t) => t.id));
    const questions = new Set(c.questions.map((q) => q.id));
    const clips = new Map(c.clips.map((clip) => [clip.id, clip]));

    c.clips.forEach((clip, i) => {
      if (!saints.has(clip.saintId)) {
        ctx.addIssue({ code: 'custom', path: ['clips', i, 'saintId'], message: `unknown saint ${clip.saintId}` });
      }
    });
    c.questions.forEach((q, i) => {
      if (!topics.has(q.topicId)) {
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'topicId'], message: `unknown topic ${q.topicId}` });
      }
    });
    c.answers.forEach((answer, i) => {
      if (!questions.has(answer.questionId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['answers', i, 'questionId'],
          message: `unknown question ${answer.questionId}`,
        });
      }
      const seenSaints = new Set<string>();
      answer.clipIds.forEach((clipId, j) => {
        const clip = clips.get(clipId);
        if (!clip) {
          ctx.addIssue({ code: 'custom', path: ['answers', i, 'clipIds', j], message: `unknown clip ${clipId}` });
          return;
        }
        if (seenSaints.has(clip.saintId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['answers', i, 'clipIds', j],
            message: `answer ${answer.id} repeats saint ${clip.saintId}`,
          });
        }
        seenSaints.add(clip.saintId);
      });
    });
    c.paths.forEach((path, i) => {
      path.days.forEach((day, j) => {
        if (day.day !== j + 1) {
          ctx.addIssue({ code: 'custom', path: ['paths', i, 'days', j, 'day'], message: 'days must run 1 to 7' });
        }
        if (day.clipId && !clips.has(day.clipId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['paths', i, 'days', j, 'clipId'],
            message: `unknown clip ${day.clipId}`,
          });
        }
      });
    });
  });

export type Localized = z.infer<typeof LocalizedSchema>;
export type VerseRef = z.infer<typeof VerseRefSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Saint = z.infer<typeof SaintSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type PathDay = z.infer<typeof PathDaySchema>;
export type Path = z.infer<typeof PathSchema>;
export type Catalogue = z.infer<typeof CatalogueSchema>;

export function parseCatalogue(json: unknown): Catalogue {
  return CatalogueSchema.parse(json);
}

export function safeParseCatalogue(json: unknown) {
  return CatalogueSchema.safeParse(json);
}

/** Picks the reader's language, falling back to whichever text exists. */
export function localize(text: Localized | null | undefined, language: 'en' | 'hi'): string {
  if (!text) return '';
  return (language === 'hi' ? text.hi ?? text.en : text.en ?? text.hi) ?? '';
}
