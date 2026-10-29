'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { firstIssue, formDataToObject, saintFormSchema } from '@/lib/forms';

function columns(saint: ReturnType<typeof saintFormSchema.parse>) {
  return {
    slug: saint.slug,
    name_en: saint.nameEn,
    name_hi: saint.nameHi,
    initials: saint.initials,
    tradition: saint.tradition,
    bio_en: saint.bioEn,
    bio_hi: saint.bioHi,
  };
}

export async function createSaint(_state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = saintFormSchema.safeParse(formDataToObject(data));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { data: inserted, error } = await supabase.from('saints').insert(columns(parsed.data)).select('id').single();
  if (error) return { error: friendlyError(error.message) };
  redirect(`/saints/${inserted.id}`);
}

export async function updateSaint(saintId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = saintFormSchema.safeParse(formDataToObject(data));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { error } = await supabase.from('saints').update(columns(parsed.data)).eq('id', saintId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Saved.' };
}

/** Hides every clip of a saint at once, for a takedown request, or restores them. Admins only. */
export async function setTakedown(saintId: string, hidden: boolean, _state: ActionState): Promise<ActionState> {
  const { supabase, staff } = await requireStaff();
  if (staff.role !== 'admin') return { error: 'Only an admin can take a saint down or restore one.' };
  const { error } = await supabase.rpc('set_saint_takedown', { saint_id: saintId, hidden });
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return {
    notice: hidden
      ? 'Taken down. Their clips leave the app with tonight’s catalogue, and answers that used them are flagged.'
      : 'Restored. Answers that were flagged need publishing again.',
  };
}
