'use server';

import { refresh } from 'next/cache';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import type { BacklogStatus } from '@/lib/types';

/** Dismisses a backlog item (off-topic, a duplicate, or not something saints speak to), or reopens it. */
export async function setBacklogStatus(itemId: string, status: BacklogStatus, _state: ActionState): Promise<ActionState> {
  const { supabase } = await requireStaff();
  if (status === 'answered') return { error: 'Items are marked answered when their answer is published.' };
  const { error } = await supabase.from('backlog_items').update({ status }).eq('id', itemId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: status === 'dismissed' ? 'Dismissed.' : 'Reopened.' };
}
