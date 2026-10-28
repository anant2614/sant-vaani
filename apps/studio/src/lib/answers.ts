import type { VerseRef } from '@sant-vaani/core';

export type DraftClip = { id: string; saintId: string; live: boolean };

export type AnswerDraft = {
  clips: DraftClip[];
  verse: VerseRef | null;
  stepId: string | null;
};

/**
 * What still stands between a draft and publishing, in plain words.
 * The database checks the same rules in publish_answer().
 */
export function validateAnswerDraft({ clips, verse, stepId }: AnswerDraft): string[] {
  const problems: string[] = [];
  if (clips.length < 3) problems.push(`Add at least 3 clips (${clips.length} so far).`);
  if (clips.length > 5) problems.push('Use at most 5 clips.');
  if (new Set(clips.map((c) => c.saintId)).size < clips.length) {
    problems.push('Each clip must be by a different saint.');
  }
  if (clips.some((c) => !c.live)) problems.push('Every clip must be approved and live.');
  if (!verse) problems.push('Choose the Gita verse that ties the clips together.');
  if (!stepId) problems.push('Add one small step.');
  return problems;
}
