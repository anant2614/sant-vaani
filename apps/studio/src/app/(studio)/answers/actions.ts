'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { firstIssue, formDataToObject, questionFormSchema } from '@/lib/forms';

/** A new curated question. With a backlog item, links it so the asker can be told when it is answered. */
export async function createQuestion(backlogId: string | null, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = questionFormSchema.safeParse(formDataToObject(data));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const question = parsed.data;

  const { data: inserted, error } = await supabase
    .from('questions')
    .insert({ topic_id: question.topicId, text_en: question.textEn, text_hi: question.textHi, phrasings: question.phrasings })
    .select('id')
    .single();
  if (error) return { error: friendlyError(error.message) };

  if (backlogId) {
    const { error: linkError } = await supabase.from('backlog_items').update({ question_id: inserted.id }).eq('id', backlogId);
    if (linkError) return { error: friendlyError(linkError.message) };
  }
  redirect(`/answers/${inserted.id}`);
}

/** Edits a curated question's wording, other phrasings and topic. */
export async function updateQuestion(questionId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = questionFormSchema.safeParse(formDataToObject(data));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const question = parsed.data;
  const { error } = await supabase
    .from('questions')
    .update({ topic_id: question.topicId, text_en: question.textEn, text_hi: question.textHi, phrasings: question.phrasings })
    .eq('id', questionId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Question saved.' };
}
