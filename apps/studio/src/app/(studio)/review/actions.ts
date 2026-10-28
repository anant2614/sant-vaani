'use server';

import { refresh } from 'next/cache';
import type { ActionState } from '@/lib/actions';
import { canReview, requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

/** Gives a clip its second review. The database checks the reviewer did not make it. */
export async function approveClip(clipId: string, _state: ActionState): Promise<ActionState> {
  const { supabase, staff } = await requireStaff();
  if (!canReview(staff)) return { error: 'Only a reviewer or admin can give the second review.' };
  const { error } = await supabase.from('clips').update({ status: 'approved' }).eq('id', clipId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Approved.' };
}

/** Sends a clip back to its maker as a draft. */
export async function sendBack(clipId: string, _state: ActionState): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('clips').update({ status: 'draft' }).eq('id', clipId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Sent back as a draft.' };
}
