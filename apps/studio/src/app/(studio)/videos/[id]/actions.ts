'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { clipFormSchema, firstIssue, formDataToObject } from '@/lib/forms';

const NOTICES = {
  draft: 'Saved as a draft.',
  approved: 'Approved. It can now go into answers and paths.',
  needs_second_review: 'Saved. Its topic is sensitive, so a reviewer who did not make it needs to approve it.',
} as const;

/** Creates or updates a clip with its topics. "Approve" approves it or sends it to a second review. */
export async function saveClip(_state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = clipFormSchema.safeParse(formDataToObject(data, ['topicIds']));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const clip = parsed.data;
  const clipId = z.uuid().safeParse(data.get('clipId')).data ?? null;

  const { data: savedId, error } = await supabase.rpc('save_clip', {
    clip_id: clipId,
    video_id: clip.videoId,
    start_seconds: clip.start,
    end_seconds: clip.end,
    language: clip.language,
    summary_en: clip.summaryEn,
    summary_hi: clip.summaryHi,
    sensitive: clip.sensitive,
    topic_ids: clip.topicIds,
    submit: data.get('intent') === 'submit',
  });
  if (error) return { error: friendlyError(error.message) };

  const { data: saved } = await supabase.from('clips').select('status').eq('id', savedId).single();
  refresh();
  const status = (saved?.status ?? 'draft') as keyof typeof NOTICES;
  return { notice: NOTICES[status] ?? 'Saved.' };
}

/** Takes a clip out of the app for good; answers that used it are flagged for a replacement. */
export async function retireClip(clipId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const reason = String(data.get('reason') ?? '').trim();
  if (!reason) return { error: 'Say why, so others know.' };
  const { error } = await supabase.rpc('retire_clip', { clip_id: clipId, reason });
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: 'Retired.' };
}
