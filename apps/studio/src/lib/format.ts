import { formatDuration } from '@sant-vaani/core';
import type { AnswerStatus, TopicGroup, VideoStatus } from './types';
import type { ClipStatus } from './clips';

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : '—';
}

/** "2:41–5:10 (2:29)". */
export function clipRange(start: number, end: number): string {
  return `${formatDuration(start)}–${formatDuration(end)} (${formatDuration(end - start)})`;
}

/** The English text, or the Hindi when there is no English. */
export function either(en: string | null, hi: string | null): string {
  return en ?? hi ?? '';
}

export const CLIP_STATUS: Record<ClipStatus, string> = {
  draft: 'Draft',
  needs_second_review: 'Second review',
  approved: 'Approved',
  retired: 'Retired',
};

export const VIDEO_STATUS: Record<VideoStatus, string> = {
  new: 'New',
  suggesting: 'Being read',
  suggested: 'Suggestions ready',
  done: 'Done',
  ignored: 'Ignored',
};

export const ANSWER_STATUS: Record<AnswerStatus | 'none', string> = {
  none: 'No answer yet',
  draft: 'Draft',
  published: 'Published',
  needs_replacement: 'Needs a replacement clip',
};

export const TOPIC_GROUPS: Record<TopicGroup, string> = {
  mind: 'Mind',
  relationships: 'Relationships',
  work: 'Work and study',
  hardship: 'Hard times',
  spirit: 'Spiritual life',
};
