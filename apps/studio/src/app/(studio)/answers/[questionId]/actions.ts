'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { firstIssue, stepFormSchema, verseFormSchema } from '@/lib/forms';

/**
 * Saves the answer's clips, verse and step, and publishes it when asked.
 * A published answer stays published only if it still passes every rule.
 */
export async function saveAnswer(questionId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();

  const clipIds = z.array(z.uuid()).safeParse(data.getAll('clipIds'));
  if (!clipIds.success) return { error: 'Reload the page and choose the clips again.' };

  let verse: { chapter: number; verse: number } | null = null;
  if (data.get('chapter') || data.get('verse')) {
    const parsed = verseFormSchema.safeParse({ chapter: data.get('chapter'), verse: data.get('verse') });
    if (!parsed.success) return { error: 'Choose a chapter and a verse number.' };
    verse = parsed.data;
  }

  let stepId = z.uuid().safeParse(data.get('stepId')).data ?? null;
  if (data.get('stepId') === 'new') {
    const step = stepFormSchema.safeParse({ textEn: data.get('newStepEn') ?? '', textHi: data.get('newStepHi') ?? '' });
    if (!step.success) return { error: firstIssue(step.error) };
    const { data: inserted, error } = await supabase
      .from('steps')
      .insert({ text_en: step.data.textEn, text_hi: step.data.textHi })
      .select('id')
      .single();
    if (error) return { error: friendlyError(error.message) };
    stepId = inserted.id;
  }

  const { data: answerId, error } = await supabase.rpc('save_answer', {
    question_id: questionId,
    clip_ids: clipIds.data,
    verse_chapter: verse?.chapter ?? null,
    verse_number: verse?.verse ?? null,
    step_id: stepId,
  });
  if (error) return { error: friendlyError(error.message) };

  if (data.get('intent') === 'publish') {
    const { error: publishError } = await supabase.rpc('publish_answer', { answer_id: answerId });
    refresh();
    if (publishError) return { error: `Saved, but not published: ${friendlyError(publishError.message)}` };
    return { notice: 'Published. It goes into the app with tonight’s catalogue.' };
  }
  refresh();
  return { notice: 'Saved.' };
}
