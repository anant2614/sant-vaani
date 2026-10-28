import { parseTimestamp } from '@sant-vaani/core';
import { z } from 'zod';

/** FormData to a plain object; the named fields are always lists. */
export function formDataToObject(data: FormData, listFields: string[] = []): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const field of listFields) out[field] = data.getAll(field).map(String);
  for (const [key, value] of data.entries()) {
    if (listFields.includes(key) || typeof value !== 'string') continue;
    out[key] = value;
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  });

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === 'on' || value === 'true');

const timestamp = z.string().transform((value, ctx) => {
  const seconds = parseTimestamp(value);
  if (seconds === null) {
    ctx.addIssue({ code: 'custom', message: 'Use a time like 2:41 or 1:02:03.' });
    return z.NEVER;
  }
  return seconds;
});

export const LANGUAGES = [
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'mixed', label: 'Hindi and English' },
  { value: 'other', label: 'Other' },
] as const;

export const clipFormSchema = z
  .object({
    videoId: z.uuid(),
    start: timestamp,
    end: timestamp,
    language: z.enum(['hi', 'en', 'mixed', 'other']),
    summaryEn: optionalText,
    summaryHi: optionalText,
    topicIds: z.array(z.uuid()).min(1, 'Choose at least one topic.'),
    sensitive: checkbox,
  })
  .superRefine((clip, ctx) => {
    if (clip.end <= clip.start) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'The end must come after the start.' });
    } else if (clip.end - clip.start < 15) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'A clip is at least 15 seconds long.' });
    } else if (clip.end - clip.start > 900) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'A clip is at most 15 minutes long.' });
    }
    if (!clip.summaryEn && !clip.summaryHi) {
      ctx.addIssue({ code: 'custom', path: ['summaryEn'], message: 'Write the summary in English or Hindi.' });
    }
  });

export type ClipForm = z.infer<typeof clipFormSchema>;

export const saintFormSchema = z
  .object({
    nameEn: optionalText,
    nameHi: optionalText,
    initials: z
      .string()
      .trim()
      .min(1, 'Add initials for the avatar.')
      .max(3, 'Use at most 3 letters.')
      .transform((s) => s.toUpperCase()),
    tradition: optionalText,
    bioEn: optionalText,
    bioHi: optionalText,
  })
  .transform((saint, ctx) => {
    const slug = slugify(saint.nameEn ?? '');
    if (!saint.nameEn && !saint.nameHi) {
      ctx.addIssue({ code: 'custom', path: ['nameEn'], message: 'Add the name in English or Hindi.' });
      return z.NEVER;
    }
    if (!slug) {
      ctx.addIssue({ code: 'custom', path: ['nameEn'], message: 'Add the English name too; it makes the link.' });
      return z.NEVER;
    }
    return { ...saint, slug };
  });

export const channelFormSchema = z.object({
  saintId: z.uuid('Choose a saint.'),
  ref: z.string().trim().min(1, 'Paste the channel link or handle.'),
  rightsBasis: z.enum(['official_embed', 'written_permission', 'license']),
});

export const RIGHTS = [
  { value: 'official_embed', label: 'Official channel, embed only' },
  { value: 'written_permission', label: 'Written permission' },
  { value: 'license', label: 'Licence' },
] as const;

export const questionFormSchema = z
  .object({
    topicId: z.uuid('Choose a topic.'),
    textEn: optionalText,
    textHi: optionalText,
    phrasings: z
      .string()
      .optional()
      .transform((text) =>
        (text ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
  })
  .refine((q) => q.textEn || q.textHi, { path: ['textEn'], message: 'Write the question in English or Hindi.' });

export const stepFormSchema = z
  .object({ textEn: optionalText, textHi: optionalText })
  .refine((s) => s.textEn || s.textHi, { path: ['textEn'], message: 'Write the step in English or Hindi.' });

export const verseFormSchema = z.object({
  chapter: z.coerce.number().int().min(1).max(18),
  verse: z.coerce.number().int().min(1).max(78),
});

/** The first problem in a failed parse, as a sentence for the form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the form.';
}
