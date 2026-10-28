import 'server-only';
import { createYouTubeClient, parseChannelRef, type YouTubeChannel } from '@sant-vaani/core';
import { youtubeApiKey } from './env';

export function youtube() {
  return createYouTubeClient(youtubeApiKey());
}

/** A channel link, id or handle to the channel's id, title and uploads list. */
export async function resolveChannel(ref: string): Promise<YouTubeChannel | null> {
  const parsed = parseChannelRef(ref);
  if (!parsed) return null;
  return youtube().getChannel(parsed);
}

export const thumbnailUrl = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
