const DUPLICATES: Record<string, string> = {
  channels_youtube_channel_id_key: 'That channel is already in the studio.',
  videos_youtube_id_key: 'That video is already in the studio.',
  saints_slug_key: 'A saint with that English name already exists.',
  answer_clips_pkey: 'That clip is already in this answer.',
  staff_pkey: 'That person is already on the staff list.',
};

const MISSING: Record<string, string> = {
  answers_scripture_id_verse_chapter_verse_number_fkey: 'That verse is not in the Gita.',
  path_days_scripture_id_verse_chapter_verse_number_fkey: 'That verse is not in the Gita.',
};

/** A database or API error as a sentence a curator can act on. */
export function friendlyError(message: string): string {
  const duplicate = /unique constraint "([^"]+)"/.exec(message);
  if (duplicate) return DUPLICATES[duplicate[1] as string] ?? 'That already exists.';
  const missing = /foreign key constraint "([^"]+)"/.exec(message);
  if (missing) return MISSING[missing[1] as string] ?? 'Something it points to no longer exists. Reload and try again.';
  if (/row-level security|permission denied/i.test(message)) return 'Your account is not allowed to do that.';
  if (/JWT expired|invalid JWT/i.test(message)) return 'Your session ended. Sign in again.';
  const text = message.trim();
  if (!text) return 'Something went wrong. Please try again.';
  const sentence = text[0]!.toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
