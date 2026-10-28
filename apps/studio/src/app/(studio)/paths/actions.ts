'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { friendlyError } from '@/lib/errors';
import { PATH_DAYS, pathProblems } from '@/lib/paths';

/** Sets or clears the clip for one day of a path. */
export async function setDayClip(pathId: string, day: number, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  if (!Number.isInteger(day) || day < 1 || day > PATH_DAYS) return { error: 'Unknown day.' };
  const clipId = z.uuid().safeParse(data.get('clipId')).data ?? null;
  const { error } = await supabase
    .from('path_days')
    .upsert({ path_id: pathId, day, clip_id: clipId }, { onConflict: 'path_id,day' });
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: clipId ? `Day ${day} saved.` : `Day ${day} cleared.` };
}

/** Publishes a path once all seven days have a live clip, or takes it out of the app. */
export async function setPathPublished(pathId: string, published: boolean, _state: ActionState): Promise<ActionState> {
  const { supabase } = await requireStaff();
  if (published) {
    const days = rows<{ day: number; clip_id: string | null }>(
      await supabase.from('path_days').select('day, clip_id').eq('path_id', pathId),
    );
    const clipIds = days.flatMap((d) => (d.clip_id ? [d.clip_id] : []));
    const live = new Set(
      rows<{ id: string }>(await supabase.from('clip_cards').select('id').in('id', clipIds).eq('live', true)).map((c) => c.id),
    );
    const problems = pathProblems(days.map((d) => ({ day: d.day, clipLive: d.clip_id ? live.has(d.clip_id) : null })));
    if (problems.length > 0) return { error: problems.join(' ') };
  }
  const { error } = await supabase.from('paths').update({ published }).eq('id', pathId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: published ? 'Published. It goes into the app with tonight’s catalogue.' : 'Taken out of the app.' };
}
