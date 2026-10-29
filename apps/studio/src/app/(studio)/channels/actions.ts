'use server';

import { YouTubeApiError } from '@sant-vaani/core';
import { refresh } from 'next/cache';
import type { ActionState } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { channelFormSchema, firstIssue, formDataToObject } from '@/lib/forms';
import { resolveChannel } from '@/lib/youtube';

/** Adds a saint's official channel. Its uploads arrive in the inbox from the next nightly fetch. */
export async function addChannel(_state: ActionState, data: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const parsed = channelFormSchema.safeParse(formDataToObject(data));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  let channel;
  try {
    channel = await resolveChannel(parsed.data.ref);
  } catch (error) {
    if (error instanceof YouTubeApiError) return { error: `YouTube refused the request: ${error.message}` };
    return { error: error instanceof Error ? error.message : 'YouTube did not answer. Try again.' };
  }
  if (channel === null) return { error: 'Paste a channel link like youtube.com/@name, a handle or a channel id (UC…).' };

  const { error } = await supabase.from('channels').insert({
    saint_id: parsed.data.saintId,
    youtube_channel_id: channel.channelId,
    handle: channel.handle,
    title: channel.title,
    rights_basis: parsed.data.rightsBasis,
  });
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: `Added ${channel.title}. Its uploads arrive in the inbox after tonight’s fetch.` };
}

/** Pauses or resumes the nightly fetch for a channel. Clips already made stay as they are. */
export async function setChannelActive(channelId: string, active: boolean, _state: ActionState): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from('channels').update({ active }).eq('id', channelId);
  if (error) return { error: friendlyError(error.message) };
  refresh();
  return { notice: active ? 'Resumed.' : 'Paused.' };
}
